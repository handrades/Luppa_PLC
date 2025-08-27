import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPLCIpAddressType1756780000000 implements MigrationInterface {
  name = 'FixPLCIpAddressType1756780000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First check if the column is already inet type
    const result = await queryRunner.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'plc_inventory' 
        AND table_name = 'plcs' 
        AND column_name = 'ip_address'
    `);

    if (result.length > 0 && result[0].data_type !== 'inet') {
      // Alter the column type from varchar to inet with proper casting
      await queryRunner.query(`
        ALTER TABLE plc_inventory.plcs 
        ALTER COLUMN ip_address TYPE inet 
        USING ip_address::inet
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
