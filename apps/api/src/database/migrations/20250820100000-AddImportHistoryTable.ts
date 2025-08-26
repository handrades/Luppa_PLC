import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImportHistoryTable20250820100000 implements MigrationInterface {
  name = 'AddImportHistoryTable20250820100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure pgcrypto extension is available for gen_random_uuid()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey"`
    );
    await queryRunner.query(`DROP INDEX "core"."idx_users_username"`);
    await queryRunner.query(`DROP INDEX "core"."idx_users_email"`);
    await queryRunner.query(`DROP INDEX "core"."idx_users_active"`);
    await queryRunner.query(`DROP INDEX "core"."idx_notifications_user"`);
    await queryRunner.query(`DROP INDEX "core"."idx_notifications_unread"`);
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "notifications_type_check"`
    );
    await queryRunner.query(
      `CREATE TYPE "core"."tags_data_type_enum" AS ENUM('BOOL', 'INT', 'DINT', 'REAL', 'STRING', 'TIMER', 'COUNTER')`
    );
    await queryRunner.query(
      `CREATE TABLE "tags" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "plc_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "data_type" "core"."tags_data_type_enum" NOT NULL, "description" text, "address" character varying(100), "created_by" uuid NOT NULL, "updated_by" uuid NOT NULL, CONSTRAINT "PK_e7dc17249a1148a1970748eda99" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d8cef3790946b71d36f4cb19ac" ON "tags" ("plc_id", "name") `
    );
    await queryRunner.query(
      `CREATE TABLE "plcs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "equipment_id" uuid NOT NULL, "tag_id" character varying(100) NOT NULL, "description" text NOT NULL, "make" character varying(100) NOT NULL, "model" character varying(100) NOT NULL, "ip_address" inet, "firmware_version" character varying(50), "created_by" uuid NOT NULL, "updated_by" uuid NOT NULL, CONSTRAINT "PK_0bf53be622dead0b520b207929d" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d88f7fdeaa85935fbccc6aade5" ON "plcs" ("make", "model") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e537f8f18e965dc370e3b33345" ON "plcs" ("ip_address") WHERE ip_address IS NOT NULL AND deleted_at IS NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b3993f607ad48095c2e3db3958" ON "plcs" ("tag_id") WHERE deleted_at IS NULL`
    );
    await queryRunner.query(
      `CREATE TYPE "core"."equipment_equipment_type_enum" AS ENUM('PRESS', 'ROBOT', 'OVEN', 'CONVEYOR', 'ASSEMBLY_TABLE', 'OTHER')`
    );
    await queryRunner.query(
      `CREATE TABLE "equipment" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "cell_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "equipment_type" "core"."equipment_equipment_type_enum" NOT NULL, "created_by" uuid NOT NULL, "updated_by" uuid NOT NULL, CONSTRAINT "PK_0722e1b9d6eb19f5874c1678740" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "cells" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "site_id" uuid NOT NULL, "name" character varying(100) NOT NULL, "line_number" character varying(50) NOT NULL, "created_by" uuid NOT NULL, "updated_by" uuid NOT NULL, CONSTRAINT "PK_b9443df02c1a41bc03f264388c8" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bd9a7457cfaaff0fe8fd5956de" ON "cells" ("site_id", "line_number") `
    );
    await queryRunner.query(
      `CREATE TABLE "sites" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(100) NOT NULL, "created_by" uuid NOT NULL, "updated_by" uuid NOT NULL, CONSTRAINT "UQ_7a7dbd4513de54a315d97e1a7de" UNIQUE ("name"), CONSTRAINT "PK_4f5eccb1dfde10c9170502595a7" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7a7dbd4513de54a315d97e1a7d" ON "sites" ("name") `
    );
    await queryRunner.query(
      `CREATE TYPE "core"."audit_logs_action_enum" AS ENUM('INSERT', 'UPDATE', 'DELETE')`
    );
    await queryRunner.query(
      `CREATE TYPE "core"."audit_logs_risk_level_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "table_name" character varying(50) NOT NULL, "record_id" uuid NOT NULL, "action" "core"."audit_logs_action_enum" NOT NULL, "old_values" jsonb, "new_values" jsonb, "changed_fields" text array, "user_id" uuid NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "ip_address" inet, "user_agent" text, "session_id" character varying(255), "risk_level" "core"."audit_logs_risk_level_enum" NOT NULL DEFAULT 'LOW', "compliance_notes" text, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ddc1431fb26a7b342e84e498f8" ON "audit_logs" ("risk_level") WHERE risk_level IN ('HIGH', 'CRITICAL')`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs" ("action") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_88dcc148d532384790ab874c3d" ON "audit_logs" ("timestamp") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4bbe32b3f6fca66f54509fe57e" ON "audit_logs" ("user_id", "timestamp") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_45575c290a2b47aa366e853d07" ON "audit_logs" ("table_name", "record_id") `
    );

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
        started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for import_history
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

    // Create update triggers for all tables with updated_at columns
    const tablesToAddTriggers = [
      'import_history',
      'tags',
      'plcs',
      'equipment',
      'cells',
      'sites',
      'audit_logs',
      'users',
      'roles',
      'notifications',
    ];

    for (const table of tablesToAddTriggers) {
      await queryRunner.query(`
        CREATE TRIGGER update_${table}_updated_at 
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
    }

    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "is_system_role"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "users_username_key"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "username"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_login_at"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "action_url"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "expires_at"`);
    await queryRunner.query(`ALTER TABLE "roles" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "roles" ADD "permissions" jsonb NOT NULL DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE "roles" ADD "is_system" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "users" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "users" ADD "role_id" uuid NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ADD "last_login" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "deleted_at" TIMESTAMP WITH TIME ZONE`
    );
    await queryRunner.query(`ALTER TABLE "notifications" ADD "data" jsonb`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD "read_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "created_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "created_at" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "updated_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "updated_at" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "roles_name_key"`);
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "name"`);
    await queryRunner.query(`ALTER TABLE "roles" ADD "name" character varying(100) NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "roles" ADD CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name")`
    );
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updated_at" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "is_active" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "created_at" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DEFAULT now()`
    );
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "user_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "is_read" SET NOT NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "tags" ADD CONSTRAINT "FK_59f9e4a563370c700df66e956ac" FOREIGN KEY ("plc_id") REFERENCES "plcs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "tags" ADD CONSTRAINT "FK_32f027a90ce9c91c9b8ff830d22" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "tags" ADD CONSTRAINT "FK_f670cc12e5c02adf1b4c86ee3e0" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "plcs" ADD CONSTRAINT "FK_4a03891dfcbcf54b8b311c5c569" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "plcs" ADD CONSTRAINT "FK_637b0ca84526be30651042912e9" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "plcs" ADD CONSTRAINT "FK_e15f927e2bf857af5fc3899363b" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "equipment" ADD CONSTRAINT "FK_d415344ce555c00e515f78520c8" FOREIGN KEY ("cell_id") REFERENCES "cells"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "equipment" ADD CONSTRAINT "FK_f8739684ed38104714d5a28a180" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "equipment" ADD CONSTRAINT "FK_5485f90b50e508c8fc6bfc07c1d" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cells" ADD CONSTRAINT "FK_8dd6e4da28e2a2b71c3ea5e8ea3" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cells" ADD CONSTRAINT "FK_ffe2c573a2a23ad507b3ff27084" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cells" ADD CONSTRAINT "FK_1d1a90a47be7942250759e3af05" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "sites" ADD CONSTRAINT "FK_e2a9a2377348da2183f26b38fa1" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "sites" ADD CONSTRAINT "FK_924cbb76316cb81be8f40927082" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop import_history table and related objects
    // Drop all update triggers we created
    const tablesToDropTriggers = [
      'import_history',
      'tags',
      'plcs',
      'equipment',
      'cells',
      'sites',
      'audit_logs',
      'users',
      'roles',
      'notifications',
    ];

    for (const table of tablesToDropTriggers) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table}`);
    }
    await queryRunner.query(`DROP INDEX IF EXISTS idx_import_history_started_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_import_history_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_import_history_user`);
    await queryRunner.query(`DROP TABLE IF EXISTS import_history`);

    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0"`
    );
    await queryRunner.query(`ALTER TABLE "sites" DROP CONSTRAINT "FK_924cbb76316cb81be8f40927082"`);
    await queryRunner.query(`ALTER TABLE "sites" DROP CONSTRAINT "FK_e2a9a2377348da2183f26b38fa1"`);
    await queryRunner.query(`ALTER TABLE "cells" DROP CONSTRAINT "FK_1d1a90a47be7942250759e3af05"`);
    await queryRunner.query(`ALTER TABLE "cells" DROP CONSTRAINT "FK_ffe2c573a2a23ad507b3ff27084"`);
    await queryRunner.query(`ALTER TABLE "cells" DROP CONSTRAINT "FK_8dd6e4da28e2a2b71c3ea5e8ea3"`);
    await queryRunner.query(
      `ALTER TABLE "equipment" DROP CONSTRAINT "FK_5485f90b50e508c8fc6bfc07c1d"`
    );
    await queryRunner.query(
      `ALTER TABLE "equipment" DROP CONSTRAINT "FK_f8739684ed38104714d5a28a180"`
    );
    await queryRunner.query(
      `ALTER TABLE "equipment" DROP CONSTRAINT "FK_d415344ce555c00e515f78520c8"`
    );
    await queryRunner.query(`ALTER TABLE "plcs" DROP CONSTRAINT "FK_e15f927e2bf857af5fc3899363b"`);
    await queryRunner.query(`ALTER TABLE "plcs" DROP CONSTRAINT "FK_637b0ca84526be30651042912e9"`);
    await queryRunner.query(`ALTER TABLE "plcs" DROP CONSTRAINT "FK_4a03891dfcbcf54b8b311c5c569"`);
    await queryRunner.query(`ALTER TABLE "tags" DROP CONSTRAINT "FK_f670cc12e5c02adf1b4c86ee3e0"`);
    await queryRunner.query(`ALTER TABLE "tags" DROP CONSTRAINT "FK_32f027a90ce9c91c9b8ff830d22"`);
    await queryRunner.query(`ALTER TABLE "tags" DROP CONSTRAINT "FK_59f9e4a563370c700df66e956ac"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`);
    await queryRunner.query(`DROP INDEX "core"."IDX_97672ac88f789774dd47f7c8be"`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "is_read" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "user_id" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "notifications" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`
    );
    await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "created_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "is_active" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`
    );
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updated_at" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`
    );
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "created_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7"`);
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "name"`);
    await queryRunner.query(`ALTER TABLE "roles" ADD "name" character varying(50) NOT NULL`);
    await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "roles_name_key" UNIQUE ("name")`);
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP`
    );
    await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "updated_at" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`
    );
    await queryRunner.query(`ALTER TABLE "roles" ALTER COLUMN "created_at" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "read_at"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "data"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_login"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "is_system"`);
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "permissions"`);
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "deleted_at"`);
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "expires_at" TIMESTAMP WITH TIME ZONE`
    );
    await queryRunner.query(`ALTER TABLE "notifications" ADD "action_url" text`);
    await queryRunner.query(`ALTER TABLE "users" ADD "last_login_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "users" ADD "username" character varying(50) NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "users_username_key" UNIQUE ("username")`
    );
    await queryRunner.query(`ALTER TABLE "roles" ADD "is_system_role" boolean DEFAULT false`);
    await queryRunner.query(`DROP INDEX "core"."IDX_45575c290a2b47aa366e853d07"`);
    await queryRunner.query(`DROP INDEX "core"."IDX_4bbe32b3f6fca66f54509fe57e"`);
    await queryRunner.query(`DROP INDEX "core"."IDX_88dcc148d532384790ab874c3d"`);
    await queryRunner.query(`DROP INDEX "core"."IDX_cee5459245f652b75eb2759b4c"`);
    await queryRunner.query(`DROP INDEX "core"."IDX_ddc1431fb26a7b342e84e498f8"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "core"."audit_logs_risk_level_enum"`);
    await queryRunner.query(`DROP TYPE "core"."audit_logs_action_enum"`);
    await queryRunner.query(`DROP INDEX "core"."IDX_7a7dbd4513de54a315d97e1a7d"`);
    await queryRunner.query(`DROP TABLE "sites"`);
    await queryRunner.query(`DROP INDEX "core"."IDX_bd9a7457cfaaff0fe8fd5956de"`);
    await queryRunner.query(`DROP TABLE "cells"`);
    await queryRunner.query(`DROP TABLE "equipment"`);
    await queryRunner.query(`DROP TYPE "core"."equipment_equipment_type_enum"`);
    await queryRunner.query(`DROP INDEX "core"."IDX_b3993f607ad48095c2e3db3958"`);
    await queryRunner.query(`DROP INDEX "core"."IDX_e537f8f18e965dc370e3b33345"`);
    await queryRunner.query(`DROP INDEX "core"."IDX_d88f7fdeaa85935fbccc6aade5"`);
    await queryRunner.query(`DROP TABLE "plcs"`);
    await queryRunner.query(`DROP INDEX "core"."IDX_d8cef3790946b71d36f4cb19ac"`);
    await queryRunner.query(`DROP TABLE "tags"`);
    await queryRunner.query(`DROP TYPE "core"."tags_data_type_enum"`);
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "notifications_type_check" CHECK (((type)::text = ANY ((ARRAY['info'::character varying, 'warning'::character varying, 'error'::character varying, 'success'::character varying])::text[])))`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_unread" ON "notifications" ("is_read", "user_id") WHERE (is_read = false)`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_user" ON "notifications" ("user_id") `
    );
    await queryRunner.query(`CREATE INDEX "idx_users_active" ON "users" ("is_active") `);
    await queryRunner.query(`CREATE INDEX "idx_users_email" ON "users" ("email") `);
    await queryRunner.query(`CREATE INDEX "idx_users_username" ON "users" ("username") `);
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }
}
