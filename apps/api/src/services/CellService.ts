/**
 * Cell Service
 *
 * Business logic layer for all cell operations including CRUD operations,
 * cell statistics, hierarchy management, and comprehensive cell functionality with audit integration.
 */

import { EntityManager } from 'typeorm';
import { Cell } from '../entities/Cell';
import { Site } from '../entities/Site';
import { Equipment } from '../entities/Equipment';
import { logger } from '../config/logger';

export interface CreateCellInput {
  siteId: string;
  name: string;
  lineNumber: string;
}

export interface UpdateCellInput {
  name?: string;
  lineNumber?: string;
}

export interface CellSearchFilters {
  siteId?: string;
  search?: string;
  includeEmpty?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'lineNumber' | 'createdAt' | 'equipmentCount';
  sortOrder?: 'ASC' | 'DESC';
}

export interface CellWithCounts extends Cell {
  equipmentCount: number;
  siteName: string;
}

export interface PaginatedCellResponse {
  data: CellWithCounts[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface CellStatistics {
  totalCells: number;
  totalEquipment: number;
  averageEquipmentPerCell: number;
  cellsWithoutEquipment: number;
  cellsPerSite: Record<string, number>;
}

export interface CellServiceOptions {
  userId: string;
}

export class CellNotFoundError extends Error {
  constructor(cellId: string) {
    super(`Cell with ID '${cellId}' not found`);
    this.name = 'CellNotFoundError';
  }
}

export class CellConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CellConflictError';
  }
}

export class CellValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CellValidationError';
  }
}

export class OptimisticLockingError extends Error {
  constructor() {
    super('Cell was modified by another user. Please refresh and try again.');
    this.name = 'OptimisticLockingError';
  }
}

export class CellService {
  private manager: EntityManager;

  constructor(entityManager?: EntityManager) {
    if (!entityManager) {
      throw new Error('EntityManager is required for CellService initialization');
    }
    this.manager = entityManager;
  }

