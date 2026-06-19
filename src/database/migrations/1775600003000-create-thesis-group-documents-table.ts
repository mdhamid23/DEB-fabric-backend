import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class CreateThesisGroupDocumentsTable1775600003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the table with the final single-row structure
    await queryRunner.createTable(
      new Table({
        name: "thesis_group_documents",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "thesis_group_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "semester_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "literature_review",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "project_proposal",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "progress_report",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "final_thesis_book",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "plagiarism_report",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "ai_detection_report",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "presentation_slide",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "poster",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "plagiarism_percentage",
            type: "decimal",
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: "ai_detection_percentage",
            type: "decimal",
            precision: 5,
            scale: 2,
            isNullable: true,
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

    // Add foreign key for thesis_group_id
    await queryRunner.createForeignKey(
      "thesis_group_documents",
      new TableForeignKey({
        columnNames: ["thesis_group_id"],
        referencedTableName: "thesis_groups",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      }),
    );

    // Add foreign key for semester_id
    await queryRunner.createForeignKey(
      "thesis_group_documents",
      new TableForeignKey({
        columnNames: ["semester_id"],
        referencedTableName: "semesters",
        referencedColumnNames: ["id"],
        onDelete: "RESTRICT",
      }),
    );

    // Add unique constraint on thesis_group_id (one row per thesis group)
    await queryRunner.createIndex(
      "thesis_group_documents",
      new TableIndex({
        name: "UQ_tgd_group",
        columnNames: ["thesis_group_id"],
        isUnique: true,
      }),
    );

    // Add composite index for efficient querying
    await queryRunner.createIndex(
      "thesis_group_documents",
      new TableIndex({
        name: "IDX_tgd_group_semester",
        columnNames: ["thesis_group_id", "semester_id"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("thesis_group_documents");

    // Drop indexes
    const uniqueIndex = table?.indices.find((i) => i.name === "UQ_tgd_group");
    if (uniqueIndex) {
      await queryRunner.dropIndex("thesis_group_documents", uniqueIndex);
    }

    const compositeIndex = table?.indices.find(
      (i) => i.name === "IDX_tgd_group_semester",
    );
    if (compositeIndex) {
      await queryRunner.dropIndex("thesis_group_documents", compositeIndex);
    }

    // Drop foreign keys
    const groupFk = table?.foreignKeys.find((fk) =>
      fk.columnNames.includes("thesis_group_id"),
    );
    const semesterFk = table?.foreignKeys.find((fk) =>
      fk.columnNames.includes("semester_id"),
    );

    if (groupFk) {
      await queryRunner.dropForeignKey("thesis_group_documents", groupFk);
    }

    if (semesterFk) {
      await queryRunner.dropForeignKey("thesis_group_documents", semesterFk);
    }

    // Drop the table
    await queryRunner.dropTable("thesis_group_documents");
  }
}
