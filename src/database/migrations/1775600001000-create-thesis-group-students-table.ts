import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from "typeorm";

export class CreateThesisGroupStudentsTable1775600001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "thesis_group_students",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "student_id",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "name",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "cgpa",
            type: "varchar",
            length: "10",
            isNullable: false,
          },
          {
            name: "primary_email",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "secondary_email",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "phone_no",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "credit_completed",
            type: "varchar",
            length: "20",
            isNullable: false,
          },
          {
            name: "credit_take_with_thesis",
            type: "varchar",
            length: "20",
            isNullable: true,
          },
          {
            name: "research_methodology_completed",
            type: "varchar",
            length: "3",
            default: `'no'`,
            isNullable: false,
          },
          {
            name: "thesis_group_id",
            type: "uuid",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    const studentsTable = await queryRunner.getTable("thesis_group_students");
    const hasThesisGroupFk = studentsTable?.foreignKeys.some((fk) =>
      fk.columnNames.includes("thesis_group_id"),
    );

    if (!hasThesisGroupFk) {
      await queryRunner.createForeignKey(
        "thesis_group_students",
        new TableForeignKey({
          columnNames: ["thesis_group_id"],
          referencedTableName: "thesis_groups",
          referencedColumnNames: ["id"],
          onDelete: "CASCADE",
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const studentsTable = await queryRunner.getTable("thesis_group_students");
    const thesisGroupFk = studentsTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes("thesis_group_id"),
    );

    if (thesisGroupFk) {
      await queryRunner.dropForeignKey("thesis_group_students", thesisGroupFk);
    }

    await queryRunner.dropTable("thesis_group_students");
  }
}
