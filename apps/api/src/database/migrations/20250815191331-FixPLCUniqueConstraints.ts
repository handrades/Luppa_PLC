import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPLCUniqueConstraints20250815191331 implements MigrationInterface {
  name = 'FixPLCUniqueConstraints20250815191331';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deleted_at column to PLCs table if it doesn't exist
    const plcTableColumns = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'plcs' AND column_name = 'deleted_at'
    `);

    if (plcTableColumns.length === 0) {
      await queryRunner.query(`
        ALTER TABLE plcs 
        ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL
      `);
    }

    // Drop existing unique constraints and indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_plcs_tag_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_plcs_ip_address_unique`);
    await queryRunner.query(`ALTER TABLE plcs DROP CONSTRAINT IF EXISTS plcs_tag_id_key`);
    await queryRunner.query(`ALTER TABLE plcs DROP CONSTRAINT IF EXISTS uk_plcs_ip_address`);

    // Create new partial unique indexes that exclude soft-deleted records
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_plcs_tag_id_unique 
      ON plcs(tag_id) 
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_plcs_ip_address_unique 
      ON plcs(ip_address) 
      WHERE ip_address IS NOT NULL AND deleted_at IS NULL
    `);

    // Create regular index on tag_id for query performance
    await queryRunner.query(`CREATE INDEX idx_plcs_tag_id ON plcs(tag_id)`);

    // Create index on deleted_at for soft deletion queries
    await queryRunner.query(`CREATE INDEX idx_plcs_deleted_at ON plcs(deleted_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the new indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_plcs_tag_id_unique`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_plcs_ip_address_unique`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_plcs_tag_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_plcs_deleted_at`);

    // Restore original constraints (this will fail if there are soft-deleted records with conflicts)
    await queryRunner.query(`
      ALTER TABLE plcs 
      ADD CONSTRAINT plcs_tag_id_key UNIQUE (tag_id)
    `);

    await queryRunner.query(`
      ALTER TABLE plcs 
      ADD CONSTRAINT uk_plcs_ip_address UNIQUE (ip_address)
    `);

    // Create original indexes
    await queryRunner.query(`CREATE INDEX idx_plcs_tag_id ON plcs(tag_id)`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_plcs_ip_address_unique 
      ON plcs(ip_address) 
      WHERE ip_address IS NOT NULL
    `);

    // Note: We don't remove the deleted_at column in down migration
    // to avoid data loss. If needed, it can be done manually.
  }
}
