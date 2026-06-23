import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateUsersTable1775500000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.createTable(
      new Table({
        name: "users",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          {
            name: "username",
            type: "varchar",
            length: "50",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "passwordHash",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "encryptedCaSecret",
            type: "text",
            isNullable: true,
          },
          {
            name: "role",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "status",
            type: "varchar",
            length: "50",
            default: "'active'",
            isNullable: false,
          },
          {
            name: "encryptedCert",
            type: "text",
            isNullable: true,
          },
          {
            name: "encryptedPrivateKey",
            type: "text",
            isNullable: true,
          },
          {
            name: "fabricCaEnrollmentId",
            type: "varchar",
            length: "100",
            isNullable: true,
          },
          {
            name: "certEnrolledAt",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "certExpiresAt",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "createdBy",
            type: "varchar",
            length: "50",
            isNullable: true,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "deactivatedAt",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "deactivatedBy",
            type: "varchar",
            length: "50",
            isNullable: true,
          },
        ],
      }),
      true, // if not exists
    );
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table
    await queryRunner.dropTable("users");
  }
}
