import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import * as grpc from "@grpc/grpc-js";

import {
  connect,
  Contract,
  Identity,
  Signer,
  signers,
} from "@hyperledger/fabric-gateway";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

@Injectable()
export class FabricService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FabricService.name);
  private grpcClient!: grpc.Client;
  private contract!: Contract;

  async onModuleInit() {
    try {
      const tlsCert = fs.readFileSync(
        path.resolve(process.env.FABRIC_TLS_CERT_PATH!),
      );
      const credentials = grpc.credentials.createSsl(tlsCert);

      this.grpcClient = new grpc.Client(
        process.env.FABRIC_PEER_ENDPOINT!,
        credentials,
        {
          "grpc.ssl_target_name_override":
            process.env.FABRIC_PEER_HOST_OVERRIDE,
        },
      );

      const certPem = fs
        .readFileSync(path.resolve(process.env.FABRIC_USER_CERT_PATH!))
        .toString();
      const identity: Identity = {
        mspId: "Org1MSP",
        credentials: Buffer.from(certPem),
      };

      const keyPem = fs
        .readFileSync(path.resolve(process.env.FABRIC_USER_KEY_PATH!))
        .toString();
      const privateKey = crypto.createPrivateKey(keyPem);
      const signer: Signer = signers.newPrivateKeySigner(privateKey);

      const gateway = connect({
        client: this.grpcClient,
        identity,
        signer,
      });

      const network = gateway.getNetwork(process.env.FABRIC_CHANNEL_NAME!);
      this.contract = network.getContract(process.env.FABRIC_CHAINCODE_NAME!);

      this.logger.log("Connected to Fabric Gateway for CRUD operations.");
    } catch (error) {
      this.logger.error("Gateway initialization failed", error);
    }
  }

  // ============== CRUD WITH CONTRACTS ==============

  // 1. CREATE Asset
  // 1. CREATE Asset
  async createAsset(
    id: string,
    color: string,
    size: number,
    owner: string,
    value: number,
  ): Promise<void> {
    this.logger.log(`CRUD: Creating asset ${id}`);

    await this.contract.submitTransaction(
      "CreateAsset",
      id,
      color,
      size.toString(),
      owner,
      value.toString(),
    );
  }

  async getAssetsByOwner(ownerName: string): Promise<any[]> {
    this.logger.log(`CRUD: Fetching all assets for owner: ${ownerName}`);

    const resultBytes = await this.contract.evaluateTransaction(
      "GetAssetsByOwner",
      ownerName,
    );
    return JSON.parse(Buffer.from(resultBytes).toString());
  }

  // 2. READ Asset
  async readAsset(id: string): Promise<any> {
    this.logger.log(`CRUD: Reading asset ${id}`);
    const resultBytes = await this.contract.evaluateTransaction(
      "ReadAsset",
      id,
    );
    return JSON.parse(Buffer.from(resultBytes).toString());
  }

  // 3. UPDATE Asset (Modify)
  async updateAsset(
    id: string,
    color: string,
    size: number,
    owner: string,
    value: number,
  ): Promise<void> {
    this.logger.log(`CRUD: Updating asset ${id}`);
    await this.contract.submitTransaction(
      "UpdateAsset",
      id,
      color,
      size.toString(),
      owner,
      value.toString(),
    );
  }

  // 4. DELETE Asset
  async deleteAsset(id: string): Promise<void> {
    this.logger.log(`CRUD: Deleting asset ${id}`);
    await this.contract.submitTransaction("DeleteAsset", id);
  }

  async transferAsset(
    assetId: string,
    fromUser: string,
    toUser: string,
  ): Promise<string> {
    this.logger.log(
      `CRUD: Dynamic Transferring asset ${assetId} from ${fromUser} to ${toUser}`,
    );

    const userMspPath = path.resolve(
      process.cwd(),
      `src/fabric/users/${fromUser}/msp`,
    );

    const userCertPath = path.join(userMspPath, "signcerts", "cert.pem");
    const keystoreDirPath = path.join(userMspPath, "keystore");

    this.logger.log(`Checking Cert Path: ${userCertPath}`);
    this.logger.log(`Checking Keystore Path: ${keystoreDirPath}`);

    if (!fs.existsSync(userCertPath) || !fs.existsSync(keystoreDirPath)) {
      throw new Error(
        `Credentials directories not found inside msp for user: ${fromUser}`,
      );
    }

    const keystoreFiles = fs.readdirSync(keystoreDirPath);
    const keyFileName = keystoreFiles.find(
      (file) => file.endsWith("_sk") || file.endsWith(".key") || file,
    );

    if (!keyFileName) {
      throw new Error(`No key file found in keystore for user: ${fromUser}`);
    }

    const userKeyPath = path.join(keystoreDirPath, keyFileName);

    const certPem = fs.readFileSync(userCertPath).toString();
    const identity: Identity = {
      mspId: "Org1MSP",
      credentials: Buffer.from(certPem),
    };

    const keyPem = fs.readFileSync(userKeyPath).toString();
    const privateKey = crypto.createPrivateKey(keyPem);
    const signer: Signer = signers.newPrivateKeySigner(privateKey);

    const tlsCertPath = path.resolve(
      process.env.FABRIC_TLS_CERT_PATH ||
        "../../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem",
    );
    const tlsCredentials = grpc.credentials.createSsl(
      fs.readFileSync(tlsCertPath),
    );

    const localGrpcClient = new grpc.Client(
      process.env.FABRIC_PEER_ENDPOINT || "localhost:7051",
      tlsCredentials,
      { "grpc.ssl_target_name_override": "peer0.org1.example.com" },
    );

    const userGateway = connect({
      client: localGrpcClient,
      identity,
      signer,
      evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
      endorseOptions: () => ({ deadline: Date.now() + 5000 }),
      submitOptions: () => ({ deadline: Date.now() + 5000 }),
    });

    try {
      const network = userGateway.getNetwork(
        process.env.FABRIC_CHANNEL_NAME || "dbbl",
      );
      const userContract = network.getContract(
        process.env.FABRIC_CHAINCODE_NAME || "basic",
      );

      this.logger.log(
        "gRPC Connection Established. Sending proposal to peer...",
      );

      const proposal = userContract.newProposal("TransferAsset", {
        arguments: [assetId, toUser],
      });

      const transaction = await proposal.endorse();
      this.logger.log(
        "Endorsement received successfully. Committing to orderer...",
      );

      await transaction.submit();
      const txId = transaction.getTransactionId();

      this.logger.log(`Transaction ${txId} successfully committed.`);
      return `Asset ${assetId} transfer request successful. Transaction ID: ${txId}`;
    } catch (error) {
      this.logger.error(`Fabric Service Error: ${error}`);
      throw error;
    } finally {
      userGateway.close();
      localGrpcClient.close();
      this.logger.log("Dynamic gRPC and Gateway connections closed cleanly.");
    }
  }

  async readAssetAsSpecificUser(
    username: string,
    assetId: string,
  ): Promise<any> {
    this.logger.log(`User ${username} is trying to read asset ${assetId}`);

    const userCertPath = path.resolve(
      `./src/fabric/users/${username}/msp/signcerts/cert.pem`,
    );
    const userKeyPath = path.resolve(
      `./src/fabric/users/${username}/msp/keystore/private.key`,
    );

    if (!fs.existsSync(userCertPath) || !fs.existsSync(userKeyPath)) {
      throw new Error(
        `Cryptographic materials not found for user: ${username}. Please enroll first.`,
      );
    }

    const certPem = fs.readFileSync(userCertPath).toString();
    const identity: Identity = {
      mspId: "Org1MSP",
      credentials: Buffer.from(certPem),
    };

    const keyPem = fs.readFileSync(userKeyPath).toString();
    const privateKey = crypto.createPrivateKey(keyPem);
    const signer: Signer = signers.newPrivateKeySigner(privateKey);

    const userGateway = connect({
      client: this.grpcClient,
      identity,
      signer,
    });

    const network = userGateway.getNetwork(process.env.FABRIC_CHANNEL_NAME!);
    const userContract = network.getContract(
      process.env.FABRIC_CHAINCODE_NAME!,
    );

    const resultBytes = await userContract.evaluateTransaction(
      "ReadAsset",
      assetId,
    );

    userGateway.close();

    return JSON.parse(Buffer.from(resultBytes).toString());
  }

  async getAssetHistory(assetId: string): Promise<any[]> {
    this.logger.log(`CRUD: Fetching history for asset: ${assetId}`);

    const resultBytes = await this.contract.evaluateTransaction(
      "GetAssetHistory",
      assetId,
    );
    return JSON.parse(Buffer.from(resultBytes).toString());
  }

  async onModuleDestroy() {
    if (this.grpcClient) this.grpcClient.close();
  }
}
