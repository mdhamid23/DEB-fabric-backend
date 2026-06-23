import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import * as crypto from "crypto";
import { FabricGatewayService } from "../fabric/fabric-gateway.service";
import { IssueCertificateDto } from "./dto/issue-certificate.dto";

export type VerificationResult =
  | "AUTHENTIC"
  | "REVOKED"
  | "INVALID"
  | "TAMPERED";

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(private readonly fabric: FabricGatewayService) {}

  /**
   * Builds the certificate hash from a FIXED field order. This exact order
   * must be reproduced at verification time, or every certificate will look
   * "TAMPERED" even when nothing changed.
   */
  computeCertificateHash(dto: IssueCertificateDto): string {
    const canonical = [
      dto.studentName,
      dto.rollNumber,
      dto.registrationNumber,
      dto.institute,
      dto.examName,
      dto.result,
      dto.passingYear,
      dto.board,
    ].join("|");

    return crypto.createHash("sha256").update(canonical).digest("hex");
  }

  async issue(dto: IssueCertificateDto) {
    const contract = this.fabric.getContract();
    const certificateHash = this.computeCertificateHash(dto);

    try {
      const resultBytes = await contract.submitTransaction(
        "IssueCertificate",
        dto.studentName,
        dto.rollNumber,
        dto.registrationNumber,
        dto.institute,
        dto.examName,
        dto.result,
        dto.passingYear,
        dto.board,
        certificateHash,
      );

      const result = JSON.parse(Buffer.from(resultBytes).toString("utf8"));

      return result;
    } catch (err: any) {
      if (this.isAlreadyExistsError(err)) {
        throw new ConflictException(`Certificate already exists`);
      }
      throw err;
    }
  }

  /**
   * Verify by certificate ID alone (chain comparison only — no recomputed hash
   * supplied, e.g. when verifying purely from a QR token/reference).
   */
  async verifyById(certificateId: string) {
    return this.evaluateVerify(certificateId, "");
  }

  /**
   * Verify by recomputing the hash from supplied certificate data and comparing
   * against what's on-chain — this is what should be used for the "manual
   * entry" verification flow, since it also detects tampered field values.
   */
  async verifyWithData(
    certificateId: string,
    dto: Omit<IssueCertificateDto, "certificateId">,
  ) {
    const suppliedHash = this.computeCertificateHash({ ...dto });
    return this.evaluateVerify(certificateId, suppliedHash);
  }

  private async evaluateVerify(certificateId: string, suppliedHash: string) {
    const contract = this.fabric.getContract();
    const resultBytes = await contract.evaluateTransaction(
      "VerifyCertificate",
      certificateId,
      suppliedHash,
    );
    return JSON.parse(Buffer.from(resultBytes).toString("utf8")) as {
      result: VerificationResult;
      message: string;
      certificate?: unknown;
    };
  }

  async revoke(certificateId: string, reason: string) {
    const contract = this.fabric.getContract();
    try {
      const resultBytes = await contract.submitTransaction(
        "RevokeCertificate",
        certificateId,
        reason,
      );
      return JSON.parse(Buffer.from(resultBytes).toString("utf8"));
    } catch (err: any) {
      if (this.isNotFoundError(err)) {
        throw new NotFoundException(`Certificate ${certificateId} not found`);
      }
      throw err;
    }
  }

  async getById(certificateId: string) {
    const contract = this.fabric.getContract();
    try {
      const resultBytes = await contract.evaluateTransaction(
        "GetCertificate",
        certificateId,
      );
      return JSON.parse(Buffer.from(resultBytes).toString("utf8"));
    } catch (err: any) {
      if (this.isNotFoundError(err)) {
        throw new NotFoundException(`Certificate ${certificateId} not found`);
      }
      throw err;
    }
  }

  async getAll() {
    const contract = this.fabric.getContract();
    const resultBytes =
      await contract.evaluateTransaction("GetAllCertificates");
    return JSON.parse(Buffer.from(resultBytes).toString("utf8"));
  }

  private isAlreadyExistsError(err: any): boolean {
    return /already exists/i.test(err?.message ?? "");
  }

  private isNotFoundError(err: any): boolean {
    return /does not exist/i.test(err?.message ?? "");
  }
}