  /**
   * Create new cell
   */
  async createCell(
    cellData: CreateCellInput,
    options: CellServiceOptions
  ): Promise<CellWithCounts> {
    const { siteId, name, lineNumber } = cellData;
    const { userId } = options;

    // Validate input data
    if (!siteId) {
      throw new CellValidationError('Site ID is required');
    }

    if (!name || !name.trim()) {
      throw new CellValidationError('Cell name is required');
    }

    if (!lineNumber || !lineNumber.trim()) {
      throw new CellValidationError('Line number is required');
    }

    const trimmedName = name.trim();
    const trimmedLineNumber = lineNumber.trim().toUpperCase();

    // Validate name length and format
    if (trimmedName.length > 100) {
      throw new CellValidationError('Cell name must be less than 100 characters');
    }

    // Validate name format
    const nameFormatRegex = /^[a-zA-Z0-9\s_-]+$/;
    if (!nameFormatRegex.test(trimmedName)) {
      throw new CellValidationError(
        'Cell name contains invalid characters; allowed: letters, numbers, spaces, underscores, hyphens'
      );
    }

    // Validate line number length and format
    if (trimmedLineNumber.length > 50) {
      throw new CellValidationError('Line number must be less than 50 characters');
    }

    const lineNumberRegex = /^[A-Z0-9-]+$/;
    if (!lineNumberRegex.test(trimmedLineNumber)) {
      throw new CellValidationError('Line number must be uppercase alphanumeric with hyphens only');
    }

    return await this.manager.transaction(async transactionManager => {
      const cellRepository = transactionManager.getRepository(Cell);
      const siteRepository = transactionManager.getRepository(Site);

      // Verify site exists
      const site = await siteRepository.findOne({ where: { id: siteId } });
      if (!site) {
        throw new CellValidationError(`Site with ID '${siteId}' not found`);
      }

      // Check if line number is unique within the site
      const existingCell = await cellRepository.findOne({
        where: { siteId, lineNumber: trimmedLineNumber },
      });

      if (existingCell) {
        throw new CellConflictError(
          `Line number '${trimmedLineNumber}' already exists in site '${site.name}'`
        );
      }

      // Create cell record
      const cell = cellRepository.create({
        siteId,
        name: trimmedName,
        lineNumber: trimmedLineNumber,
        createdBy: userId,
        updatedBy: userId,
      });

      let savedCell: Cell;
      try {
        savedCell = await cellRepository.save(cell);
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
          throw new CellConflictError(
            `Line number '${trimmedLineNumber}' already exists in this site`
          );
        }
        throw error;
      }

      logger.info('Cell created successfully', {
        cellId: savedCell.id,
        siteId: savedCell.siteId,
        name: savedCell.name,
        lineNumber: savedCell.lineNumber,
        siteName: site.name,
        createdBy: userId,
      });

      // Return cell with counts (0 for new cell)
      return {
        ...savedCell,
        site,
        equipmentCount: 0,
        siteName: site.name,
      } as CellWithCounts;
    });
  }

  /**
   * Get cell by ID with counts
   */
  async getCellById(id: string): Promise<CellWithCounts> {
    const cellRepository = this.manager.getRepository(Cell);
    const equipmentRepository = this.manager.getRepository(Equipment);

    const cell = await cellRepository.findOne({
      where: { id },
      relations: ['site'],
    });

    if (!cell) {
      throw new CellNotFoundError(id);
    }

    // Get equipment count
    const equipmentCount = await equipmentRepository.count({
      where: { cellId: id },
    });

    return {
      ...cell,
      equipmentCount,
      siteName: cell.site.name,
    } as CellWithCounts;
  }

  /**
   * Search cells with pagination and filtering
   */
  async searchCells(filters: CellSearchFilters): Promise<PaginatedCellResponse> {
    const {
      siteId,
      search,
      includeEmpty = true,
      page = 1,
      pageSize = 20,
      sortBy = 'name',
      sortOrder = 'ASC',
    } = filters;

    const cellRepository = this.manager.getRepository(Cell);

    // Build query
    const queryBuilder = cellRepository
      .createQueryBuilder('cell')
      .leftJoinAndSelect('cell.site', 'site')
      .leftJoin('cell.equipment', 'equipment')
      .addSelect('COUNT(DISTINCT equipment.id)', 'equipmentCount')
      .groupBy('cell.id')
      .addGroupBy('cell.siteId')
      .addGroupBy('cell.name')
      .addGroupBy('cell.lineNumber')
      .addGroupBy('cell.createdAt')
      .addGroupBy('cell.updatedAt')
      .addGroupBy('cell.createdBy')
      .addGroupBy('cell.updatedBy')
      .addGroupBy('site.id')
      .addGroupBy('site.name');

    // Add site filter
    if (siteId) {
      queryBuilder.where('cell.siteId = :siteId', { siteId });
    }

    // Add search filter
    if (search) {
      if (siteId) {
        queryBuilder.andWhere(
          '(cell.name ILIKE :search OR cell.lineNumber ILIKE :search OR site.name ILIKE :search)',
          { search: `%${search}%` }
        );
      } else {
        queryBuilder.where(
          '(cell.name ILIKE :search OR cell.lineNumber ILIKE :search OR site.name ILIKE :search)',
          { search: `%${search}%` }
        );
      }
    }

    // Add empty filter
    if (!includeEmpty) {
      queryBuilder.having('COUNT(DISTINCT equipment.id) > 0');
    }

    // Add sorting
    switch (sortBy) {
      case 'equipmentCount':
        queryBuilder.orderBy('equipmentCount', sortOrder);
        break;
      case 'lineNumber':
        queryBuilder.orderBy('cell.lineNumber', sortOrder);
        break;
      case 'createdAt':
        queryBuilder.orderBy('cell.createdAt', sortOrder);
        break;
      default:
        queryBuilder.orderBy('cell.name', sortOrder);
    }

    // Add pagination
    const offset = (page - 1) * pageSize;
    queryBuilder.offset(offset).limit(pageSize);

    const [results, totalItems] = await Promise.all([
      queryBuilder.getRawAndEntities(),
      this.getTotalCellCount(siteId, search, includeEmpty),
    ]);

    const cellsWithCounts: CellWithCounts[] = results.entities.map(
      (cell, index) =>
        ({
          ...cell,
          equipmentCount: parseInt(results.raw[index].equipmentCount) || 0,
          siteName: cell.site.name,
        }) as CellWithCounts
    );

    return {
      data: cellsWithCounts,
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
  private async getTotalCellCount(
    siteId?: string,
    search?: string,
    includeEmpty: boolean = true
  ): Promise<number> {
    const cellRepository = this.manager.getRepository(Cell);

    const queryBuilder = cellRepository.createQueryBuilder('cell').leftJoin('cell.site', 'site');

    if (siteId) {
      queryBuilder.where('cell.siteId = :siteId', { siteId });
    }

    if (search) {
      if (siteId) {
        queryBuilder.andWhere(
          '(cell.name ILIKE :search OR cell.lineNumber ILIKE :search OR site.name ILIKE :search)',
          { search: `%${search}%` }
        );
      } else {
        queryBuilder.where(
          '(cell.name ILIKE :search OR cell.lineNumber ILIKE :search OR site.name ILIKE :search)',
          { search: `%${search}%` }
        );
      }
    }

    if (!includeEmpty) {
      queryBuilder
        .leftJoin('cell.equipment', 'equipment')
        .groupBy('cell.id')
        .having('COUNT(equipment.id) > 0');

      return queryBuilder.getRawMany().then(results => results.length);
    }

    return queryBuilder.getCount();
  }

  /**
   * Get cells by site ID
   */
  async getCellsBySite(siteId: string): Promise<CellWithCounts[]> {
    const result = await this.searchCells({
      siteId,
      page: 1,
      pageSize: 1000, // Large number to get all cells
      sortBy: 'lineNumber',
      sortOrder: 'ASC',
    });

    return result.data;
  }

  /**
   * Update cell with optimistic locking
   */
  async updateCell(
    id: string,
    updateData: UpdateCellInput,
    expectedUpdatedAt: Date,
    options: CellServiceOptions
  ): Promise<CellWithCounts> {
    const { userId } = options;

    return await this.manager.transaction(async transactionManager => {
      const cellRepository = transactionManager.getRepository(Cell);

      // Get current cell to check optimistic locking
      const currentCell = await cellRepository.findOne({
        where: { id },
        relations: ['site'],
      });

      if (!currentCell) {
        throw new CellNotFoundError(id);
      }

      // Check optimistic locking
      if (currentCell.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new OptimisticLockingError();
      }

      // Prepare update data
      const cellUpdateData: Partial<Cell> = {
        updatedBy: userId,
      };

      if (updateData.name !== undefined) {
        const trimmedName = updateData.name.trim();

        // Validate name
        if (!trimmedName) {
          throw new CellValidationError('Cell name is required');
        }

        if (trimmedName.length > 100) {
          throw new CellValidationError('Cell name must be less than 100 characters');
        }

        // Validate name format
        const nameFormatRegex = /^[a-zA-Z0-9\s_-]+$/;
        if (!nameFormatRegex.test(trimmedName)) {
          throw new CellValidationError(
            'Cell name contains invalid characters; allowed: letters, numbers, spaces, underscores, hyphens'
          );
        }

        cellUpdateData.name = trimmedName;
      }

      if (updateData.lineNumber !== undefined) {
        const trimmedLineNumber = updateData.lineNumber.trim().toUpperCase();

        // Validate line number
        if (!trimmedLineNumber) {
          throw new CellValidationError('Line number is required');
        }

        if (trimmedLineNumber.length > 50) {
          throw new CellValidationError('Line number must be less than 50 characters');
        }

        const lineNumberRegex = /^[A-Z0-9-]+$/;
        if (!lineNumberRegex.test(trimmedLineNumber)) {
          throw new CellValidationError(
            'Line number must be uppercase alphanumeric with hyphens only'
          );
        }

        // Check line number uniqueness within site if line number is being changed
        if (trimmedLineNumber !== currentCell.lineNumber) {
          const existingCell = await cellRepository.findOne({
            where: {
              siteId: currentCell.siteId,
              lineNumber: trimmedLineNumber,
            },
          });

          if (existingCell && existingCell.id !== id) {
            throw new CellConflictError(
              `Line number '${trimmedLineNumber}' already exists in this site`
            );
          }
        }

        cellUpdateData.lineNumber = trimmedLineNumber;
      }

      try {
        await cellRepository.update(id, cellUpdateData);
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
          throw new CellConflictError(
            `Line number '${updateData.lineNumber}' already exists in this site`
          );
        }
        throw error;
      }

      logger.info('Cell updated successfully', {
        cellId: id,
        siteId: currentCell.siteId,
        siteName: currentCell.site.name,
        updatedFields: Object.keys(updateData),
        updatedBy: userId,
      });

      // Return updated cell with counts
      return this.getCellById(id);
    });
  }

  /**
   * Delete cell with equipment validation
   */
  async deleteCell(id: string, options: CellServiceOptions): Promise<void> {
    const { userId } = options;

    return await this.manager.transaction(async transactionManager => {
      const cellRepository = transactionManager.getRepository(Cell);
      const equipmentRepository = transactionManager.getRepository(Equipment);

      // Verify cell exists
      const cell = await cellRepository.findOne({
        where: { id },
        relations: ['site'],
      });

      if (!cell) {
        throw new CellNotFoundError(id);
      }

      // Check for dependent equipment
      const equipmentCount = await equipmentRepository.count({
        where: { cellId: id },
      });
      if (equipmentCount > 0) {
        throw new CellConflictError(
          `Cannot delete cell '${cell.name}' because it contains ${equipmentCount} equipment record(s). ` +
            'Delete all equipment first or use cascade delete if intended.'
        );
      }

      // Delete cell
      await cellRepository.delete(id);

      logger.info('Cell deleted successfully', {
        cellId: id,
        siteId: cell.siteId,
        siteName: cell.site.name,
        name: cell.name,
        lineNumber: cell.lineNumber,
        deletedBy: userId,
      });
    });
  }

  /**
   * Get all cells (for dropdown/selection purposes)
   */
  async getAllCells(): Promise<CellWithCounts[]> {
    const result = await this.searchCells({
      page: 1,
      pageSize: 1000, // Large number to get all cells
      sortBy: 'name',
      sortOrder: 'ASC',
    });

    return result.data;
  }

  /**
   * Get cell statistics for dashboard
   */
  async getCellStatistics(): Promise<CellStatistics> {
    const cellRepository = this.manager.getRepository(Cell);
    const equipmentRepository = this.manager.getRepository(Equipment);

    const [totalCells, totalEquipment] = await Promise.all([
      cellRepository.count(),
      equipmentRepository.count(),
    ]);

    // Get cells without equipment
    const cellsWithoutEquipment = await cellRepository
      .createQueryBuilder('cell')
      .leftJoin('cell.equipment', 'equipment')
      .groupBy('cell.id')
      .having('COUNT(equipment.id) = 0')
      .getCount();

    // Get cells per site
    const cellsPerSiteRaw = await cellRepository
      .createQueryBuilder('cell')
      .leftJoin('cell.site', 'site')
      .select('site.name', 'siteName')
      .addSelect('COUNT(cell.id)', 'cellCount')
      .groupBy('site.id')
      .addGroupBy('site.name')
      .getRawMany();

    const cellsPerSite: Record<string, number> = {};
    cellsPerSiteRaw.forEach(row => {
      cellsPerSite[row.siteName] = parseInt(row.cellCount);
    });

    return {
      totalCells,
      totalEquipment,
      averageEquipmentPerCell: totalCells > 0 ? totalEquipment / totalCells : 0,
      cellsWithoutEquipment,
      cellsPerSite,
    };
  }

  /**
   * Validate cell line number uniqueness within site
   */
  async validateCellUniqueness(
    siteId: string,
    lineNumber: string,
    excludeId?: string
  ): Promise<boolean> {
    const cellRepository = this.manager.getRepository(Cell);
    const trimmedLineNumber = lineNumber.trim().toUpperCase();

    const queryBuilder = cellRepository
      .createQueryBuilder('cell')
      .where('cell.siteId = :siteId', { siteId })
      .andWhere('cell.lineNumber = :lineNumber', {
        lineNumber: trimmedLineNumber,
      });

    if (excludeId) {
      queryBuilder.andWhere('cell.id != :excludeId', { excludeId });
    }

    const existingCell = await queryBuilder.getOne();
    return !existingCell;
  }

  /**
   * Get cell suggestions for autocomplete
   */
  async getCellSuggestions(
    siteId: string,
    query: string,
    limit: number = 10
  ): Promise<CellWithCounts[]> {
    if (!query.trim()) {
      return [];
    }

    const result = await this.searchCells({
      siteId,
      search: query,
      page: 1,
      pageSize: limit,
      sortBy: 'lineNumber',
      sortOrder: 'ASC',
    });

    return result.data;
  }

  /**
   * Validate hierarchy integrity - ensure no orphaned cells
   */
  async validateHierarchyIntegrity(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const cellRepository = this.manager.getRepository(Cell);
    const siteRepository = this.manager.getRepository(Site);

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for orphaned cells (cells without valid sites)
    const orphanedCells = await cellRepository
      .createQueryBuilder('cell')
      .leftJoin('cell.site', 'site')
      .where('site.id IS NULL')
      .getMany();

    if (orphanedCells.length > 0) {
      errors.push(`Found ${orphanedCells.length} orphaned cells without valid sites`);
      orphanedCells.forEach(cell => {
        errors.push(`Orphaned cell: ${cell.name} (${cell.lineNumber}) - Site ID: ${cell.siteId}`);
      });
    }

    // Check for duplicate line numbers within sites
    const duplicateLineNumbers = await cellRepository
      .createQueryBuilder('cell')
      .select('cell.siteId', 'siteId')
      .addSelect('cell.lineNumber', 'lineNumber')
      .addSelect('COUNT(*)', 'count')
      .groupBy('cell.siteId')
      .addGroupBy('cell.lineNumber')
      .having('COUNT(*) > 1')
      .getRawMany();

    if (duplicateLineNumbers.length > 0) {
      errors.push(`Found ${duplicateLineNumbers.length} duplicate line numbers within sites`);
      for (const duplicate of duplicateLineNumbers) {
        const site = await siteRepository.findOne({
          where: { id: duplicate.siteId },
        });
        errors.push(
          `Duplicate line number ${duplicate.lineNumber} in site ${site?.name || duplicate.siteId} (${duplicate.count} occurrences)`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
