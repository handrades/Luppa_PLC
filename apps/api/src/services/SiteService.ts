/**
 * Site Service
 *
 * Business logic layer for all site operations including CRUD operations,
 * site statistics, and comprehensive site management functionality with audit integration.
 */

import { EntityManager } from 'typeorm';
import { Site } from '../entities/Site';
import { Cell } from '../entities/Cell';
import { Equipment } from '../entities/Equipment';
import { logger } from '../config/logger';

export interface CreateSiteInput {
  name: string;
}

export interface UpdateSiteInput {
  name?: string;
}

export interface SiteSearchFilters {
  search?: string;
  includeEmpty?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'createdAt' | 'cellCount' | 'equipmentCount';
  sortOrder?: 'ASC' | 'DESC';
}

export interface SiteWithCounts extends Site {
  cellCount: number;
  equipmentCount: number;
}

export interface PaginatedSiteResponse {
  data: SiteWithCounts[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface SiteStatistics {
  totalSites: number;
  totalCells: number;
  totalEquipment: number;
  averageCellsPerSite: number;
  averageEquipmentPerSite: number;
  sitesWithoutCells: number;
  sitesWithoutEquipment: number;
}

export interface SiteServiceOptions {
  userId: string;
}

export class SiteNotFoundError extends Error {
  constructor(siteId: string) {
    super(`Site with ID '${siteId}' not found`);
    this.name = 'SiteNotFoundError';
  }
}

export class SiteConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SiteConflictError';
  }
}

export class SiteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SiteValidationError';
  }
}

export class OptimisticLockingError extends Error {
  constructor() {
    super('Site was modified by another user. Please refresh and try again.');
    this.name = 'OptimisticLockingError';
  }
}

export class SiteService {
  private manager: EntityManager;

  constructor(entityManager?: EntityManager) {
    if (!entityManager) {
      throw new Error('EntityManager is required for SiteService initialization');
    }
    this.manager = entityManager;
  }

  /**
   * Create new site
   */
  async createSite(
    siteData: CreateSiteInput,
    options: SiteServiceOptions
  ): Promise<SiteWithCounts> {
    const { name } = siteData;
    const { userId } = options;

    // Validate site name
    if (!name || !name.trim()) {
      throw new SiteValidationError('Site name is required');
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 100) {
      throw new SiteValidationError('Site name must be less than 100 characters');
    }

    // Check name format (alphanumeric, spaces, hyphens, underscores)
    const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
    if (!nameRegex.test(trimmedName)) {
      throw new SiteValidationError('Site name contains invalid characters');
    }

    return await this.manager.transaction(async transactionManager => {
      const siteRepository = transactionManager.getRepository(Site);

      // Check if site name already exists
      const existingSite = await siteRepository.findOne({
        where: { name: trimmedName },
      });

      if (existingSite) {
        throw new SiteConflictError(`Site name '${trimmedName}' already exists`);
      }

      // Create site record
      const site = siteRepository.create({
        name: trimmedName,
        createdBy: userId,
        updatedBy: userId,
      });

      let savedSite: Site;
      try {
        savedSite = await siteRepository.save(site);
      } catch (error: unknown) {
        const dbError = error as Error & {
          code?: string;
          constraint?: string;
          detail?: string;
        };

        // Handle database constraint violations
        if (
          dbError.code === '23505' ||
          dbError.code === 'SQLITE_CONSTRAINT' ||
          dbError.message?.includes('UNIQUE constraint failed')
        ) {
          throw new SiteConflictError(`Site name '${trimmedName}' already exists`);
        }
        throw error;
      }

      logger.info('Site created successfully', {
        siteId: savedSite.id,
        name: savedSite.name,
        createdBy: userId,
      });

      // Return site with counts (0 for new site)
      return {
        ...savedSite,
        cellCount: 0,
        equipmentCount: 0,
      } as SiteWithCounts;
    });
  }

  /**
   * Get site by ID with counts
   */
  async getSiteById(id: string): Promise<SiteWithCounts> {
    const siteRepository = this.manager.getRepository(Site);
    const cellRepository = this.manager.getRepository(Cell);
    const equipmentRepository = this.manager.getRepository(Equipment);

    const site = await siteRepository.findOne({ where: { id } });
    if (!site) {
      throw new SiteNotFoundError(id);
    }

    // Get counts
    const cellCount = await cellRepository.count({ where: { siteId: id } });
    const equipmentCount = await equipmentRepository
      .createQueryBuilder('equipment')
      .innerJoin('equipment.cell', 'cell')
      .where('cell.siteId = :siteId', { siteId: id })
      .getCount();

    return {
      ...site,
      cellCount,
      equipmentCount,
    } as SiteWithCounts;
  }

