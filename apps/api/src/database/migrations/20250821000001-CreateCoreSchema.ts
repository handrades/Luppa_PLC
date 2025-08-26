import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoreSchema20250821000001 implements MigrationInterface {
  name = 'CreateCoreSchema20250821000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the core schema
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS core`);

    // Move existing tables from public to core schema
    await queryRunner.query(`ALTER TABLE IF EXISTS public.users SET SCHEMA core`);
    await queryRunner.query(`ALTER TABLE IF EXISTS public.roles SET SCHEMA core`);
    await queryRunner.query(`ALTER TABLE IF EXISTS public.notifications SET SCHEMA core`);
    await queryRunner.query(`ALTER TABLE IF EXISTS public.audit_logs SET SCHEMA core`);

    // Move import_history table if it exists in public
    await queryRunner.query(`ALTER TABLE IF EXISTS public.import_history SET SCHEMA core`);

    // Update foreign key constraints to use core schema references
    // For notifications.user_id -> core.users(id)
    await queryRunner.query(`
      DO $$
      BEGIN
        -- Drop existing FK if it exists
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'FK_9a8a82462cab47c73d25f49261f' 
                  AND table_schema = 'core' 
                  AND table_name = 'notifications') THEN
          ALTER TABLE core.notifications DROP CONSTRAINT FK_9a8a82462cab47c73d25f49261f;
        END IF;
        
        -- Recreate with proper schema reference
        ALTER TABLE core.notifications 
        ADD CONSTRAINT FK_9a8a82462cab47c73d25f49261f 
        FOREIGN KEY (user_id) REFERENCES core.users(id) ON DELETE CASCADE ON UPDATE NO ACTION;
      END $$;
    `);

    // For audit_logs.user_id -> core.users(id)
    await queryRunner.query(`
      DO $$
      BEGIN
        -- Drop existing FK if it exists
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'FK_bd2726fd31b35443f2245b93ba0' 
                  AND table_schema = 'core' 
                  AND table_name = 'audit_logs') THEN
          ALTER TABLE core.audit_logs DROP CONSTRAINT FK_bd2726fd31b35443f2245b93ba0;
        END IF;
        
        -- Recreate with proper schema reference
        ALTER TABLE core.audit_logs 
        ADD CONSTRAINT FK_bd2726fd31b35443f2245b93ba0 
        FOREIGN KEY (user_id) REFERENCES core.users(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
      END $$;
    `);

    // For users.role_id -> core.roles(id)
    await queryRunner.query(`
      DO $$
      BEGIN
        -- Drop existing FK if it exists
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
                  WHERE constraint_name = 'FK_a2cecd1a3531c0b041e29ba46e1' 
                  AND table_schema = 'core' 
                  AND table_name = 'users') THEN
          ALTER TABLE core.users DROP CONSTRAINT FK_a2cecd1a3531c0b041e29ba46e1;
        END IF;
        
        -- Recreate with proper schema reference
        ALTER TABLE core.users 
        ADD CONSTRAINT FK_a2cecd1a3531c0b041e29ba46e1 
        FOREIGN KEY (role_id) REFERENCES core.roles(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
      END $$;
    `);

    // For import_history.user_id -> core.users(id)
    await queryRunner.query(`
      DO $$
      BEGIN
        -- Drop existing FK if it exists from import_history
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints tc
                  JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
                  WHERE tc.table_schema = 'core' 
                  AND tc.table_name = 'import_history'
                  AND ccu.column_name = 'user_id') THEN
          
          -- Find the constraint name dynamically
          DECLARE
            constraint_name_var TEXT;
          BEGIN
            SELECT tc.constraint_name INTO constraint_name_var
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_schema = 'core' 
            AND tc.table_name = 'import_history'
            AND ccu.column_name = 'user_id'
            AND tc.constraint_type = 'FOREIGN KEY';
            
            IF constraint_name_var IS NOT NULL THEN
              EXECUTE 'ALTER TABLE core.import_history DROP CONSTRAINT ' || constraint_name_var;
            END IF;
          END;
        END IF;
        
        -- Recreate with proper schema reference
        ALTER TABLE core.import_history 
        ADD CONSTRAINT fk_import_history_user 
        FOREIGN KEY (user_id) REFERENCES core.users(id) ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION
        WHEN others THEN
          -- Table might not exist yet, ignore error
          NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Move tables back to public schema
    await queryRunner.query(`ALTER TABLE IF EXISTS core.import_history SET SCHEMA public`);
    await queryRunner.query(`ALTER TABLE IF EXISTS core.audit_logs SET SCHEMA public`);
    await queryRunner.query(`ALTER TABLE IF EXISTS core.notifications SET SCHEMA public`);
    await queryRunner.query(`ALTER TABLE IF EXISTS core.roles SET SCHEMA public`);
    await queryRunner.query(`ALTER TABLE IF EXISTS core.users SET SCHEMA public`);

    // Drop the core schema if it's empty
    await queryRunner.query(`DROP SCHEMA IF EXISTS core`);
  }
}
