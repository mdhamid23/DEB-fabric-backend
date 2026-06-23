import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { User, UserRole, UserStatus } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { FabricCaService, EnrolledIdentity } from "../fabric/fabric-ca.service";
import { encrypt, decrypt } from "../fabric/crypto.util";
import * as crypto from "crypto";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly fabricCa: FabricCaService,
    private readonly config: ConfigService,
  ) {}

  // ── Create user (superadmin only) ────────────────────────────

  async createUser(
    dto: CreateUserDto,
    createdBy: string,
  ): Promise<
    Omit<User, "passwordHash" | "encryptedCert" | "encryptedPrivateKey">
  > {
    // 1. Check username uniqueness
    const existing = await this.userRepo.findOne({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException(`Username "${dto.username}" already exists`);
    }
    console.log(`Username "${dto.username}" is available`);

    // 2. Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Generate a SEPARATE random CA enrollment secret
    // This is independent of the web2 password — never changes after creation
    const caEnrollmentSecret = crypto.randomBytes(32).toString("hex");
    const secret = this.requireSecret();
    const encryptedCaSecret = encrypt(caEnrollmentSecret, secret);

    // Register in Fabric CA with the RANDOM secret (not the web2 password)
    const alreadyRegistered = await this.fabricCa.isRegistered(dto.username);
    if (!alreadyRegistered) {
      await this.fabricCa.registerUser(
        dto.username,
        caEnrollmentSecret, // ← random secret, not dto.password
        dto.role,
      );
    }

    const user = this.userRepo.create({
      username: dto.username,
      passwordHash,
      role: dto.role,
      status: UserStatus.ACTIVE,
      fabricCaEnrollmentId: dto.username,
      encryptedCaSecret, // ← stored encrypted
      createdBy,
    });

    return this.sanitize(await this.userRepo.save(user));
  }

  // ── Deactivate user (superadmin only) ────────────────────────

  async deactivateUser(userId: string, deactivatedBy: string): Promise<void> {
    const user = await this.findByIdOrFail(userId);

    if (user.role === UserRole.SUPERADMIN) {
      throw new ForbiddenException("Cannot deactivate a superadmin account");
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ConflictException(
        `User "${user.username}" is already inactive`,
      );
    }

    // 1. Revoke in Fabric CA → peer MSP will reject their transactions
    if (user.fabricCaEnrollmentId) {
      try {
        await this.fabricCa.revokeUser(user.fabricCaEnrollmentId);
      } catch (err: any) {
        // Log but don't block — still deactivate in DB
        this.logger.warn(
          `Fabric CA revoke failed for "${user.username}": ${err.message}`,
        );
      }
    }

    // 2. Wipe stored credentials from DB
    await this.userRepo.update(userId, {
      status: UserStatus.INACTIVE,
      encryptedCert: null,
      encryptedPrivateKey: null,
      deactivatedAt: new Date(),
      deactivatedBy,
    });

    this.logger.log(
      `User "${user.username}" deactivated by "${deactivatedBy}"`,
    );
  }

  // ── Store enrolled MSP credentials after login ───────────────

  async storeEnrolledIdentity(
    userId: string,
    identity: EnrolledIdentity,
  ): Promise<void> {
    const secret = this.requireSecret();

    await this.userRepo.update(userId, {
      encryptedCert: encrypt(identity.certificate, secret),
      encryptedPrivateKey: encrypt(identity.privateKey, secret),
      certEnrolledAt: identity.enrolledAt,
      certExpiresAt: identity.expiresAt,
    });
  }

  // ── Load decrypted MSP credentials for Fabric signing ────────

  async loadFabricIdentity(
    userId: string,
  ): Promise<{ certificate: string; privateKey: string } | null> {
    const user = await this.findByIdOrFail(userId);

    if (!user.encryptedCert || !user.encryptedPrivateKey) {
      return null; // not yet enrolled
    }

    const secret = this.requireSecret();

    return {
      certificate: decrypt(user.encryptedCert, secret),
      privateKey: decrypt(user.encryptedPrivateKey, secret),
    };
  }

  // ── Finders ───────────────────────────────────────────────────

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { username } });
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User not found`);
    return user;
  }

  async findAll(): Promise<
    Omit<User, "passwordHash" | "encryptedCert" | "encryptedPrivateKey">[]
  > {
    const users = await this.userRepo.find({ order: { createdAt: "DESC" } });
    return users.map((u) => this.sanitize(u));
  }

  // ── Validate credentials (used by AuthService at login) ──────

  async validateCredentials(
    username: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.findByUsername(username);
    if (!user) return null;
    if (user.status === UserStatus.INACTIVE) return null;

    const matches = await bcrypt.compare(password, user.passwordHash!);
    return matches ? user : null;
  }

  // ── Seed superadmin (called once at app bootstrap if no users exist) ──

  async seedSuperAdmin(): Promise<void> {
    const username =
      this.config.get<string>("SUPERADMIN_USERNAME") ?? "superadmin";
    const password =
      this.config.get<string>("SUPERADMIN_PASSWORD") ?? "SuperAdmin@123";

    const existing = await this.findByUsername(username);
    if (existing) {
      this.logger.log("Superadmin already exists — skipping seed");
      return;
    }

    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Register in Fabric CA
    const alreadyRegistered = await this.fabricCa.isRegistered(username);
    if (!alreadyRegistered) {
      await this.fabricCa.registerUser(username, password, UserRole.SUPERADMIN);
    }

    await this.userRepo.save(
      this.userRepo.create({
        username,
        passwordHash,
        role: UserRole.SUPERADMIN,
        status: UserStatus.ACTIVE,
        fabricCaEnrollmentId: username,
        createdBy: "system",
      }),
    );

    this.logger.log(`✅ Superadmin "${username}" seeded`);
  }

  // ── Helpers ───────────────────────────────────────────────────

  private sanitize(
    user: User,
  ): Omit<User, "passwordHash" | "encryptedCert" | "encryptedPrivateKey"> {
    const { passwordHash, encryptedCert, encryptedPrivateKey, ...safe } = user;
    return safe;
  }

  private requireSecret(): string {
    const secret = this.config.get<string>("CRYPTO_SECRET");
    if (!secret) throw new Error('Missing required env var: "CRYPTO_SECRET"');
    return secret;
  }
  async getCaEnrollmentSecret(userId: string): Promise<string> {
    const user = await this.findByIdOrFail(userId);

    if (!user.encryptedCaSecret) {
      throw new Error(`No CA enrollment secret found for user ${userId}`);
    }

    return decrypt(user.encryptedCaSecret, this.requireSecret());
  }
}
