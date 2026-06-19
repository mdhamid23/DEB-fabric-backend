import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class CreateOBEMarksTable1775800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "obe_marks",
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
            type: "uuid",
            isNullable: false,
          },
          {
            name: "thesis_group_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "co1",
            type: "int",
            default: 0,
            isNullable: false,
          },
          {
            name: "co2",
            type: "int",
            default: 0,
            isNullable: false,
          },
          {
            name: "co3",
            type: "int",
            default: 0,
            isNullable: false,
          },
          {
            name: "co4",
            type: "int",
            default: 0,
            isNullable: false,
          },
          {
            name: "co5",
            type: "int",
            default: 0,
            isNullable: false,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
    );

    // Add foreign key for student_id
    await queryRunner.createForeignKey(
      "obe_marks",
      new TableForeignKey({
        columnNames: ["student_id"],
        referencedTableName: "thesis_group_students",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    // Add foreign key for thesis_group_id
    await queryRunner.createForeignKey(
      "obe_marks",
      new TableForeignKey({
        columnNames: ["thesis_group_id"],
        referencedTableName: "thesis_groups",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    // Add indexes
    await queryRunner.createIndex(
      "obe_marks",
      new TableIndex({
        columnNames: ["student_id"],
      }),
    );

    await queryRunner.createIndex(
      "obe_marks",
      new TableIndex({
        columnNames: ["thesis_group_id"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("obe_marks");
  }
}
