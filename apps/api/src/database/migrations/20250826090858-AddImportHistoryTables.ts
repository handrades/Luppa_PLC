import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddImportHistoryTables20250826090858 implements MigrationInterface {
  name = 'AddImportHistoryTables20250826090858';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create import_logs table
    await queryRunner.createTable(
      new Table({
        name: 'import_logs',
        schema: 'plc_inventory',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'filename',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processing', 'completed', 'failed', 'rolled_back'],
            default: "'pending'",
          },
          {
            name: 'total_rows',
            type: 'integer',
            default: 0,
          },
          {
            name: 'processed_rows',
            type: 'integer',
            default: 0,
          },
          {
            name: 'skipped_rows',
            type: 'integer',
            default: 0,
          },
          {
            name: 'errors',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'warnings',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'started_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'completed_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'integer',
            isNullable: true,
            comment: 'Duration in milliseconds',
          },
          {
            name: 'rollback_available',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedSchema: 'core',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
      true
    );

    // Create import_rollbacks table
    await queryRunner.createTable(
      new Table({
        name: 'import_rollbacks',
        schema: 'plc_inventory',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'import_id',
            type: 'uuid',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'rollback_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'affected_records',
            type: 'integer',
            default: 0,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['success', 'failed'],
            default: "'success'",
          },
          {
            name: 'error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['import_id'],
            referencedTableName: 'import_logs',
            referencedSchema: 'plc_inventory',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedSchema: 'core',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
      true
    );

    // Create indexes for efficient querying
    await queryRunner.query(
      `CREATE INDEX idx_import_logs_user_id ON plc_inventory.import_logs (user_id)`
    );

    await queryRunner.query(
      `CREATE INDEX idx_import_logs_status ON plc_inventory.import_logs (status)`
    );

    await queryRunner.query(
      `CREATE INDEX idx_import_logs_started_at ON plc_inventory.import_logs (started_at)`
    );

    await queryRunner.query(
      `CREATE INDEX idx_import_rollbacks_import_id ON plc_inventory.import_rollbacks (import_id)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS plc_inventory.idx_import_rollbacks_import_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS plc_inventory.idx_import_logs_started_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS plc_inventory.idx_import_logs_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS plc_inventory.idx_import_logs_user_id`);

    // Drop tables
    await queryRunner.dropTable('import_rollbacks');
    await queryRunner.dropTable('import_logs');
  }
}
