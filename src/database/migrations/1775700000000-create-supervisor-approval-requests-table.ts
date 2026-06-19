import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateSupervisorApprovalRequestsTable1775700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "supervisor_approval_requests",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "supervisor_id",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "semester_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "type",
            type: "varchar",
            default: "'additional_groups'",
          },
          {
            name: "status",
            type: "varchar",
            default: "'pending'",
          },
          {
            name: "request_date",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP(6)",
          },
          {
            name: "response_date",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "message",
            type: "text",
            isNullable: false,
          },
          {
            name: "group_count",
            type: "int",
            isNullable: true,
          },
          {
            name: "reason",
            type: "text",
            isNullable: true,
          },
          {
            name: "attachments",
            type: "jsonb",
            isNullable: false,
            default: "'[]'::jsonb",
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP(6)",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP(6)",
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      "supervisor_approval_requests",
      new TableIndex({
        name: "IDX_supervisor_approval_requests_supervisor",
        columnNames: ["supervisor_id"],
      }),
    );

    await queryRunner.createIndex(
      "supervisor_approval_requests",
      new TableIndex({
        name: "IDX_supervisor_approval_requests_semester",
        columnNames: ["semester_id"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("supervisor_approval_requests");

    const supervisorIndex = table?.indices.find(
      (index) => index.name === "IDX_supervisor_approval_requests_supervisor",
    );
    if (supervisorIndex) {
      await queryRunner.dropIndex(
        "supervisor_approval_requests",
        supervisorIndex,
      );
    }

    const semesterIndex = table?.indices.find(
      (index) => index.name === "IDX_supervisor_approval_requests_semester",
    );
    if (semesterIndex) {
      await queryRunner.dropIndex(
        "supervisor_approval_requests",
        semesterIndex,
      );
    }

    await queryRunner.dropTable("supervisor_approval_requests");
  }
}