  /**
   * Search sites with pagination and filtering
   */
  async searchSites(filters: SiteSearchFilters): Promise<PaginatedSiteResponse> {
    const {
      search,
      includeEmpty = true,
      page = 1,
      pageSize = 20,
      sortBy = 'name',
      sortOrder = 'ASC',
    } = filters;

    const siteRepository = this.manager.getRepository(Site);

    // Build query
    const queryBuilder = siteRepository
      .createQueryBuilder('site')
      .leftJoinAndSelect('site.cells', 'cell')
      .leftJoin('cell.equipment', 'equipment')
      .addSelect('COUNT(DISTINCT cell.id)', 'cellCount')
      .addSelect('COUNT(DISTINCT equipment.id)', 'equipmentCount')
      .groupBy('site.id')
      .addGroupBy('site.name')
      .addGroupBy('site.createdAt')
      .addGroupBy('site.updatedAt')
      .addGroupBy('site.createdBy')
      .addGroupBy('site.updatedBy');

    // Add search filter
    if (search) {
      queryBuilder.where('site.name ILIKE :search', { search: `%${search}%` });
    }

    // Add empty filter
    if (!includeEmpty) {
      queryBuilder.having('COUNT(DISTINCT equipment.id) > 0');
    }

    // Add sorting
    switch (sortBy) {
      case 'cellCount':
        queryBuilder.orderBy('cellCount', sortOrder);
        break;
      case 'equipmentCount':
        queryBuilder.orderBy('equipmentCount', sortOrder);
        break;
      case 'createdAt':
        queryBuilder.orderBy('site.createdAt', sortOrder);
        break;
      default:
        queryBuilder.orderBy('site.name', sortOrder);
    }

    // Add pagination
    const offset = (page - 1) * pageSize;
    queryBuilder.offset(offset).limit(pageSize);

    const [results, totalItems] = await Promise.all([
      queryBuilder.getRawAndEntities(),
      this.getTotalSiteCount(search, includeEmpty),
    ]);

    const sitesWithCounts: SiteWithCounts[] = results.entities.map(
      (site, index) =>
        ({
          ...site,
          cellCount: parseInt(results.raw[index].cellCount) || 0,
          equipmentCount: parseInt(results.raw[index].equipmentCount) || 0,
        }) as SiteWithCounts
    );

    return {
      data: sitesWithCounts,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  /**
   * Get total count for pagination
   */
  private async getTotalSiteCount(search?: string, includeEmpty: boolean = true): Promise<number> {
    const siteRepository = this.manager.getRepository(Site);

    const queryBuilder = siteRepository.createQueryBuilder('site');

    if (search) {
      queryBuilder.where('site.name ILIKE :search', { search: `%${search}%` });
    }

    if (!includeEmpty) {
      queryBuilder
        .leftJoin('site.cells', 'cell')
        .leftJoin('cell.equipment', 'equipment')
        .having('COUNT(DISTINCT equipment.id) > 0')
        .groupBy('site.id');
    }

    return includeEmpty
      ? queryBuilder.getCount()
      : queryBuilder.getRawMany().then(results => results.length);
  }

  /**
   * Update site with optimistic locking
   */
  async updateSite(
    id: string,
    updateData: UpdateSiteInput,
    expectedUpdatedAt: Date,
    options: SiteServiceOptions
  ): Promise<SiteWithCounts> {
    const { userId } = options;

    return await this.manager.transaction(async transactionManager => {
      const siteRepository = transactionManager.getRepository(Site);

      // Get current site to check optimistic locking
      const currentSite = await siteRepository.findOne({ where: { id } });
      if (!currentSite) {
        throw new SiteNotFoundError(id);
      }

      // Check optimistic locking
      if (currentSite.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new OptimisticLockingError();
      }

      // Prepare update data
      const siteUpdateData: Partial<Site> = {
        updatedBy: userId,
      };

      if (updateData.name !== undefined) {
        const trimmedName = updateData.name.trim();

        // Validate name
        if (!trimmedName) {
          throw new SiteValidationError('Site name is required');
        }

        if (trimmedName.length > 100) {
          throw new SiteValidationError('Site name must be less than 100 characters');
        }

        const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
        if (!nameRegex.test(trimmedName)) {
          throw new SiteValidationError('Site name contains invalid characters');
        }

        // Check name uniqueness if name is being changed
        if (trimmedName !== currentSite.name) {
          const existingSite = await siteRepository.findOne({
            where: { name: trimmedName },
          });

          if (existingSite) {
            throw new SiteConflictError(`Site name '${trimmedName}' already exists`);
          }
        }

        siteUpdateData.name = trimmedName;
      }

      try {
        await siteRepository.update(id, siteUpdateData);
      } catch (error: unknown) {
        const dbError = error as Error & {
          code?: string;
          constraint?: string;
          detail?: string;
        };

        // Handle database constraint violations
        if (
          dbError.code === '23505' ||
          dbError.code === 'SQLITE_CONSTRAINT' ||
          dbError.message?.includes('UNIQUE constraint failed')
        ) {
          throw new SiteConflictError(`Site name '${updateData.name}' already exists`);
        }
        throw error;
      }

      logger.info('Site updated successfully', {
        siteId: id,
        updatedFields: Object.keys(updateData),
        updatedBy: userId,
      });

      // Return updated site with counts
      return this.getSiteById(id);
    });
  }

  /**
   * Delete site with cascade validation
   */
  async deleteSite(id: string, options: SiteServiceOptions): Promise<void> {
    const { userId } = options;

    return await this.manager.transaction(async transactionManager => {
      const siteRepository = transactionManager.getRepository(Site);
      const cellRepository = transactionManager.getRepository(Cell);

      // Verify site exists
      const site = await siteRepository.findOne({ where: { id } });
      if (!site) {
        throw new SiteNotFoundError(id);
      }

      // Check for dependent cells
      const cellCount = await cellRepository.count({ where: { siteId: id } });
      if (cellCount > 0) {
        throw new SiteConflictError(
          `Cannot delete site '${site.name}' because it contains ${cellCount} cell(s). ` +
            'Delete all cells first or use cascade delete if intended.'
        );
      }

      // Delete site
      await siteRepository.delete(id);

      logger.info('Site deleted successfully', {
        siteId: id,
        name: site.name,
        deletedBy: userId,
      });
    });
  }

  /**
   * Get all sites (for dropdown/selection purposes)
   */
  async getAllSites(): Promise<SiteWithCounts[]> {
    const result = await this.searchSites({
      page: 1,
      pageSize: 1000, // Large number to get all sites
      sortBy: 'name',
      sortOrder: 'ASC',
    });

    return result.data;
  }

  /**
   * Get site statistics for dashboard
   */
  async getSiteStatistics(): Promise<SiteStatistics> {
    const siteRepository = this.manager.getRepository(Site);
    const cellRepository = this.manager.getRepository(Cell);
    const equipmentRepository = this.manager.getRepository(Equipment);

    const [totalSites, totalCells, totalEquipment] = await Promise.all([
      siteRepository.count(),
      cellRepository.count(),
      equipmentRepository.count(),
    ]);

    // Get sites without cells
    const sitesWithoutCells = await siteRepository
      .createQueryBuilder('site')
      .leftJoin('site.cells', 'cell')
      .where('cell.id IS NULL')
      .getCount();

    // Get sites without equipment
    const sitesWithoutEquipment = await siteRepository
      .createQueryBuilder('site')
      .leftJoin('site.cells', 'cell')
      .leftJoin('cell.equipment', 'equipment')
      .groupBy('site.id')
      .having('COUNT(equipment.id) = 0')
      .getCount();

    return {
      totalSites,
      totalCells,
      totalEquipment,
      averageCellsPerSite: totalSites > 0 ? totalCells / totalSites : 0,
      averageEquipmentPerSite: totalSites > 0 ? totalEquipment / totalSites : 0,
      sitesWithoutCells,
      sitesWithoutEquipment,
    };
  }

  /**
   * Validate site name uniqueness
   */
  async validateSiteUniqueness(name: string, excludeId?: string): Promise<boolean> {
    const siteRepository = this.manager.getRepository(Site);
    const trimmedName = name.trim();

    const queryBuilder = siteRepository
      .createQueryBuilder('site')
      .where('site.name = :name', { name: trimmedName });

    if (excludeId) {
      queryBuilder.andWhere('site.id != :excludeId', { excludeId });
    }

    const existingSite = await queryBuilder.getOne();
    return !existingSite;
  }

  /**
   * Get site suggestions for autocomplete
   */
  async getSiteSuggestions(query: string, limit: number = 10): Promise<SiteWithCounts[]> {
    if (!query.trim()) {
      return [];
    }

    const result = await this.searchSites({
      search: query,
      page: 1,
      pageSize: limit,
      sortBy: 'name',
      sortOrder: 'ASC',
    });

    return result.data;
  }
}
