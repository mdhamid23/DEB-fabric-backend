import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as grpc from '@grpc/grpc-js';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  connect,
  Contract,
  Gateway,
  Identity,
  Signer,
  signers,
} from '@hyperledger/fabric-gateway';

@Injectable()
export class FabricGatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FabricGatewayService.name);
  private client!: grpc.Client;
  private gateway!: Gateway;
  private contract!: Contract;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connectGateway();
  }

  async onModuleDestroy(): Promise<void> {
    this.gateway?.close();
    this.client?.close();
    this.logger.log('Fabric gateway connection closed');
  }

  getContract(): Contract {
    if (!this.contract) {
      throw new Error('Fabric contract is not initialized yet');
    }
    return this.contract;
  }

  private async connectGateway(): Promise<void> {
    // ── read from your exact .env keys ──────────────────────────
    const peerEndpoint    = this.requireEnv('FABRIC_PEER_ENDPOINT');
    const peerHostAlias   = this.requireEnv('FABRIC_PEER_HOST_OVERRIDE');
    const channelName     = this.requireEnv('FABRIC_CHANNEL_NAME');
    const chaincodeName   = this.requireEnv('FABRIC_CHAINCODE_NAME');
    const tlsCertPath     = this.requireEnv('FABRIC_TLS_CERT_PATH');
    const userCertPath    = this.requireEnv('FABRIC_USER_CERT_PATH');
    const userKeyPath     = this.requireEnv('FABRIC_USER_KEY_PATH');
    const mspId           = this.config.get<string>('FABRIC_MSP_ID') ?? 'Org1MSP'; // default Org1MSP

    // ── resolve paths relative to project root ───────────────────
    const resolvedTlsCert  = path.resolve(process.cwd(), tlsCertPath);
    const resolvedUserCert = path.resolve(process.cwd(), userCertPath);
    const resolvedUserKey  = path.resolve(process.cwd(), userKeyPath);

    this.logger.log(`TLS cert path  : ${resolvedTlsCert}`);
    this.logger.log(`User cert path : ${resolvedUserCert}`);
    this.logger.log(`User key path  : ${resolvedUserKey}`);

    // ── load crypto material ─────────────────────────────────────
    const tlsCredentials  = await this.readFile(resolvedTlsCert,  'TLS cert');
    const userCertPem     = await this.readFile(resolvedUserCert, 'User cert');
    const userKeyPem      = await this.readFile(resolvedUserKey,  'User key');

    // ── build identity & signer ──────────────────────────────────
    const identity: Identity = { mspId, credentials: userCertPem };
    const privateKey         = crypto.createPrivateKey(userKeyPem);
    const signer: Signer     = signers.newPrivateKeySigner(privateKey);

    // ── open gRPC connection to peer ─────────────────────────────
    this.client = new grpc.Client(
      peerEndpoint,
      grpc.credentials.createSsl(tlsCredentials),
      { 'grpc.ssl_target_name_override': peerHostAlias },
    );

    // ── connect Fabric Gateway ───────────────────────────────────
    this.gateway = connect({
      client: this.client,
      identity,
      signer,
      evaluateOptions:     () => ({ deadline: Date.now() + 5_000  }),
      endorseOptions:      () => ({ deadline: Date.now() + 15_000 }),
      submitOptions:       () => ({ deadline: Date.now() + 15_000 }),
      commitStatusOptions: () => ({ deadline: Date.now() + 60_000 }),
    });

    const network    = this.gateway.getNetwork(channelName);
    this.contract    = network.getContract(chaincodeName);

    this.logger.log(
      `✅ Connected → channel: "${channelName}" | chaincode: "${chaincodeName}" | msp: ${mspId}`,
    );
  }

  // ── helpers ────────────────────────────────────────────────────

  private async readFile(filePath: string, label: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (err) {
      throw new Error(
        `Failed to read ${label} at "${filePath}". ` +
        `Make sure the file exists. Run the copy script after every network.sh up.\n${err}`,
      );
    }
  }

  private requireEnv(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new Error(
        `Missing required env var: "${key}". Check your .env file.`,
      );
    }
    return value;
  }
}
