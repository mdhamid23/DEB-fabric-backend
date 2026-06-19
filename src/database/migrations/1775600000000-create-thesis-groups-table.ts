import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
} from "typeorm";

export class CreateThesisGroupsTable1775600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create thesis_groups table with all columns from both migrations
    await queryRunner.createTable(
      new Table({
        name: "thesis_groups",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "semester_id",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "class_id",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "global_group_serial",
            type: "varchar",
            length: "10",
            isNullable: true,
          },
          {
            name: "supervisor_group",
            type: "varchar",
            length: "20",
            isNullable: true,
          },
          {
            name: "external_id",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "external_name",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "thesis_management_team_remark",
            type: "text",
            isNullable: true,
          },
          {
            name: "supervisor_remark",
            type: "text",
            isNullable: true,
          },
          {
            name: "supervisor_id",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "supervisor_name",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "supervisor_email",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "proposed_title",
            type: "varchar",
            length: "300",
            isNullable: false,
          },
          {
            name: "thesis_domain",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "short_description",
            type: "text",
            isNullable: false,
          },
          {
            name: "number_of_students",
            type: "int",
            isNullable: false,
          },
          {
            name: "accept_terms",
            type: "boolean",
            default: false,
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

    // Add check constraint for student count
    await queryRunner.createCheckConstraint(
      "thesis_groups",
      new TableCheck({
        name: "CHK_thesis_groups_student_count",
        expression: `"number_of_students" BETWEEN 2 AND 4`,
      }),
    );

    // Add foreign key for semester_id
    await queryRunner.createForeignKey(
      "thesis_groups",
      new TableForeignKey({
        columnNames: ["semester_id"],
        referencedTableName: "semesters",
        referencedColumnNames: ["id"],
        onDelete: "RESTRICT",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const thesisGroupsTable = await queryRunner.getTable("thesis_groups");

    // Drop foreign key
    const semesterFk = thesisGroupsTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes("semester_id"),
    );
    if (semesterFk) {
      await queryRunner.dropForeignKey("thesis_groups", semesterFk);
    }

    // Drop check constraint
    const studentCountCheck = thesisGroupsTable?.checks.find(
      (check) => check.name === "CHK_thesis_groups_student_count",
    );
    if (studentCountCheck) {
      await queryRunner.dropCheckConstraint("thesis_groups", studentCountCheck);
    }

    // Drop table
    await queryRunner.dropTable("thesis_groups");
  }
}
