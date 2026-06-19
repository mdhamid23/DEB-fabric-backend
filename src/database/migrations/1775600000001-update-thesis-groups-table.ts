import {
  MigrationInterface,
  QueryRunner,
  TableCheck,
  TableColumn,
} from "typeorm";

export class UpdateThesisGroupsStatusColumns1775600000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns("thesis_groups", [
      new TableColumn({
        name: "status",
        type: "varchar",
        length: "30",
        isNullable: false,
        default: "'submitted'",
      }),
      new TableColumn({
        name: "registration_completed",
        type: "boolean",
        isNullable: false,
        default: false,
      }),
    ]);

    await queryRunner.createCheckConstraint(
      "thesis_groups",
      new TableCheck({
        name: "CHK_thesis_groups_status",
        expression: `"status" IN ('submitted', 'action_needed', 'resubmitted', 'completed')`,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const thesisGroupsTable = await queryRunner.getTable("thesis_groups");

    const statusCheck = thesisGroupsTable?.checks.find(
      (check) => check.name === "CHK_thesis_groups_status",
    );

    if (statusCheck) {
      await queryRunner.dropCheckConstraint("thesis_groups", statusCheck);
    }

    const registrationCompletedColumn = thesisGroupsTable?.columns.find(
      (column) => column.name === "registration_completed",
    );

    if (registrationCompletedColumn) {
      await queryRunner.dropColumn(
        "thesis_groups",
        registrationCompletedColumn,
      );
    }

    const statusColumn = thesisGroupsTable?.columns.find(
      (column) => column.name === "status",
    );

    if (statusColumn) {
      await queryRunner.dropColumn("thesis_groups", statusColumn);
    }
  }
}
