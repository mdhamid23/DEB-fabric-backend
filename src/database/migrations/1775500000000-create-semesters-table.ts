import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateSemestersTable1775500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "semesters",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "semester_name",
            type: "varchar",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "group_creation_start",
            type: "date",
            isNullable: false,
          },
          {
            name: "group_creation_end",
            type: "date",
            isNullable: false,
          },
          {
            name: "mid_evidence_start",
            type: "date",
            isNullable: false,
          },
          {
            name: "mid_evidence_end",
            type: "date",
            isNullable: false,
          },
          {
            name: "final_evidence_start",
            type: "date",
            isNullable: false,
          },
          {
            name: "final_evidence_end",
            type: "date",
            isNullable: false,
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("semesters");
  }
}
