import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFullTextSearch20250820000000 implements MigrationInterface {
  name = 'AddFullTextSearch20250820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable PostgreSQL full-text search extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "unaccent"`);

    // Add search_vector column to plcs table
    await queryRunner.query(`ALTER TABLE plcs ADD COLUMN search_vector tsvector`);

    // Create function to update search vector with weighted content
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_plc_search_vector()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector := 
          setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.make, '') || ' ' || COALESCE(NEW.model, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(NEW.tag_id, '')), 'C');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger to automatically update search vector on INSERT/UPDATE
    await queryRunner.query(`
      CREATE TRIGGER update_plcs_search_vector 
      BEFORE INSERT OR UPDATE ON plcs 
      FOR EACH ROW EXECUTE FUNCTION update_plc_search_vector()
    `);

    // Update existing records with search vectors
    await queryRunner.query(`
      UPDATE plcs SET search_vector = 
        setweight(to_tsvector('english', COALESCE(description, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(make, '') || ' ' || COALESCE(model, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(tag_id, '')), 'C')
    `);

    // Create GIN index for search vector (fastest for full-text search)
    await queryRunner.query(`CREATE INDEX idx_plcs_search_vector ON plcs USING GIN(search_vector)`);

    // Create GIN indexes for trigram similarity search (fuzzy matching)
    await queryRunner.query(`CREATE INDEX idx_plcs_description_trgm ON plcs USING GIN(description gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX idx_plcs_make_trgm ON plcs USING GIN(make gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX idx_plcs_model_trgm ON plcs USING GIN(model gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX idx_plcs_tag_id_trgm ON plcs USING GIN(tag_id gin_trgm_ops)`);

    // Create composite indexes for common search patterns
    await queryRunner.query(`CREATE INDEX idx_plcs_make_model_composite ON plcs(make, model)`);
    await queryRunner.query(`CREATE INDEX idx_plcs_description_text ON plcs USING GIN(to_tsvector('english', description))`);

    // Create materialized view for optimized cross-table search
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW mv_equipment_search AS
      SELECT 
        p.id as plc_id,
        p.tag_id,
        p.description as plc_description,
        p.make,
        p.model,
        p.ip_address,
        p.firmware_version,
        p.search_vector as plc_search_vector,
        e.id as equipment_id,
        e.name as equipment_name,
        e.equipment_type,
        c.id as cell_id,
        c.name as cell_name,
        c.line_number,
        s.id as site_id,
        s.name as site_name,
        CONCAT(s.name, ' > ', c.name, ' > ', e.name, ' > ', p.tag_id) as hierarchy_path,
        -- Combined search vector with hierarchy information
        setweight(to_tsvector('english', COALESCE(p.description, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(p.make, '') || ' ' || COALESCE(p.model, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(p.tag_id, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(s.name, '') || ' ' || COALESCE(c.name, '') || ' ' || COALESCE(e.name, '')), 'D') as combined_search_vector,
        -- Extract tags as searchable text
        COALESCE(
          (SELECT string_agg(t.name || ' ' || COALESCE(t.description, ''), ' ')
           FROM tags t WHERE t.plc_id = p.id), 
          ''
        ) as tags_text
      FROM plcs p
      JOIN equipment e ON p.equipment_id = e.id
      JOIN cells c ON e.cell_id = c.id
      JOIN sites s ON c.site_id = s.id
    `);

    // Create indexes on materialized view for optimal search performance
    await queryRunner.query(`CREATE UNIQUE INDEX idx_mv_equipment_search_plc_id ON mv_equipment_search(plc_id)`);
    await queryRunner.query(`CREATE INDEX idx_mv_equipment_search_combined_vector ON mv_equipment_search USING GIN(combined_search_vector)`);
    await queryRunner.query(`CREATE INDEX idx_mv_equipment_search_site_name ON mv_equipment_search(site_name)`);
    await queryRunner.query(`CREATE INDEX idx_mv_equipment_search_equipment_type ON mv_equipment_search(equipment_type)`);
    await queryRunner.query(`CREATE INDEX idx_mv_equipment_search_make_model ON mv_equipment_search(make, model)`);

    // Create function to refresh materialized view
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION refresh_equipment_search_view()
      RETURNS void AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_equipment_search;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create function to refresh search view when PLCs or related data changes
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trigger_refresh_search_view()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Use pg_notify to signal for async refresh (production optimization)
        PERFORM pg_notify('refresh_search_view', '');
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create triggers to refresh materialized view on data changes
    await queryRunner.query(`
      CREATE TRIGGER refresh_search_on_plc_change 
      AFTER INSERT OR UPDATE OR DELETE ON plcs 
      FOR EACH ROW EXECUTE FUNCTION trigger_refresh_search_view()
    `);

    await queryRunner.query(`
      CREATE TRIGGER refresh_search_on_equipment_change 
      AFTER INSERT OR UPDATE OR DELETE ON equipment 
      FOR EACH ROW EXECUTE FUNCTION trigger_refresh_search_view()
    `);

    await queryRunner.query(`
      CREATE TRIGGER refresh_search_on_cell_change 
      AFTER INSERT OR UPDATE OR DELETE ON cells 
      FOR EACH ROW EXECUTE FUNCTION trigger_refresh_search_view()
    `);

    await queryRunner.query(`
      CREATE TRIGGER refresh_search_on_site_change 
      AFTER INSERT OR UPDATE OR DELETE ON sites 
      FOR EACH ROW EXECUTE FUNCTION trigger_refresh_search_view()
    `);

    await queryRunner.query(`
      CREATE TRIGGER refresh_search_on_tag_change 
      AFTER INSERT OR UPDATE OR DELETE ON tags 
      FOR EACH ROW EXECUTE FUNCTION trigger_refresh_search_view()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS refresh_search_on_tag_change ON tags`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS refresh_search_on_site_change ON sites`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS refresh_search_on_cell_change ON cells`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS refresh_search_on_equipment_change ON equipment`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS refresh_search_on_plc_change ON plcs`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_plcs_search_vector ON plcs`);

    // Drop functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS trigger_refresh_search_view()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS refresh_equipment_search_view()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_plc_search_vector()`);

    // Drop materialized view and indexes
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS mv_equipment_search`);

    // Drop search indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_plcs_description_text`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_plcs_make_model_composite`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_plcs_tag_id_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_plcs_model_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_plcs_make_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_plcs_description_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_plcs_search_vector`);

    // Drop search vector column
    await queryRunner.query(`ALTER TABLE plcs DROP COLUMN IF EXISTS search_vector`);

    // Note: We don't drop extensions as they might be used elsewhere
  }
}
