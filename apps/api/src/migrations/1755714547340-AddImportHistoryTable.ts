import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImportHistoryTable1755714547340 implements MigrationInterface {
  name = "AddImportHistoryTable1755714547340";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create import_history table
    await queryRunner.query(`
            CREATE TABLE import_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id),
                filename VARCHAR(255) NOT NULL,
                total_rows INTEGER NOT NULL,
                successful_rows INTEGER NOT NULL,
                failed_rows INTEGER NOT NULL,
                options JSONB NOT NULL,
                errors JSONB,
                created_entities JSONB,
                status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
                started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Create indexes
    await queryRunner.query(`
            CREATE INDEX idx_import_history_user ON import_history(user_id)
        `);

    await queryRunner.query(`
            CREATE INDEX idx_import_history_status ON import_history(status)
        `);

    await queryRunner.query(`
            CREATE INDEX idx_import_history_started_at ON import_history(started_at DESC)
        `);

    // Create update trigger function if not exists
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

    // Create trigger for import_history
    await queryRunner.query(`
            CREATE TRIGGER update_import_history_updated_at 
            BEFORE UPDATE ON import_history
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_import_history_updated_at ON import_history`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_import_history_started_at`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_import_history_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_import_history_user`);
    await queryRunner.query(`DROP TABLE IF EXISTS import_history`);
  }
}
