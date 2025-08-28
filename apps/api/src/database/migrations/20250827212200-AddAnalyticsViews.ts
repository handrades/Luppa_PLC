import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnalyticsViews1756176000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create materialized view for equipment counts by hierarchy
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS plc_inventory.hierarchy_counts AS
      SELECT 
        s.id as site_id,
        s.name as site_name,
        c.id as cell_id,
        c.name as cell_name,
        c.cell_type,
        e.id as equipment_id,
        e.name as equipment_name,
        e.type as equipment_type,
        COUNT(DISTINCT p.id) as plc_count,
        s.created_at as site_created_at,
        c.created_at as cell_created_at,
        e.created_at as equipment_created_at
      FROM plc_inventory.sites s
      LEFT JOIN plc_inventory.cells c ON c.site_id = s.id AND c.deleted_at IS NULL
      LEFT JOIN plc_inventory.equipment e ON e.cell_id = c.id AND e.deleted_at IS NULL
      LEFT JOIN plc_inventory.plcs p ON p.equipment_id = e.id AND p.deleted_at IS NULL
      WHERE s.deleted_at IS NULL
      GROUP BY s.id, s.name, c.id, c.name, c.cell_type, e.id, e.name, e.type, 
               s.created_at, c.created_at, e.created_at
    `);

    // Create unique index for CONCURRENTLY refresh capability
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_hierarchy_counts_unique 
      ON plc_inventory.hierarchy_counts(site_id, cell_id, equipment_id)
      WHERE site_id IS NOT NULL OR cell_id IS NOT NULL OR equipment_id IS NOT NULL
    `);

    // Create additional indexes for query performance
    await queryRunner.query(`
      CREATE INDEX idx_hierarchy_counts_site_id ON plc_inventory.hierarchy_counts(site_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_hierarchy_counts_cell_id ON plc_inventory.hierarchy_counts(cell_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_hierarchy_counts_equipment_id ON plc_inventory.hierarchy_counts(equipment_id)
    `);

    // Create view for recent activity with user join
    await queryRunner.query(`
      CREATE VIEW plc_inventory.recent_activity AS
      SELECT 
        al.id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.changes,
        al.created_at,
        al.user_id,
        u.username,
        u.email,
        u.first_name,
        u.last_name
      FROM core.audit_logs al
      LEFT JOIN core.users u ON u.id = al.user_id
      WHERE al.entity_type IN ('plc', 'equipment', 'cell', 'site')
      ORDER BY al.created_at DESC
    `);

    // Create indexes for analytics queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_plcs_make ON plc_inventory.plcs(make) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_plcs_model ON plc_inventory.plcs(model) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_plcs_make_model ON plc_inventory.plcs(make, model) WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_equipment_type ON plc_inventory.equipment(type) WHERE deleted_at IS NULL
    `);

    // Create function for trend calculation
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION plc_inventory.calculate_weekly_trend()
      RETURNS TABLE(percentage numeric, direction text) AS $$
      DECLARE
        current_count integer;
        previous_count integer;
        trend_percentage numeric;
      BEGIN
        SELECT COUNT(*) INTO current_count
        FROM plc_inventory.plcs
        WHERE deleted_at IS NULL
          AND created_at >= DATE_TRUNC('week', NOW())
          AND created_at < DATE_TRUNC('week', NOW()) + INTERVAL '1 week';
        
        SELECT COUNT(*) INTO previous_count
        FROM plc_inventory.plcs
        WHERE deleted_at IS NULL
          AND created_at >= DATE_TRUNC('week', NOW() - INTERVAL '1 week')
          AND created_at < DATE_TRUNC('week', NOW());
        
        IF previous_count = 0 THEN
          IF current_count > 0 THEN
            RETURN QUERY SELECT 100.0, 'up'::text;
          ELSE
            RETURN QUERY SELECT 0.0, 'stable'::text;
          END IF;
        ELSE
          trend_percentage := ((current_count - previous_count)::numeric / previous_count) * 100;
          IF trend_percentage > 0 THEN
            RETURN QUERY SELECT ABS(trend_percentage), 'up'::text;
          ELSIF trend_percentage < 0 THEN
            RETURN QUERY SELECT ABS(trend_percentage), 'down'::text;
          ELSE
            RETURN QUERY SELECT 0.0, 'stable'::text;
          END IF;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create refresh function for materialized view
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION plc_inventory.refresh_hierarchy_counts()
      RETURNS void AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY plc_inventory.hierarchy_counts;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS plc_inventory.refresh_hierarchy_counts()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS plc_inventory.calculate_weekly_trend()`);
    await queryRunner.query(`DROP VIEW IF EXISTS plc_inventory.recent_activity`);
    await queryRunner.query(`DROP INDEX IF EXISTS plc_inventory.idx_hierarchy_counts_unique`);
    await queryRunner.query(`DROP INDEX IF EXISTS plc_inventory.idx_hierarchy_counts_site_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS plc_inventory.idx_hierarchy_counts_cell_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS plc_inventory.idx_hierarchy_counts_equipment_id`);
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS plc_inventory.hierarchy_counts`);
    await queryRunner.query(`DROP INDEX IF EXISTS plc_inventory.idx_equipment_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS plc_inventory.idx_plcs_make_model`);
    await queryRunner.query(`DROP INDEX IF EXISTS plc_inventory.idx_plcs_model`);
    await queryRunner.query(`DROP INDEX IF EXISTS plc_inventory.idx_plcs_make`);
  }
}
