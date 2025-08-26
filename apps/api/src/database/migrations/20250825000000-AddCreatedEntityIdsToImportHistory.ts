import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedEntityIdsToImportHistory1724544000000 implements MigrationInterface {
  name = 'AddCreatedEntityIdsToImportHistory1724544000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "import_history" 
      ADD COLUMN "created_entity_ids" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "import_history" 
      DROP COLUMN "created_entity_ids"
    `);
  }
}
