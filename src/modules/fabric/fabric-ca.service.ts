import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import FabricCAServices from "fabric-ca-client";
import { User, Utils } from "fabric-common";
import * as fs from "fs";
import * as path from "path";

export interface EnrolledIdentity {
  certificate: string;
  privateKey: string;
  enrolledAt: Date;
  expiresAt: Date;
}

@Injectable()
export class FabricCaService implements OnModuleInit {
  private readonly logger = new Logger(FabricCaService.name);
  private caClient!: FabricCAServices;
  private adminUser!: User;

  async onModuleInit() {
    try {
      this.logger.log("Connecting to Fabric CA Server...");

      const tlsCertPath = path.resolve(process.env.FABRIC_TLS_CERT_PATH!);
      const tlsCert = fs.readFileSync(tlsCertPath).toString();

      const CAClass = (FabricCAServices as any).default || FabricCAServices;

      this.caClient = new CAClass(
        process.env.FABRIC_CA_URL,
        { trustedRoots: [tlsCert], verify: true },
        process.env.FABRIC_CA_NAME,
      );

      const enrollment = await this.caClient.enroll({
        enrollmentID: process.env.FABRIC_CA_ADMIN_NAME!,
        enrollmentSecret: process.env.FABRIC_CA_ADMIN_SECRET!,
      });

      this.adminUser = new User("admin");
      const cryptoSuite = Utils.newCryptoSuite();
      await this.adminUser.setCryptoSuite(cryptoSuite);
      await this.adminUser.setEnrollment(
        enrollment.key,
        enrollment.certificate,
        process.env.FABRIC_MSP_ID ?? "Org1MSP",
      );

      this.logger.log("✅ Fabric CA Admin enrolled and context initialized.");
    } catch (error) {
      this.logger.error(
        "Failed to initialize Fabric CA or enroll Admin",
        error,
      );
      throw error;
    }
  }

  async registerUser(
    enrollmentId: string,
    enrollmentSecret: string,
    role: "superadmin" | "issuer",
  ): Promise<void> {
    this.ensureAdminReady();

    await this.caClient.register(
      {
        enrollmentID: enrollmentId,
        enrollmentSecret: enrollmentSecret,
        role: "client",
        affiliation: "",
        maxEnrollments: -1,
        attrs: [{ name: "role", value: role, ecert: true }],
      },
      this.adminUser,
    );

    this.logger.log(`Registered "${enrollmentId}" in Fabric CA (role=${role})`);
  }

  async enrollUser(
    enrollmentId: string,
    enrollmentSecret: string,
  ): Promise<EnrolledIdentity> {
    const enrollment = await this.caClient.enroll({
      enrollmentID: enrollmentId,
      enrollmentSecret: enrollmentSecret,
      attr_reqs: [{ name: "role", optional: false }],
    });

    const enrolledAt = new Date();
    const expiresAt = new Date(
      enrolledAt.getTime() + 365 * 24 * 60 * 60 * 1000,
    );

    this.logger.log(`Enrolled "${enrollmentId}" via Fabric CA`);

    return {
      certificate: enrollment.certificate,
      privateKey: enrollment.key.toBytes(),
      enrolledAt,
      expiresAt,
    };
  }

  async revokeUser(enrollmentId: string): Promise<void> {
    this.ensureAdminReady();

    await this.caClient.revoke({ enrollmentID: enrollmentId }, this.adminUser);

    this.logger.log(`Revoked "${enrollmentId}" in Fabric CA`);
  }

  async isRegistered(enrollmentId: string): Promise<boolean> {
    this.ensureAdminReady();

    try {
      const identityService = this.caClient.newIdentityService();
      const result = await identityService.getOne(enrollmentId, this.adminUser);
      return !!result;
    } catch {
      return false;
    }
  }

  async getAllUsers(): Promise<any[]> {
    this.ensureAdminReady();

    try {
      const identityService = this.caClient.newIdentityService();
      const response = await identityService.getAll(this.adminUser);

      if (response?.result?.identities) {
        return response.result.identities.map((id: any) => ({
          username: id.id,
          type: id.type,
          affiliation: id.affiliation,
          maxEnrollments: id.max_enrollments,
          attributes: id.attrs,
        }));
      }

      return [];
    } catch (error) {
      this.logger.error("Failed to fetch users from Fabric CA", error);
      throw error;
    }
  }

  private ensureAdminReady(): void {
    if (!this.adminUser) {
      throw new Error(
        "Fabric CA admin is not initialized. Service may still be starting.",
      );
    }
  }
}
