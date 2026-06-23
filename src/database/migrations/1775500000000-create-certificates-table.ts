// src/database/migrations/XXXXXXXXXXXXXX-create-certificates-table.ts
import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateCertificatesTable1775500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.createTable(
      new Table({
        name: "certificates",
        columns: [
          // Primary key
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "uuid_generate_v4()",
          },
          {
            name: "student_name",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "roll_number",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "registration_number",
            type: "varchar",
            length: "100",
            isNullable: false,
          },
          // Academic details
          {
            name: "institute",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "exam_name",
            type: "varchar",
            length: "100",
            isNullable: false,
          },
          {
            name: "result",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "passing_year",
            type: "varchar",
            length: "10",
            isNullable: false,
          },
          {
            name: "board",
            type: "varchar",
            length: "100",
            isNullable: false,
          },
          // Security & verification
          {
            name: "qr_code_token",
            type: "varchar",
            length: "1024",
            isUnique: true,
            isNullable: true,
          },
          {
            name: "qr_code_path",
            type: "varchar",
            length: "500",
            isNullable: true,
          },
          // Blockchain references
          {
            name: "blockchain_tx_id",
            type: "varchar",
            length: "128",
            isNullable: true,
          },
          {
            name: "blockchain_block_number",
            type: "bigint",
            isNullable: true,
          },
          {
            name: "blockchain_timestamp",
            type: "timestamp",
            isNullable: true,
          },
          // Status management
          {
            name: "status",
            type: "enum",
            enum: ["draft", "issued", "revoked", "failed"],
            default: "'draft'",
          },
          // Issuance details
          {
            name: "issued_by",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "issued_at",
            type: "timestamp",
            isNullable: true,
          },
          // Revocation details
          {
            name: "revoked_by",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "revoked_at",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "revocation_reason",
            type: "text",
            isNullable: true,
          },
          // Audit
          {
            name: "created_by",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "updated_by",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
          // Additional metadata (optional)
          {
            name: "metadata",
            type: "jsonb",
            isNullable: true,
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("certificates");
  }
}
