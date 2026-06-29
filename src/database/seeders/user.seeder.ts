import { UserFactory } from "@/database/factories/user.factory";
import { UserRole, UserStatus } from "@/src/modules/users/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { Seeder } from "nestjs-seeder";
import { Repository } from "typeorm";

// You'll need to import your encryption function and config
// Adjust the import path based on your project structure
import { encrypt } from "@/src/modules/fabric/crypto.util"; // or wherever your encrypt function is
import { ConfigService } from "@nestjs/config";

@Injectable()
export class UserSeeder implements Seeder {
  private readonly SALT_ROUNDS = 10; // Should match your createUser method

  constructor(
    @InjectRepository(UserFactory)
    private readonly repo: Repository<UserFactory>,
    private readonly config: ConfigService,
  ) {}

  async seed(): Promise<any> {
    const count = await this.repo.count();
    if (count !== 0) {
      console.log("✅ Users already exist, skipping seed");
      return;
    }

    const username = "admin";
    const password = "Password@123";

    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);
    const caEnrollmentSecret = crypto.randomBytes(32).toString("hex");
    const secret = this.config.get<string>("CRYPTO_SECRET");

    if (!secret) {
      throw new Error("ENCRYPTION_SECRET is not configured");
    }

    const encryptedCaSecret = encrypt(caEnrollmentSecret, secret);

    // Create using object literal with proper typing
    const userData: Partial<UserFactory> = {
      username: username,
      passwordHash: passwordHash,
      role: UserRole.SUPERADMIN,
      status: UserStatus.ACTIVE,
      fabricCaEnrollmentId: username,
      encryptedCaSecret: encryptedCaSecret,
      createdBy: "system",
      encryptedCert: null,
      encryptedPrivateKey: null,
      certEnrolledAt: new Date(),
      certExpiresAt: new Date(),
    };

    const user = this.repo.create(userData);
    const savedUser = await this.repo.save(user);

    console.log(`✅ User created: ${username}`);
    console.log(`🔑 CA Secret: ${caEnrollmentSecret}`);

    return savedUser;
  }

  async drop(): Promise<any> {
    await this.repo.delete({});
    console.log("🗑️ All users dropped");
  }
}
