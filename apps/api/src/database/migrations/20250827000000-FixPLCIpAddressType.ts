import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPLCIpAddressType1756780000000 implements MigrationInterface {
  name = 'FixPLCIpAddressType1756780000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First check if the column is already inet type
    // For USER-DEFINED types like inet, we need to check udt_name
    const result = await queryRunner.query(`
      SELECT data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_schema = 'plc_inventory' 
        AND table_name = 'plcs' 
        AND column_name = 'ip_address'
    `);

    // Only proceed if column exists and is not already inet type
    if (result.length > 0 && result[0].udt_name !== 'inet') {
      // Clean up any empty or whitespace-only IP addresses before conversion
      await queryRunner.query(`
        UPDATE plc_inventory.plcs 
        SET ip_address = NULL 
        WHERE ip_address IS NOT NULL 
          AND TRIM(ip_address) = ''
      `);

      // Drop existing partial unique indexes on ip_address before altering column type
      await queryRunner.query(`
        DROP INDEX IF EXISTS idx_plcs_ip_address
      `);

      // Also drop the schema-qualified index if it exists
      await queryRunner.query(`
        DROP INDEX IF EXISTS plc_inventory.idx_plcs_ip_address
      `);

      // Log any potentially invalid IP addresses for debugging using pg_input_is_valid
      const invalidIPs = await queryRunner.query(`
        SELECT id, ip_address 
        FROM plc_inventory.plcs 
        WHERE ip_address IS NOT NULL 
          AND NOT pg_input_is_valid(trim(ip_address)::text, 'inet')
      `);

      if (invalidIPs.length > 0) {
        // Log invalid IPs for debugging - using console.warn intentionally for migration visibility
        // eslint-disable-next-line no-console
        console.warn(
          'Found potentially invalid IP addresses that will be set to NULL:',
          invalidIPs
        );

        // Set invalid IPs to NULL to prevent ALTER failure
        await queryRunner.query(`
          UPDATE plc_inventory.plcs 
          SET ip_address = NULL 
          WHERE ip_address IS NOT NULL 
            AND NOT pg_input_is_valid(trim(ip_address)::text, 'inet')
        `);
      }

      // Now safely alter the column type from varchar to inet
      await queryRunner.query(`
        ALTER TABLE plc_inventory.plcs 
        ALTER COLUMN ip_address TYPE inet 
        USING trim(ip_address)::inet
      `);

      // Recreate the partial unique index after type conversion
      await queryRunner.query(`
        CREATE UNIQUE INDEX idx_plcs_ip_address 
        ON plc_inventory.plcs(ip_address) 
        WHERE ip_address IS NOT NULL AND deleted_at IS NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to varchar if needed
    await queryRunner.query(`
      ALTER TABLE plc_inventory.plcs 
      ALTER COLUMN ip_address TYPE varchar(45) 
      USING ip_address::text
    `);
  }
}
