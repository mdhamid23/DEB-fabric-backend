import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { LoginDto } from "./dto/login.dto";
import { JwtPayload } from "./strategies/jwt.strategy";
import { FabricCaService } from "../fabric/fabric-ca.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly fabricCa: FabricCaService,
    private readonly jwtService: JwtService,
  ) {}

  // async login(dto: LoginDto): Promise<{
  //   accessToken: string;
  //   user: { id: string; username: string; role: string };
  // }> {
  //   // ── Layer 1: Web2 credential check ───────────────────────────
  //   const user = await this.usersService.validateCredentials(
  //     dto.username,
  //     dto.password,
  //   );

  //   if (!user) {
  //     // Don't reveal whether username or password was wrong
  //     throw new UnauthorizedException("Invalid credentials");
  //   }

  //   this.logger.log(
  //     `Login attempt: "${dto.username}" — web2 credentials valid ✅`,
  //   );

  //   let identity: { certificate: string; privateKey: string } | null = null;

  //   try {
  //     const enrolled = await this.fabricCa.enrollUser(
  //       user.fabricCaEnrollmentId ?? user.username,
  //       dto.password, // enrollment secret = same as web2 password (set at registration)
  //     );

  //     // ── Layer 3: Encrypt and persist cert+key ─────────────────
  //     await this.usersService.storeEnrolledIdentity(user.id, enrolled);
  //     identity = {
  //       certificate: enrolled.certificate,
  //       privateKey: enrolled.privateKey,
  //     };

  //     this.logger.log(`Fabric CA enrollment: "${dto.username}" ✅`);
  //   } catch (err: any) {
  //     // CA enrollment failure = hard block. The user must be properly enrolled
  //     // in Fabric CA to be allowed to use the platform.
  //     this.logger.error(
  //       `Fabric CA enrollment failed for "${dto.username}": ${err.message}`,
  //     );
  //     throw new UnauthorizedException(
  //       "Identity could not be verified on the blockchain network. Contact your administrator.",
  //     );
  //   }

  //   // ── Layer 4: Issue JWT ────────────────────────────────────────
  //   const payload: JwtPayload = {
  //     sub: user.id,
  //     username: user.username,
  //     role: user.role,
  //   };

  //   const accessToken = this.jwtService.sign(payload);

  //   this.logger.log(`JWT issued for "${dto.username}" (role=${user.role})`);

  //   return {
  //     accessToken,
  //     user: {
  //       id: user.id,
  //       username: user.username,
  //       role: user.role,
  //     },
  //   };
  // }

  async login(dto: LoginDto) {
    // ── Layer 1: Web2 check (bcrypt) ─────────────────────────────
    const user = await this.usersService.validateCredentials(
      dto.username,
      dto.password,
    );

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    this.logger.log(`Web2 credentials valid for "${dto.username}" ✅`);

    // ── Layer 2: Fabric CA enrollment ────────────────────────────
    // We use the STORED CA secret — not dto.password.
    // This means:
    //   - Changing DB password does NOT affect CA enrollment
    //   - Tampering fabricCaEnrollmentId → wrong secret → CA rejects
    //   - Tampering encryptedCaSecret → needs CRYPTO_SECRET to decrypt → blocked
    try {
      const caSecret = await this.usersService.getCaEnrollmentSecret(user.id);

      const enrolled = await this.fabricCa.enrollUser(
        user.fabricCaEnrollmentId ?? user.username,
        caSecret, // ← stored encrypted secret, not dto.password
      );

      await this.usersService.storeEnrolledIdentity(user.id, enrolled);

      this.logger.log(`Fabric CA enrollment for "${dto.username}" ✅`);
    } catch (err: any) {
      this.logger.error(
        `Fabric CA enrollment failed for "${dto.username}": ${err.message}`,
      );
      throw new UnauthorizedException(
        "Identity could not be verified on the blockchain network.",
      );
    }

    // ── Layer 3: Issue JWT ────────────────────────────────────────
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: user.id, username: user.username, role: user.role },
    };
  }

  /**
   * Returns the current user's profile from the JWT payload.
   * The JWT payload is attached to the request by JwtStrategy.validate().
   */
  async getProfile(userId: string) {
    return this.usersService.findByIdOrFail(userId);
  }
}
