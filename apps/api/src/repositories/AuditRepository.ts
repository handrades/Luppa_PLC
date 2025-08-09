import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuditAction, AuditLog, RiskLevel } from '../entities/AuditLog';
import { AppDataSource } from '../config/database';
import { AuditImmutabilityError } from '../utils/auditErrors';

/**
 * Read-only repository for audit logs
 * Provides query methods with no update/delete capabilities to maintain immutability
 */
export class AuditRepository {
  private repository: Repository<AuditLog>;

  constructor() {
    this.repository = AppDataSource.getRepository(AuditLog);
  }

  /**
   * Get repository instance for dependency injection compatibility
   */
  getRepository(): Repository<AuditLog> {
    return this.repository;
  }

  /**
   * Find audit logs with pagination and filtering
   */
  async findAuditLogs(options: AuditQueryOptions): Promise<AuditQueryResult> {
    const {
      page = 1,
      pageSize = 50,
      userId,
      startDate,
      endDate,
      action,
      tableName,
      riskLevel,
      search,
    } = options;

    // Validate pagination parameters
    const validatedPageSize = Math.min(Math.max(pageSize, 1), 100);
    const offset = (Math.max(page, 1) - 1) * validatedPageSize;

    // Build query
    let queryBuilder = this.repository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .orderBy('audit.timestamp', 'DESC');

    // Apply filters
    queryBuilder = this.applyFilters(queryBuilder, {
      userId,
      startDate,
      endDate,
      action,
      tableName,
      riskLevel,
      search,
    });

    // Get total count for pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    const auditLogs = await queryBuilder.skip(offset).take(validatedPageSize).getMany();

    // Calculate pagination info
    const totalPages = Math.ceil(total / validatedPageSize);

    return {
      data: auditLogs,
      pagination: {
        page: Math.max(page, 1),
        pageSize: validatedPageSize,
        total,
        totalPages,
      },
    };
  }

  /**
   * Find a single audit log by ID (read-only)
   */
  async findById(id: string): Promise<AuditLog | null> {
    return this.repository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .where('audit.id = :id', { id })
      .getOne();
  }

  /**
   * Get audit statistics for reporting
   */
  async getAuditStatistics(options: AuditStatsOptions): Promise<AuditStatistics> {
    const { startDate, endDate, userId } = options;

    let queryBuilder = this.repository.createQueryBuilder('audit');

    // Apply date range filter
    if (startDate && endDate) {
      queryBuilder = queryBuilder.where('audit.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    // Apply user filter
    if (userId) {
      queryBuilder = queryBuilder.andWhere('audit.userId = :userId', { userId });
    }

    // Get total count
    const totalChanges = await queryBuilder.getCount();

    // Get risk level breakdown
    const riskBreakdown = await queryBuilder
      .select('audit.riskLevel', 'riskLevel')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.riskLevel')
      .getRawMany();

    // Get action breakdown
    const actionBreakdown = await queryBuilder
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action')
      .getRawMany();

    // Get table breakdown
    const tableBreakdown = await queryBuilder
      .select('audit.tableName', 'tableName')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.tableName')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalChanges,
      riskBreakdown: riskBreakdown.reduce(
        (acc, item) => {
          acc[item.riskLevel] = parseInt(item.count);
          return acc;
        },
        {} as Record<string, number>
      ),
      actionBreakdown: actionBreakdown.reduce(
        (acc, item) => {
          acc[item.action] = parseInt(item.count);
          return acc;
        },
        {} as Record<string, number>
      ),
      tableBreakdown: tableBreakdown.map(item => ({
        tableName: item.tableName,
        count: parseInt(item.count),
      })),
    };
  }

  /**
   * Get recent high-risk audit events
   */
  async getHighRiskEvents(limit: number = 50): Promise<AuditLog[]> {
    return this.repository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .where('audit.riskLevel IN (:...riskLevels)', {
        riskLevels: [RiskLevel.HIGH, RiskLevel.CRITICAL],
      })
      .orderBy('audit.timestamp', 'DESC')
      .limit(limit)
      .getMany();
  }

  /**
   * Apply filters to query builder
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<AuditLog>,
    filters: AuditFilters
  ): SelectQueryBuilder<AuditLog> {
    const { userId, startDate, endDate, action, tableName, riskLevel, search } = filters;

    if (userId) {
      queryBuilder = queryBuilder.andWhere('audit.userId = :userId', { userId });
    }

    if (startDate && endDate) {
      queryBuilder = queryBuilder.andWhere('audit.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder = queryBuilder.andWhere('audit.timestamp >= :startDate', {
        startDate,
      });
    } else if (endDate) {
      queryBuilder = queryBuilder.andWhere('audit.timestamp <= :endDate', {
        endDate,
      });
    }

    if (action) {
      queryBuilder = queryBuilder.andWhere('audit.action = :action', { action });
    }

    if (tableName) {
      queryBuilder = queryBuilder.andWhere('audit.tableName = :tableName', {
        tableName,
      });
    }

    if (riskLevel) {
      queryBuilder = queryBuilder.andWhere('audit.riskLevel = :riskLevel', {
        riskLevel,
      });
    }

    if (search) {
      queryBuilder = queryBuilder.andWhere('audit.complianceNotes ILIKE :search', {
        search: `%${search}%`,
      });
    }

    return queryBuilder;
  }

  /**
   * Prevent any update operations - audit logs are immutable
   */
  async update(): Promise<never> {
    throw new AuditImmutabilityError('Audit logs are immutable and cannot be updated');
  }

  /**
   * Prevent any delete operations - audit logs are immutable
   */
  async delete(): Promise<never> {
    throw new AuditImmutabilityError('Audit logs are immutable and cannot be deleted');
  }

  /**
   * Prevent any remove operations - audit logs are immutable
   */
  async remove(): Promise<never> {
    throw new AuditImmutabilityError('Audit logs are immutable and cannot be removed');
  }
}

// Types for query options and results
export interface AuditQueryOptions {
  page?: number;
  pageSize?: number;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  action?: AuditAction;
  tableName?: string;
  riskLevel?: RiskLevel;
  search?: string;
}

export interface AuditQueryResult {
  data: AuditLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditFilters {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  action?: AuditAction;
  tableName?: string;
  riskLevel?: RiskLevel;
  search?: string;
}

export interface AuditStatsOptions {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
}

export interface AuditStatistics {
  totalChanges: number;
  riskBreakdown: Record<string, number>;
  actionBreakdown: Record<string, number>;
  tableBreakdown: Array<{
    tableName: string;
    count: number;
  }>;
}
