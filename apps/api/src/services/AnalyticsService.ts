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
        return JSON.parse(cached);
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
          make as label,
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
          type as label,
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
          make,
          model,
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
        (sum: number, item: { count: string }) => sum + parseInt(item.count),
        0
      );

      const topModels: TopModel[] = result.map(
        (item: { make: string; model: string; count: string }) => ({
          make: item.make,
          model: item.model,
          count: parseInt(item.count),
          percentage: (parseInt(item.count) / total) * 100,
        })
      );

      await redisClient.setEx(cacheKey, AnalyticsService.CACHE_TTL, JSON.stringify(topModels));

      return topModels;
    } catch (error) {
      logger.error('Error fetching top models:', error);
      throw error;
    }
  }

  async getHierarchyStatistics(): Promise<HierarchyNode[]> {
    const cacheKey = 'analytics:hierarchy';

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

        const siteNode: HierarchyNode = {
          id: site.id,
          name: site.name,
          type: 'site',
          count: parseInt(site.plc_count),
          children: cells.map(
            (cell: { id: string; name: string; cell_type: string; plc_count: string }) => ({
              id: cell.id,
              name: `${cell.name} (${cell.cell_type})`,
              type: 'cell',
              count: parseInt(cell.plc_count),
              children: [],
            })
          ),
        };

        hierarchy.push(siteNode);
      }

      await redisClient.setEx(cacheKey, AnalyticsService.CACHE_TTL, JSON.stringify(hierarchy));

      return hierarchy;
    } catch (error) {
      logger.error('Error fetching hierarchy statistics:', error);
      throw error;
    }
  }

  async getRecentActivity(limit: number = 20): Promise<RecentActivity[]> {
    const cacheKey = `analytics:activity:${limit}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
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
        LIMIT $1
      `,
        [limit]
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
            AND created_at >= NOW() - INTERVAL '2 weeks'
          GROUP BY week
        )
        SELECT 
          COALESCE(current.count, 0) as current_count,
          COALESCE(previous.count, 0) as previous_count
        FROM (
          SELECT count FROM weekly_counts WHERE week = DATE_TRUNC('week', NOW())
        ) current
        CROSS JOIN (
          SELECT count FROM weekly_counts WHERE week = DATE_TRUNC('week', NOW() - INTERVAL '1 week')
        ) previous
      `);

      if (!result || result.length === 0) {
        return { percentage: 0, direction: 'stable' };
      }

      const currentCount = parseInt(result[0].current_count) || 0;
      const previousCount = parseInt(result[0].previous_count) || 0;

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
    const total = result.reduce((sum, item) => sum + parseInt(item.value), 0);

    const labels: string[] = [];
    const values: number[] = [];
    const percentages: number[] = [];

    result.forEach(item => {
      labels.push(item.label);
      values.push(parseInt(item.value));
      percentages.push(total > 0 ? (parseInt(item.value) / total) * 100 : 0);
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
    const keys = [
      'analytics:overview',
      'analytics:distribution:site',
      'analytics:distribution:make',
      'analytics:distribution:equipment_type',
      'analytics:hierarchy',
    ];

    // Clear top models cache for various limits
    for (let i = 5; i <= 20; i += 5) {
      keys.push(`analytics:top_models:${i}`);
    }

    // Clear activity cache for various limits
    for (let i = 10; i <= 50; i += 10) {
      keys.push(`analytics:activity:${i}`);
    }

    try {
      await Promise.all(keys.map(key => redisClient.del(key)));
      logger.info('Analytics cache cleared');
    } catch (error) {
      logger.error('Error clearing analytics cache:', error);
    }
  }
}

export default new AnalyticsService();
