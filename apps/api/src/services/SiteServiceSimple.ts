/**
 * Simplified Site Service for testing
 * This works with the actual database schema, not the TypeORM entities
 */

import { EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

export interface SimpleSite {
  id: string;
  site_name: string;
  description?: string;
  location?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class SiteServiceSimple {
  private manager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.manager = entityManager;
  }

  async createSite(data: { name: string; description?: string; location?: string }): Promise<SimpleSite> {
    const id = uuidv4();

    // Insert site directly
    await this.manager.query(
      `INSERT INTO plc_inventory.sites (id, site_name, description, location) 
       VALUES ($1, $2, $3, $4)`,
      [id, data.name, data.description || null, data.location || null]
    );

    // Fetch and return the created site
    const result = await this.manager.query(`SELECT * FROM plc_inventory.sites WHERE id = $1`, [
      id,
    ]);

    const site = result[0];

    // Return the created site
    return site;
  }

  async getSites(params: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{
    data: SimpleSite[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let whereClause = '';
    const queryParams: Array<string | number> = [];

    if (params.search) {
      whereClause = 'WHERE site_name ILIKE $1';
      queryParams.push(`%${params.search}%`);
    }

    // Get sites with count
    const sites = await this.manager.query(
      `SELECT * FROM plc_inventory.sites 
       ${whereClause}
       ORDER BY site_name ASC 
       LIMIT ${pageSize} OFFSET ${offset}`,
      queryParams
    );

    // Get total count
    const countResult = await this.manager.query(
      `SELECT COUNT(*) as count FROM plc_inventory.sites ${whereClause}`,
      queryParams
    );

    const total = parseInt(countResult[0].count, 10);
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: sites,
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getSiteById(id: string): Promise<SimpleSite | null> {
    const result = await this.manager.query(`SELECT * FROM plc_inventory.sites WHERE id = $1`, [
      id,
    ]);

    return result[0] || null;
  }

  async getSiteSuggestions(
    query: string,
    limit: number = 10
  ): Promise<
    Array<{
      id: string;
      name: string;
      cellCount: number;
    }>
  > {
    const result = await this.manager.query(
      `SELECT * FROM plc_inventory.sites 
       WHERE site_name ILIKE $1
       ORDER BY site_name ASC 
       LIMIT $2`,
      [`%${query}%`, limit]
    );

    // Return simple site suggestions
    return result.map((site: SimpleSite) => ({
      id: site.id,
      name: site.site_name,
      cellCount: 0,
    }));
  }

  async updateSite(
    id: string,
    data: {
      site_name?: string;
      description?: string;
      location?: string;
    }
  ): Promise<SimpleSite | null> {
    const updates: string[] = [];
    const values: Array<string | number | null> = [];
    let paramIndex = 1;

    if (data.site_name !== undefined) {
      updates.push(`site_name = $${paramIndex++}`);
      values.push(data.site_name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      values.push(data.location);
    }

    if (updates.length === 0) {
      return this.getSiteById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    await this.manager.query(
      `UPDATE plc_inventory.sites 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}`,
      values
    );

    return this.getSiteById(id);
  }

  async deleteSite(id: string): Promise<void> {
    await this.manager.query(`DELETE FROM plc_inventory.sites WHERE id = $1`, [id]);
  }

  async validateSiteUniqueness(name: string, excludeId?: string): Promise<boolean> {
    const params: Array<string> = [name];
    let query = `SELECT COUNT(*) as count FROM plc_inventory.sites WHERE site_name = $1`;

    if (excludeId) {
      query += ` AND id != $2`;
      params.push(excludeId);
    }

    const result = await this.manager.query(query, params);
    return parseInt(result[0].count, 10) === 0;
  }

  async getSiteStatistics(): Promise<{
    totalSites: number;
    totalCells: number;
    avgCellsPerSite: number;
  }> {
    const result = await this.manager.query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_sites,
        COUNT(DISTINCT c.id) as total_cells
      FROM plc_inventory.sites s
      LEFT JOIN plc_inventory.cells c ON c.site_id = s.id
    `);

    return {
      totalSites: parseInt(result[0].total_sites, 10),
      totalCells: parseInt(result[0].total_cells, 10),
      avgCellsPerSite:
        result[0].total_sites > 0
          ? Math.round((result[0].total_cells / result[0].total_sites) * 100) / 100
          : 0,
    };
  }
}
