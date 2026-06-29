import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import * as crypto from "crypto";
import { FabricGatewayService } from "../fabric/fabric-gateway.service";
import { IssueCertificateDto } from "./dto/issue-certificate.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Certificate } from "./entities/certificate.entity";
import { Repository } from "typeorm";
import { QrCodeService } from "./qr-code.service";
import { CertificateStatus } from "@/src/common/enums/certificate-status.enum";
import { ManualVerifyCertificateDto } from "./dto/manual-verify-certificate.dto";
import {
  BulkCreateResultDto,
  BulkIssueCertificateDto,
} from "./dto/bulk-upload.dto";

export type VerificationResult =
  | "AUTHENTIC"
  | "REVOKED"
  | "INVALID"
  | "TAMPERED";

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly fabric: FabricGatewayService,
    @InjectRepository(Certificate)
    private certificateRepository: Repository<Certificate>,
    private readonly qrCodeService: QrCodeService,
  ) {}

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
    // ── 1. Check duplicate in PostgreSQL ──────────────────────────
    const existing = await this.certificateRepository.findOne({
      where: {
        rollNumber: dto.rollNumber,
        registrationNumber: dto.registrationNumber,
      },
    });
    if (existing) {
      throw new ConflictException(
        "Certificate already exists with given roll and registration number",
      );
    }

    const certificateHash = this.computeCertificateHash(dto);

    const record = this.certificateRepository.create({
      ...dto,
      status: CertificateStatus.DRAFT,
    });
    await this.certificateRepository.save(record);

    const qrToken = this.qrCodeService.generateQrToken({
      certificateId: record.id,
    });
    record.qrCodeToken = qrToken;

    const contract = this.fabric.getContract();

    try {
      const resultBytes = await contract.submitTransaction(
        "IssueCertificate",
        record.id, // internal ID — links DB record to on-chain proof
        certificateHash, // SHA-256 fingerprint — the ONLY data on-chain
      );

      const fabricRecord = JSON.parse(
        Buffer.from(resultBytes).toString("utf8"),
      );

      // ── 6. Mark as ISSUED in PostgreSQL after Fabric confirms ────
      record.status = CertificateStatus.ISSUED;
      record.blockchainTxId = fabricRecord.txId ?? null; // optional: store tx reference
      await this.certificateRepository.save(record);

      // ── 7. Return clean response (no hash, no internal IDs) ──────
      return {
        certificateId: record.id,
        studentName: record.studentName,
        examName: record.examName,
        result: record.result,
        board: record.board,
        passingYear: record.passingYear,
        status: "ISSUED",
        qrToken,
        issuedAt: record.createdAt,
      };
    } catch (err: any) {
      // ── Rollback: mark as FAILED in PostgreSQL ───────────────────
      record.status = CertificateStatus.FAILED;
      await this.certificateRepository.save(record);

      if (this.isAlreadyExistsError(err)) {
        throw new ConflictException(
          "Certificate already exists on the blockchain",
        );
      }
      throw err;
    }
  }

  /**
   * Verify by certificate ID alone (chain comparison only — no recomputed hash
   * supplied, e.g. when verifying purely from a QR token/reference).
   */
  async verifyById(token: string) {
    const record = await this.certificateRepository.findOne({
      where: { qrCodeToken: token },
    });
    if (!record) {
      throw new NotFoundException("Certificate not found for given QR token");
    }
    const certificateHash = this.computeCertificateHash({
      studentName: record.studentName,
      rollNumber: record.rollNumber,
      registrationNumber: record.registrationNumber,
      institute: record.institute,
      examName: record.examName,
      result: record.result,
      passingYear: record.passingYear,
      board: record.board,
    });

    return this.evaluateVerify(record.id, certificateHash);
  }

  /**
   * Verify by recomputing the hash from supplied certificate data and comparing
   * against what's on-chain — this is what should be used for the "manual
   * entry" verification flow, since it also detects tampered field values.
   */
  async verifyWithData(dto: ManualVerifyCertificateDto) {
    const findExisting = await this.certificateRepository.findOne({
      where: {
        rollNumber: dto.rollNumber,
        registrationNumber: dto.registrationNumber,
        passingYear: dto.passingYear,
      },
    });
    if (!findExisting) {
      throw new NotFoundException({
        message: "Certificate Not Found with Given Data",
        result: "NOT FOUND",
      });
    }
    const suppliedHash = this.computeCertificateHash({
      studentName: findExisting.studentName,
      rollNumber: findExisting.rollNumber,
      registrationNumber: findExisting.registrationNumber,
      passingYear: findExisting.passingYear,
      institute: findExisting.institute,
      result: findExisting.result,
      board: findExisting.board,
      examName: findExisting.examName,
    });
    return this.evaluateVerify(findExisting.id, suppliedHash);
  }

  private async evaluateVerify(certificateId: string, suppliedHash: string) {
    const contract = this.fabric.getContract();
    const resultBytes = await contract.evaluateTransaction(
      "VerifyCertificate",
      certificateId,
      suppliedHash,
    );
    const response = JSON.parse(Buffer.from(resultBytes).toString("utf8")) as {
      result: VerificationResult;
      message: string;
      certificate?: unknown;
    };
    return {
      message: response.message,
      result: response.result,
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
      await this.certificateRepository.update(
        { id: certificateId },
        {
          status: CertificateStatus.REVOKED,
          revokedAt: new Date(),
          revocationReason: reason,
        },
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
      const response = await this.certificateRepository.findOne({
        where: { id: certificateId },
      });
      if (!response) {
        throw new NotFoundException(
          `Certificate ${certificateId} not found in database`,
        );
      }
      const resultBytes = await contract.evaluateTransaction(
        "GetCertificate",
        certificateId,
      );
      if (!resultBytes || resultBytes.length === 0) {
        throw new NotFoundException(
          `Certificate ${certificateId} not found on blockchain`,
        );
      }

      // return JSON.parse(Buffer.from(resultBytes).toString("utf8"));
      return response;
    } catch (err: any) {
      if (this.isNotFoundError(err)) {
        throw new NotFoundException(`Certificate ${certificateId} not found`);
      }
      throw err;
    }
  }

  async getAll() {
    // const contract = this.fabric.getContract();
    // const resultBytes =
    //   await contract.evaluateTransaction("GetAllCertificates");
    // return JSON.parse(Buffer.from(resultBytes).toString("utf8"));
    return this.certificateRepository.find();
  }

  private isAlreadyExistsError(err: any): boolean {
    return /already exists/i.test(err?.message ?? "");
  }

  private isNotFoundError(err: any): boolean {
    return /does not exist/i.test(err?.message ?? "");
  }

  // src/modules/certificates/certificates.service.ts (add this method)

  // Add this method to the CertificatesService class
  // src/modules/certificates/certificates.service.ts

  async bulkIssue(dto: BulkIssueCertificateDto): Promise<BulkCreateResultDto> {
    // Ensure certificates array exists
    const certificates = dto.certificates || [];

    if (certificates.length === 0) {
      throw new BadRequestException(
        "No certificates provided for bulk creation",
      );
    }

    const results: BulkCreateResultDto = {
      total: certificates.length,
      created: 0,
      failed: 0,
      errors: [],
      certificates: [],
    };

    // Process certificates one by one with error handling
    for (let i = 0; i < certificates.length; i++) {
      const certDto = certificates[i];

      try {
        // Check for duplicates in PostgreSQL
        const existing = await this.certificateRepository.findOne({
          where: {
            rollNumber: certDto.rollNumber,
            registrationNumber: certDto.registrationNumber,
          },
        });

        if (existing) {
          results.failed++;
          results.errors.push({
            index: i,
            rollNumber: certDto.rollNumber,
            registrationNumber: certDto.registrationNumber,
            error:
              "Certificate already exists with given roll and registration number",
          });
          continue;
        }

        const certificateHash = this.computeCertificateHash(certDto);

        // Create record in DRAFT status
        const record = this.certificateRepository.create({
          ...certDto,
          status: CertificateStatus.DRAFT,
        });
        await this.certificateRepository.save(record);

        const qrToken = this.qrCodeService.generateQrToken({
          certificateId: record.id,
        });
        record.qrCodeToken = qrToken;

        const contract = this.fabric.getContract();

        try {
          // Submit to blockchain
          const resultBytes = await contract.submitTransaction(
            "IssueCertificate",
            record.id,
            certificateHash,
          );

          const fabricRecord = JSON.parse(
            Buffer.from(resultBytes).toString("utf8"),
          );

          // Update status to ISSUED
          record.status = CertificateStatus.ISSUED;
          record.blockchainTxId = fabricRecord.txId ?? null;
          await this.certificateRepository.save(record);

          results.created++;
          results.certificates.push({
            certificateId: record.id,
            studentName: record.studentName,
            examName: record.examName,
            result: record.result,
            board: record.board,
            passingYear: record.passingYear,
            status: "ISSUED",
            qrToken,
            issuedAt: record.createdAt,
          });
        } catch (err: any) {
          // Rollback: mark as FAILED
          record.status = CertificateStatus.FAILED;
          await this.certificateRepository.save(record);

          results.failed++;
          let errorMessage = err.message || "Blockchain submission failed";

          if (this.isAlreadyExistsError(err)) {
            errorMessage = "Certificate already exists on the blockchain";
          }

          results.errors.push({
            index: i,
            rollNumber: certDto.rollNumber,
            registrationNumber: certDto.registrationNumber,
            error: errorMessage,
          });
        }
      } catch (err: any) {
        // Catch any other errors
        results.failed++;
        results.errors.push({
          index: i,
          rollNumber: certDto.rollNumber,
          registrationNumber: certDto.registrationNumber,
          error: err.message || "Failed to process certificate",
        });
      }
    }

    return results;
  }
}
