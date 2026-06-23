// src/modules/certificates/entities/certificate-status.enum.ts

// src/modules/certificates/entities/certificate.entity.ts
import { CertificateStatus } from "@/src/common/enums/certificate-status.enum";
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";

@Entity("certificates")
@Index(["status"])
@Index(["studentName", "examName", "passingYear"])
export class Certificate {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "student_name", length: 255 })
  studentName: string = "";

  @Column({ name: "roll_number", length: 50 })
  rollNumber: string = "";

  @Column({ name: "registration_number", length: 100 })
  registrationNumber: string = "";

  @Column({ length: 255 })
  institute: string = "";

  @Column({ name: "exam_name", length: 100 })
  examName: string = "";

  @Column({ length: 50 })
  result: string = "";

  @Column({ name: "passing_year", length: 10 })
  passingYear: string = "";

  @Column({ length: 100 })
  board: string = "";

  @Column({ name: "qr_code_token", length: 255, unique: true })
  qrCodeToken: string = "";

  @Column({ name: "qr_code_path", length: 500, nullable: true })
  qrCodePath?: string;

  @Column({ name: "blockchain_tx_id", length: 128, nullable: true })
  blockchainTxId?: string;

  @Column({ name: "blockchain_block_number", type: "bigint", nullable: true })
  blockchainBlockNumber?: number;

  @Column({ name: "blockchain_timestamp", type: "timestamp", nullable: true })
  blockchainTimestamp?: Date;

  @Column({
    type: "enum",
    enum: CertificateStatus,
    default: CertificateStatus.DRAFT,
  })
  status: CertificateStatus = CertificateStatus.DRAFT;

  @Column({ name: "issued_by", nullable: true })
  issuedBy?: string;

  @Column({ name: "issued_at", type: "timestamp", nullable: true })
  issuedAt?: Date;

  @Column({ name: "revoked_by", nullable: true })
  revokedBy?: string;

  @Column({ name: "revoked_at", type: "timestamp", nullable: true })
  revokedAt?: Date;

  @Column({ name: "revocation_reason", type: "text", nullable: true })
  revocationReason?: string;

  @Column({ name: "created_by", nullable: true })
  createdBy?: string;

  @Column({ name: "updated_by", nullable: true })
  updatedBy?: string;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date = new Date();

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date = new Date();
}
