import { AppDataSource } from '../config/database';
import { Equipment } from '../entities/Equipment';
import { PLC } from '../entities/PLC';
import { Site } from '../entities/Site';
import { Cell } from '../entities/Cell';
import { redisClient } from '../config/redis';
import { logger } from '../config/logger';
import {
  DashboardOverview,
  DistributionData,
  HierarchyNode,
  RecentActivity,
  TopModel,
} from '../types/analytics.types';

export class AnalyticsService {
  private static CACHE_TTL = 300; // 5 minutes
  private static COLORS = [
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#8884D8',
    '#82CA9D',
    '#FFC658',
    '#8DD1E1',
    '#D084D0',
    '#F67280',
  ];

  async getEquipmentOverview(): Promise<DashboardOverview> {
    const cacheKey = 'analytics:overview';

    try {
      // Check cache
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        const overview = JSON.parse(cached);
        // Convert lastUpdated string back to Date
        if (overview.lastUpdated) {
          overview.lastUpdated = new Date(overview.lastUpdated);
        }
        return overview;
      }

      // Get total counts
      const [totalEquipment, totalPLCs, totalSites, totalCells] = await Promise.all([
        AppDataSource.getRepository(Equipment)
          .createQueryBuilder('e')
          .where('e.deleted_at IS NULL')
          .getCount(),

        AppDataSource.getRepository(PLC)
          .createQueryBuilder('p')
          .where('p.deleted_at IS NULL')
          .getCount(),

        AppDataSource.getRepository(Site)
          .createQueryBuilder('s')
          .where('s.deleted_at IS NULL')
          .getCount(),

        AppDataSource.getRepository(Cell)
          .createQueryBuilder('c')
          .where('c.deleted_at IS NULL')
          .getCount(),
      ]);

      // Calculate weekly trend
      const weeklyTrend = await this.calculateWeeklyTrend();

      const overview: DashboardOverview = {
        totalEquipment,
        totalPLCs,
        totalSites,
        totalCells,
        weeklyTrend,
        lastUpdated: new Date(),
      };

      // Cache the result
      await redisClient.setEx(cacheKey, AnalyticsService.CACHE_TTL, JSON.stringify(overview));

      return overview;
    } catch (error) {
      logger.error('Error fetching equipment overview:', error);
      throw error;
    }
  }

  async getDistributionBySite(): Promise<DistributionData> {
    const cacheKey = 'analytics:distribution:site';

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const result = await AppDataSource.query(`
        SELECT 
          s.name as label,
          COUNT(DISTINCT e.id) as value
        FROM plc_inventory.sites s
        LEFT JOIN plc_inventory.cells c ON c.site_id = s.id AND c.deleted_at IS NULL
        LEFT JOIN plc_inventory.equipment e ON e.cell_id = c.id AND e.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
        GROUP BY s.id, s.name
        ORDER BY value DESC
      `);

      const distribution = this.formatDistributionData(result);

      await redisClient.setEx(cacheKey, AnalyticsService.CACHE_TTL, JSON.stringify(distribution));

      return distribution;
    } catch (error) {
      logger.error('Error fetching distribution by site:', error);
      throw error;
    }
  }

  async getDistributionByMake(): Promise<DistributionData> {
    const cacheKey = 'analytics:distribution:make';

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const result = await AppDataSource.query(`
        SELECT 
          COALESCE(make, 'Unknown') as label,
          COUNT(*) as value
        FROM plc_inventory.plcs
        WHERE deleted_at IS NULL
        GROUP BY make
        ORDER BY value DESC
      `);

      const distribution = this.formatDistributionData(result);

      await redisClient.setEx(cacheKey, AnalyticsService.CACHE_TTL, JSON.stringify(distribution));

      return distribution;
    } catch (error) {
      logger.error('Error fetching distribution by make:', error);
      throw error;
    }
  }

  async getDistributionByType(): Promise<DistributionData> {
    const cacheKey = 'analytics:distribution:equipment_type';

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const result = await AppDataSource.query(`
        SELECT 
          COALESCE(type, 'Unknown') as label,
          COUNT(*) as value
        FROM plc_inventory.equipment
        WHERE deleted_at IS NULL
        GROUP BY type
        ORDER BY value DESC
      `);

      const distribution = this.formatDistributionData(result);

      await redisClient.setEx(cacheKey, AnalyticsService.CACHE_TTL, JSON.stringify(distribution));

      return distribution;
    } catch (error) {
      logger.error('Error fetching distribution by equipment type:', error);
      throw error;
    }
  }

  async getTopModels(limit: number = 10): Promise<TopModel[]> {
    const cacheKey = `analytics:top_models:${limit}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const result = await AppDataSource.query(
        `
        SELECT 
          COALESCE(make, 'Unknown') as make,
          COALESCE(model, 'Unknown') as model,
          COUNT(*) as count
        FROM plc_inventory.plcs
        WHERE deleted_at IS NULL
        GROUP BY make, model
        ORDER BY count DESC
        LIMIT $1
      `,
        [limit]
      );

      // Calculate total for percentages
      const total = result.reduce(
        (sum: number, item: { count: string }) => sum + parseInt(item.count, 10),
        0
      );

      const topModels: TopModel[] = result.map(
        (item: { make: string; model: string; count: string }) => {
          const count = parseInt(item.count, 10);
          return {
            make: item.make || 'Unknown',
            model: item.model || 'Unknown',
            count: count,
            percentage: total > 0 ? (count / total) * 100 : 0,
          };
        }
      );

      await redisClient.setEx(cacheKey, AnalyticsService.CACHE_TTL, JSON.stringify(topModels));

      return topModels;
    } catch (error) {
      logger.error('Error fetching top models:', error);
      throw error;
    }
  }

  async getHierarchyStatistics(depth: number = 3): Promise<HierarchyNode[]> {
    const cacheKey = `analytics:hierarchy:${depth}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const sites = await AppDataSource.query(`
        SELECT 
          s.id,
          s.name,
          COUNT(DISTINCT c.id) as cell_count,
          COUNT(DISTINCT e.id) as equipment_count,
          COUNT(DISTINCT p.id) as plc_count
        FROM plc_inventory.sites s
        LEFT JOIN plc_inventory.cells c ON c.site_id = s.id AND c.deleted_at IS NULL
        LEFT JOIN plc_inventory.equipment e ON e.cell_id = c.id AND e.deleted_at IS NULL
        LEFT JOIN plc_inventory.plcs p ON p.equipment_id = e.id AND p.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
        GROUP BY s.id, s.name
        ORDER BY s.name
      `);

      const hierarchy: HierarchyNode[] = [];

      for (const site of sites) {
        const siteNode: HierarchyNode = {
          id: site.id,
          name: site.name,
          type: 'site',
          count: parseInt(site.plc_count),
          children: [],
        };

        // Include cells if depth >= 2
        if (depth >= 2) {
          const cells = await AppDataSource.query(
            `
            SELECT 
              c.id,
              c.name,
              c.cell_type,
              COUNT(DISTINCT e.id) as equipment_count,
              COUNT(DISTINCT p.id) as plc_count
            FROM plc_inventory.cells c
            LEFT JOIN plc_inventory.equipment e ON e.cell_id = c.id AND e.deleted_at IS NULL
            LEFT JOIN plc_inventory.plcs p ON p.equipment_id = e.id AND p.deleted_at IS NULL
            WHERE c.site_id = $1 AND c.deleted_at IS NULL
            GROUP BY c.id, c.name, c.cell_type
            ORDER BY c.name
          `,
            [site.id]
          );

          siteNode.children = cells.map(
            (cell: {
              id: string;
              name: string;
              cell_type: string;
              equipment_count: string;
              plc_count: string;
            }) => {
              const cellNode: HierarchyNode = {
                id: cell.id,
                name: `${cell.name} (${cell.cell_type})`,
                type: 'cell',
                count: parseInt(cell.plc_count),
                children: [],
              };

              // Note: depth 3 would include equipment details
              // For now, we limit to site and cell levels
              return cellNode;
            }
          );
        }

        hierarchy.push(siteNode);
      }

      await redisClient.setEx(cacheKey, AnalyticsService.CACHE_TTL, JSON.stringify(hierarchy));

      return hierarchy;
    } catch (error) {
      logger.error('Error fetching hierarchy statistics:', error);
      throw error;
    }
  }

  async getRecentActivity(limit: number = 20, offset: number = 0): Promise<RecentActivity[]> {
    const cacheKey = `analytics:activity:${limit}:${offset}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        const activities: RecentActivity[] = JSON.parse(cached);
        // Convert timestamp strings back to Date objects
        return activities.map(activity => ({
          ...activity,
          timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date(),
        }));
      }

      const result = await AppDataSource.query(
        `
        SELECT 
          al.id,
          al.action,
          al.entity_type as "entityType",
          al.entity_id as "entityId",
          al.changes,
          al.created_at as timestamp,
          al.user_id as "userId",
          u.username as "userName",
          CASE 
            WHEN al.entity_type = 'plc' THEN (SELECT tag_id FROM plc_inventory.plcs WHERE id = al.entity_id::uuid)
            WHEN al.entity_type = 'equipment' THEN (SELECT name FROM plc_inventory.equipment WHERE id = al.entity_id::uuid)
            WHEN al.entity_type = 'cell' THEN (SELECT name FROM plc_inventory.cells WHERE id = al.entity_id::uuid)
            WHEN al.entity_type = 'site' THEN (SELECT name FROM plc_inventory.sites WHERE id = al.entity_id::uuid)
            ELSE 'Unknown'
          END as "entityName"
        FROM core.audit_logs al
        LEFT JOIN core.users u ON u.id = al.user_id
        WHERE al.entity_type IN ('plc', 'equipment', 'cell', 'site')
        ORDER BY al.created_at DESC
        LIMIT $1 OFFSET $2
      `,
        [limit, offset]
      );

      const activities: RecentActivity[] = result.map(
        (item: {
          id: string;
          action: string;
          entityType: string;
          entityName: string | null;
          userId: string;
          userName: string | null;
          timestamp: string;
          changes: unknown;
        }) => ({
          id: item.id,
          action: this.mapAuditAction(item.action),
          entityType: item.entityType,
          entityName: item.entityName || 'Unknown',
          userId: item.userId,
          userName: item.userName || 'System',
          timestamp: new Date(item.timestamp),
          details: item.changes,
        })
      );

      await redisClient.setEx(cacheKey, AnalyticsService.CACHE_TTL, JSON.stringify(activities));

      return activities;
    } catch (error) {
      logger.error('Error fetching recent activity:', error);
      throw error;
    }
  }

  private async calculateWeeklyTrend(): Promise<{
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  }> {
    try {
      const result = await AppDataSource.query(`
        WITH weekly_counts AS (
          SELECT 
            DATE_TRUNC('week', created_at) as week,
            COUNT(*) as count
          FROM plc_inventory.plcs
          WHERE deleted_at IS NULL
            AND created_at >= DATE_TRUNC('week', NOW() - INTERVAL '1 week')
            AND created_at < DATE_TRUNC('week', NOW()) + INTERVAL '1 week'
          GROUP BY week
        ),
        week_data AS (
          SELECT 
            COALESCE((SELECT count FROM weekly_counts WHERE week = DATE_TRUNC('week', NOW())), 0) as current_count,
            COALESCE((SELECT count FROM weekly_counts WHERE week = DATE_TRUNC('week', NOW() - INTERVAL '1 week')), 0) as previous_count
        )
        SELECT current_count, previous_count FROM week_data
      `);

      if (!result || result.length === 0) {
        return { percentage: 0, direction: 'stable' };
      }

      const currentCount = parseInt(result[0].current_count, 10) || 0;
      const previousCount = parseInt(result[0].previous_count, 10) || 0;

      if (previousCount === 0) {
        if (currentCount > 0) {
          return { percentage: 100, direction: 'up' };
        }
        return { percentage: 0, direction: 'stable' };
      }

      const percentage = ((currentCount - previousCount) / previousCount) * 100;
      const direction = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'stable';

      return {
        percentage: Math.abs(percentage),
        direction,
      };
    } catch (error) {
      logger.error('Error calculating weekly trend:', error);
      return { percentage: 0, direction: 'stable' };
    }
  }

  private formatDistributionData(
    result: Array<{ label: string; value: string }>
  ): DistributionData {
    const total = result.reduce((sum, item) => sum + parseInt(item.value, 10), 0);

    const labels: string[] = [];
    const values: number[] = [];
    const percentages: number[] = [];

    result.forEach(item => {
      const value = parseInt(item.value, 10);
      labels.push(item.label || 'Unknown');
      values.push(value);
      percentages.push(total > 0 ? (value / total) * 100 : 0);
    });

    const colors = labels.map(
      (_, index) => AnalyticsService.COLORS[index % AnalyticsService.COLORS.length]
    );

    return {
      labels,
      values,
      percentages,
      colors,
    };
  }

  private mapAuditAction(action: string): 'create' | 'update' | 'delete' {
    switch (action.toUpperCase()) {
      case 'INSERT':
      case 'CREATE':
        return 'create';
      case 'UPDATE':
      case 'MODIFY':
        return 'update';
      case 'DELETE':
      case 'REMOVE':
        return 'delete';
      default:
        return 'update';
    }
  }

  async clearCache(): Promise<void> {
    try {
      const pattern = 'analytics:*';
      const batchSize = 100;
      let cursor = '0';
      let totalDeleted = 0;

      // Use SCAN to find all matching keys
      do {
        const result = await redisClient.scan(cursor, {
          MATCH: pattern,
          COUNT: batchSize,
        });

        cursor = result.cursor;
        const keys: string[] = result.keys;

        if (keys.length > 0) {
          // Delete keys in batch using UNLINK for non-blocking deletion
          try {
            // Node-redis v4+ expects individual key arguments, not an array
            // TypeScript has issues with spread on dynamic arrays, so we use a workaround
            const unlinkFn = redisClient.unlink.bind(redisClient) as (
              ...args: string[]
            ) => Promise<number>;
            await unlinkFn(...keys);
            totalDeleted += keys.length;
          } catch (unlinkError) {
            // Fallback to DEL if UNLINK is not available
            const delFn = redisClient.del.bind(redisClient) as (
              ...args: string[]
            ) => Promise<number>;
            await delFn(...keys);
            totalDeleted += keys.length;
          }
        }
      } while (cursor !== '0');

      logger.info(`Analytics cache cleared: ${totalDeleted} keys deleted`);
    } catch (error) {
      logger.error('Failed to clear analytics cache:', error);
      throw error;
    }
  }
}

export default new AnalyticsService();
