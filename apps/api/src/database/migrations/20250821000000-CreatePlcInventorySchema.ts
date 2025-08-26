import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlcInventorySchema20250821000000 implements MigrationInterface {
  name = 'CreatePlcInventorySchema20250821000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the plc_inventory schema
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS plc_inventory`);

    // Move existing tables from public to plc_inventory schema
    // Note: Only move tables if they exist in public schema
    await queryRunner.query(`ALTER TABLE IF EXISTS public.sites SET SCHEMA plc_inventory`);
    await queryRunner.query(`ALTER TABLE IF EXISTS public.cells SET SCHEMA plc_inventory`);
    await queryRunner.query(`ALTER TABLE IF EXISTS public.equipment SET SCHEMA plc_inventory`);
    await queryRunner.query(`ALTER TABLE IF EXISTS public.plcs SET SCHEMA plc_inventory`);
    await queryRunner.query(`ALTER TABLE IF EXISTS public.tags SET SCHEMA plc_inventory`);

    // Update any foreign key constraints that might reference these tables
    // This is handled automatically by PostgreSQL when moving tables
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Move tables back to public schema
    await queryRunner.query(`ALTER TABLE IF EXISTS plc_inventory.tags SET SCHEMA public`);
    await queryRunner.query(`ALTER TABLE IF EXISTS plc_inventory.plcs SET SCHEMA public`);
    await queryRunner.query(`ALTER TABLE IF EXISTS plc_inventory.equipment SET SCHEMA public`);
    await queryRunner.query(`ALTER TABLE IF EXISTS plc_inventory.cells SET SCHEMA public`);
    await queryRunner.query(`ALTER TABLE IF EXISTS plc_inventory.sites SET SCHEMA public`);

    // Drop the plc_inventory schema if it's empty
    await queryRunner.query(`DROP SCHEMA IF EXISTS plc_inventory`);
  }
}
