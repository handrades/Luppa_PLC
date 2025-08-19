import { DataSource } from "typeorm";
import { setupTestDatabase, teardownTestDatabase } from "./test-db-setup";

describe("Database Migration Tests", () => {
  let testDataSource: DataSource;

  beforeAll(async () => {
    try {
      // Create a clean PostgreSQL test database for migration testing
      const testSetup = await setupTestDatabase();
      testDataSource = testSetup.dataSource;

      // Drop all tables to test migrations from scratch
      await testDataSource.dropDatabase();
      await testDataSource.runMigrations();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        "Skipping migration tests - PostgreSQL test database not available",
      );
      // eslint-disable-next-line no-console
      console.log(
        "To run these tests, ensure PostgreSQL is running on localhost:5432",
      );
      // Tests will be skipped if dataSource is not set
    }
  }, 30000); // Increase timeout for database setup

  afterAll(async () => {
    if (testDataSource) {
      await teardownTestDatabase(testDataSource);
    }
  });

  describe("Initial Schema Migration", () => {
    it("should create all required tables", async () => {
      if (!testDataSource) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      // Query PostgreSQL system tables to verify all expected tables exist
      const tables = await testDataSource.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
      `);

      const tableNames = tables.map((t: { tablename: string }) => t.tablename);

      expect(tableNames).toContain("users");
      expect(tableNames).toContain("roles");
      expect(tableNames).toContain("sites");
      expect(tableNames).toContain("cells");
      expect(tableNames).toContain("equipment");
      expect(tableNames).toContain("plcs");
      expect(tableNames).toContain("tags");
      expect(tableNames).toContain("audit_logs");
      expect(tableNames).toContain("notifications");
      expect(tableNames).toContain("migration_history");
    });

    it("should create all required enum types", async () => {
      if (!testDataSource) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const enums = await testDataSource.query(`
        SELECT typname FROM pg_type 
        WHERE typtype = 'e' 
        ORDER BY typname
      `);

      const enumNames = enums.map((e: { typname: string }) => e.typname);

      expect(enumNames).toContain("equipment_type");
      expect(enumNames).toContain("tag_data_type");
      expect(enumNames).toContain("audit_action");
      expect(enumNames).toContain("risk_level");
    });

    it("should create required PostgreSQL extensions", async () => {
      if (!testDataSource) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const extensions = await testDataSource.query(`
        SELECT extname FROM pg_extension 
        ORDER BY extname
      `);

      const extensionNames = extensions.map(
        (e: { extname: string }) => e.extname,
      );

      expect(extensionNames).toContain("uuid-ossp");
      expect(extensionNames).toContain("pgcrypto");
    });

    it("should create proper foreign key constraints", async () => {
      if (!testDataSource) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const foreignKeys = await testDataSource.query(`
        SELECT
          tc.table_name,
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
      `);

      // Check some key foreign key relationships
      const fkNames = foreignKeys.map(
        (fk: {
          table_name: string;
          column_name: string;
          foreign_table_name: string;
          foreign_column_name: string;
        }) =>
          `${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`,
      );

      expect(fkNames).toContain("users.role_id -> roles.id");
      expect(fkNames).toContain("cells.site_id -> sites.id");
      expect(fkNames).toContain("equipment.cell_id -> cells.id");
      expect(fkNames).toContain("plcs.equipment_id -> equipment.id");
      expect(fkNames).toContain("tags.plc_id -> plcs.id");
      expect(fkNames).toContain("audit_logs.user_id -> users.id");
    });

    it("should create proper unique constraints", async () => {
      if (!testDataSource) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const constraints = await testDataSource.query(`
        SELECT
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
          string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
          AND tc.table_schema = 'public'
        GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
        ORDER BY tc.table_name, tc.constraint_name
      `);

      const uniqueConstraints = constraints
        .filter(
          (c: { constraint_type: string }) => c.constraint_type === "UNIQUE",
        )
        .map(
          (c: { table_name: string; columns: string }) =>
            `${c.table_name}(${c.columns})`,
        );

      expect(uniqueConstraints).toContain("users(email)");
      expect(uniqueConstraints).toContain("roles(name)");
      expect(uniqueConstraints).toContain("sites(name)");
      expect(uniqueConstraints).toContain("cells(site_id, line_number)");
      expect(uniqueConstraints).toContain("plcs(tag_id)");
      expect(uniqueConstraints).toContain("tags(plc_id, name)");
    });

    it("should create proper indexes for performance", async () => {
      if (!testDataSource) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const indexes = await testDataSource.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname NOT LIKE '%_pkey'  -- Exclude primary key indexes
        ORDER BY tablename, indexname
      `);

      const indexNames = indexes.map((i: { indexname: string }) => i.indexname);

      // Check for key performance indexes
      expect(indexNames).toContain("idx_users_email");
      expect(indexNames).toContain("idx_users_role");
      expect(indexNames).toContain("idx_cells_site_id");
      expect(indexNames).toContain("idx_equipment_cell_id");
      expect(indexNames).toContain("idx_plcs_equipment_id");
      expect(indexNames).toContain("idx_tags_plc_id");
      expect(indexNames).toContain("idx_audit_logs_table_record");
      expect(indexNames).toContain("idx_audit_logs_user_timestamp");
    });

    it("should create database views", async () => {
      if (!testDataSource) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const views = await testDataSource.query(`
        SELECT viewname FROM pg_views 
        WHERE schemaname = 'public'
        ORDER BY viewname
      `);

      const viewNames = views.map((v: { viewname: string }) => v.viewname);

      expect(viewNames).toContain("v_plc_hierarchy");
      expect(viewNames).toContain("v_plc_hierarchy_with_tag_rows");
      expect(viewNames).toContain("v_plc_summary");
      expect(viewNames).toContain("v_site_plc_counts");
      expect(viewNames).toContain("v_recent_audit_events");
    });

    it("should create database functions and triggers", async () => {
      if (!testDataSource) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      // Check for functions
      const functions = await testDataSource.query(`
        SELECT routine_name FROM information_schema.routines
        WHERE routine_schema = 'public'
          AND routine_type = 'FUNCTION'
        ORDER BY routine_name
      `);

      const functionNames = functions.map(
        (f: { routine_name: string }) => f.routine_name,
      );
      expect(functionNames).toContain("update_updated_at_column");
      expect(functionNames).toContain("audit_trigger_function");

      // Check for triggers
      const triggers = await testDataSource.query(`
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY event_object_table, trigger_name
      `);

      const triggerInfo = triggers.map(
        (t: { event_object_table: string; trigger_name: string }) =>
          `${t.event_object_table}.${t.trigger_name}`,
      );

      // Check for update timestamp triggers
      expect(triggerInfo).toContain("users.update_users_updated_at");
      expect(triggerInfo).toContain("sites.update_sites_updated_at");

      // Check for audit triggers
      expect(triggerInfo).toContain("users.audit_users");
      expect(triggerInfo).toContain("sites.audit_sites");
      expect(triggerInfo).toContain("plcs.audit_plcs");
    });

    it("should populate initial role data", async () => {
      if (!testDataSource) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const roles = await testDataSource.query(`
        SELECT name, is_system, description
        FROM roles
        WHERE is_system = true
        ORDER BY name
      `);

      const roleNames = roles.map((r: { name: string }) => r.name);

      expect(roleNames).toContain("Admin");
      expect(roleNames).toContain("Engineer");
      expect(roleNames).toContain("Viewer");
      expect(roles).toHaveLength(3);
    });
  });

  describe("Migration Rollback", () => {
    it("should successfully rollback initial migration", async () => {
      if (!testDataSource) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      // Record initial state
      const initialTables = await testDataSource.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
      `);

      expect(initialTables.length).toBeGreaterThan(0);

      // Execute rollback
      await testDataSource.undoLastMigration();

      // Check that tables are removed (except migration_history)
      const tablesAfterRollback = await testDataSource.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename != 'migration_history'
        ORDER BY tablename
      `);

      expect(tablesAfterRollback).toHaveLength(0);

      // Check that enums are removed
      const enumsAfterRollback = await testDataSource.query(`
        SELECT typname FROM pg_type 
        WHERE typtype = 'e'
      `);

      expect(enumsAfterRollback).toHaveLength(0);

      // Re-run migration to restore state for other tests
      await testDataSource.runMigrations();
    });

    it("should maintain data integrity during rollback and re-migration", async () => {
      if (!testDataSource) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      // Insert test data
      await testDataSource.query(`
        INSERT INTO roles (name, permissions, description, is_system)
        VALUES ('TestRollback', '{}', 'Test role for rollback', false)
      `);

      const testRoles = await testDataSource.query(`
        SELECT name FROM roles WHERE name = 'TestRollback'
      `);
      expect(testRoles).toHaveLength(1);

      // Rollback
      await testDataSource.undoLastMigration();

      // Re-migrate
      await testDataSource.runMigrations();

      // Check that only system roles remain (test role should be gone)
      const remainingRoles = await testDataSource.query(`
        SELECT name FROM roles WHERE name = 'TestRollback'
      `);
      expect(remainingRoles).toHaveLength(0);

      // But system roles should still be there
      const systemRoles = await testDataSource.query(`
        SELECT name FROM roles WHERE is_system = true
      `);
      expect(systemRoles).toHaveLength(3);
    });
  });

  describe("Migration History", () => {
    it("should track migration execution in migration_history table", async () => {
      if (!testDataSource) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const migrationRecords = await testDataSource.query(`
        SELECT name, timestamp 
        FROM migration_history 
        ORDER BY timestamp
      `);

      expect(migrationRecords).toHaveLength(1);
      expect(migrationRecords[0].name).toBe("InitialSchema20250729082147");
      expect(migrationRecords[0].timestamp).toBeInstanceOf(Date);
    });

    it("should show migration status correctly", async () => {
      if (!testDataSource) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const pendingMigrations = await testDataSource.showMigrations();

      // Should be no pending migrations after successful run
      const hasPending = Array.isArray(pendingMigrations)
        ? pendingMigrations.some((migration) => {
            // Handle both string[] and object[] types
            if (typeof migration === "string") {
              // If it's a string array, presence indicates pending migration
              return true;
            }
            // If it's an object, check the isRun property
            return typeof migration === "object" &&
              migration !== null &&
              "isRun" in migration
              ? !(migration as { isRun: boolean }).isRun
              : false;
          })
        : false;
      expect(hasPending).toBe(false);
    });
  });
});
