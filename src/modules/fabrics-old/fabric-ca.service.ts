import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import FabricCAServices from "fabric-ca-client";
import { User, Utils } from "fabric-common";
import * as fs from "fs";
import * as path from "path";

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
        "Org1MSP",
      );

      this.logger.log("Fabric CA Admin enrolled and context initialized.");
    } catch (error) {
      this.logger.error(
        "Failed to initialize Fabric CA or enroll Admin",
        error,
      );
    }
  }

  async registerAndEnrollUser(username: string, secret: string): Promise<void> {
    try {
      const userMspPath = path.resolve(`./src/fabric/users/${username}/msp`);
      if (fs.existsSync(userMspPath)) {
        throw new Error(`User ${username} already exists locally.`);
      }

      this.logger.log(`Step 1: Registering user ${username} via CA Admin...`);

      await this.caClient.register(
        {
          enrollmentID: username,
          enrollmentSecret: secret,
          role: "client",
          affiliation: "",
          maxEnrollments: -1,
        },
        this.adminUser,
      );

      this.logger.log(
        `Step 2: Enrolling user ${username} to generate cryptographic materials...`,
      );

      const enrollment = await this.caClient.enroll({
        enrollmentID: username,
        enrollmentSecret: secret,
      });

      fs.mkdirSync(path.join(userMspPath, "signcerts"), { recursive: true });
      fs.mkdirSync(path.join(userMspPath, "keystore"), { recursive: true });

      fs.writeFileSync(
        path.join(userMspPath, "signcerts", "cert.pem"),
        enrollment.certificate,
      );
      fs.writeFileSync(
        path.join(userMspPath, "keystore", "private.key"),
        enrollment.key.toBytes(),
      );

      this.logger.log(`Successfully registered and enrolled user: ${username}`);
    } catch (error) {
      this.logger.error(`Failed to register/enroll user ${username}`, error);
      throw error;
    }
  }

  async getAllUsers(): Promise<any[]> {
    try {
      this.logger.log("Fetching all registered identities from Fabric CA...");

      const identityService = this.caClient.newIdentityService();

      const response = await identityService.getAll(this.adminUser);

      if (response && response.result && response.result.identities) {
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
      this.logger.error("Failed to fetch users list from Fabric CA", error);
      throw error;
    }
  }
}
