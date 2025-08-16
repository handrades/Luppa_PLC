/**
 * Equipment Repository
 *
 * Extended TypeORM repository with custom query methods for equipment operations.
 * Provides efficient querying methods with site hierarchy, PLC data, and pagination.
 */

import { EntityManager, Repository } from 'typeorm';
import { Equipment, EquipmentType } from '../entities/Equipment';
import { PLC } from '../entities/PLC';
import { Cell } from '../entities/Cell';
import { EquipmentNotFoundError, OptimisticLockingError } from '../errors/EquipmentError';

export interface EquipmentSearchFilters {
  search?: string;
  siteName?: string;
  cellName?: string;
  equipmentType?: string;
  make?: string;
  model?: string;
  hasIpAddress?: boolean;
  sortBy?: 'name' | 'equipmentType' | 'createdAt' | 'siteName' | 'cellName' | 'make' | 'model';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface EquipmentWithDetails {
  id: string;
  cellId: string;
  name: string;
  equipmentType: EquipmentType;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  cell: Cell & {
    site: {
      id: string;
      name: string;
    };
  };
  plcs: PLC[];
}

export class EquipmentRepository {
  private repository: Repository<Equipment>;

  constructor(entityManager?: EntityManager) {
    if (!entityManager) {
      throw new Error('EntityManager is required for EquipmentRepository initialization');
    }
    this.repository = entityManager.getRepository(Equipment);
  }

  /**
   * Get the underlying TypeORM repository
   */
  getRepository(): Repository<Equipment> {
    return this.repository;
  }

  /**
   * Find equipment with full details including site hierarchy and PLCs
   */
  async findWithDetails(id: string): Promise<EquipmentWithDetails | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['cell', 'cell.site', 'plcs', 'plcs.tags', 'creator', 'updater'],
    }) as Promise<EquipmentWithDetails | null>;
  }

  /**
   * Search equipment with pagination and filtering
   */
  async searchEquipmentWithPagination(
    filters: EquipmentSearchFilters
  ): Promise<PaginatedResponse<EquipmentWithDetails>> {
    const {
      search,
      siteName,
      cellName,
      equipmentType,
      make,
      model,
      hasIpAddress,
      sortBy = 'name',
      sortOrder = 'ASC',
      page = 1,
      pageSize = 50,
    } = filters;

    // Ensure pageSize doesn't exceed maximum
    const actualPageSize = Math.min(pageSize, 100);
    const skip = (page - 1) * actualPageSize;

    let queryBuilder = this.repository
      .createQueryBuilder('equipment')
      .leftJoinAndSelect('equipment.cell', 'cell')
      .leftJoinAndSelect('cell.site', 'site')
      .leftJoinAndSelect('equipment.plcs', 'plcs')
      .leftJoinAndSelect('plcs.tags', 'tags')
      .leftJoinAndSelect('equipment.creator', 'creator')
      .leftJoinAndSelect('equipment.updater', 'updater');

    // Apply search filter across equipment name, description, make, model
    if (search) {
      const searchTerm = `%${search.toLowerCase()}%`;
      queryBuilder = queryBuilder.andWhere(
        '(LOWER(equipment.name) LIKE :search OR LOWER(plcs.description) LIKE :search OR LOWER(plcs.make) LIKE :search OR LOWER(plcs.model) LIKE :search OR LOWER(plcs.tagId) LIKE :search)',
        { search: searchTerm }
      );
    }

    // Apply site filter
    if (siteName) {
      queryBuilder = queryBuilder.andWhere('LOWER(site.name) = LOWER(:siteName)', { siteName });
    }

    // Apply cell filter
    if (cellName) {
      queryBuilder = queryBuilder.andWhere('LOWER(cell.name) = LOWER(:cellName)', { cellName });
    }

    // Apply equipment type filter
    if (equipmentType) {
      queryBuilder = queryBuilder.andWhere('equipment.equipmentType = :equipmentType', {
        equipmentType,
      });
    }

    // Apply make filter
    if (make) {
      queryBuilder = queryBuilder.andWhere('LOWER(plcs.make) = LOWER(:make)', {
        make,
      });
    }

    // Apply model filter
    if (model) {
      queryBuilder = queryBuilder.andWhere('LOWER(plcs.model) = LOWER(:model)', { model });
    }

    // Apply IP address filter
    if (hasIpAddress !== undefined) {
      if (hasIpAddress) {
        queryBuilder = queryBuilder.andWhere('plcs.ipAddress IS NOT NULL');
      } else {
        queryBuilder = queryBuilder.andWhere('plcs.ipAddress IS NULL');
      }
    }

    // Apply sorting
    const sortColumn = this.getSortColumn(sortBy);
    queryBuilder = queryBuilder.orderBy(sortColumn, sortOrder);

    // Get total count and entities together, applying pagination
    // This ensures accurate counting when LEFT JOINs are present
    const [equipment, total] = await queryBuilder.skip(skip).take(actualPageSize).getManyAndCount();

    return {
      data: equipment as EquipmentWithDetails[],
      pagination: {
        page,
        pageSize: actualPageSize,
        total,
        totalPages: Math.ceil(total / actualPageSize),
      },
    };
  }

  /**
   * Find equipment by site
   */
  async findBySite(siteId: string): Promise<EquipmentWithDetails[]> {
    return this.repository.find({
      where: {
        cell: {
          siteId,
        },
      },
      relations: ['cell', 'cell.site', 'plcs', 'plcs.tags'],
      order: {
        name: 'ASC',
      },
    }) as Promise<EquipmentWithDetails[]>;
  }

  /**
   * Find equipment by cell
   */
  async findByCell(cellId: string): Promise<EquipmentWithDetails[]> {
    return this.repository.find({
      where: {
        cellId,
      },
      relations: ['cell', 'cell.site', 'plcs', 'plcs.tags'],
      order: {
        name: 'ASC',
      },
    }) as Promise<EquipmentWithDetails[]>;
  }

  /**
   * Create new equipment
   */
  async createEquipment(equipmentData: Partial<Equipment>): Promise<Equipment> {
    const equipment = this.repository.create(equipmentData);
    return this.repository.save(equipment);
  }

  /**
   * Update equipment by ID with optimistic locking
   */
  async updateEquipment(
    id: string,
    updateData: Partial<Equipment>,
    expectedUpdatedAt: Date
  ): Promise<EquipmentWithDetails> {
    // First, verify the equipment exists and check optimistic locking
    const existingEquipment = await this.repository.findOne({
      where: { id },
    });

    if (!existingEquipment) {
      throw new EquipmentNotFoundError(id);
    }

    // Check optimistic locking
    if (existingEquipment.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new OptimisticLockingError();
    }

    const updateResult = await this.repository.update(id, updateData);

    // Check if any rows were actually updated
    if (updateResult.affected === 0) {
      throw new EquipmentNotFoundError(id);
    }

    const updatedEquipment = await this.findWithDetails(id);
    if (!updatedEquipment) {
      throw new EquipmentNotFoundError(id);
    }

    return updatedEquipment;
  }

  /**
   * Soft delete equipment and cascade to related PLCs (add deletedAt timestamp)
   */
  async softDeleteEquipment(id: string): Promise<void> {
    await this.repository.manager.transaction(async transactionManager => {
      const equipmentRepository = transactionManager.getRepository(Equipment);
      const plcRepository = transactionManager.getRepository(PLC);

      // First verify equipment exists
      const equipment = await equipmentRepository.findOne({
        where: { id },
      });

      if (!equipment) {
        throw new EquipmentNotFoundError(id);
      }

      // Soft delete the equipment
      const deleteResult = await equipmentRepository.softDelete(id);

      if (deleteResult.affected === 0) {
        throw new EquipmentNotFoundError(id);
      }

      // Cascade soft-delete to related PLCs
      await plcRepository.update({ equipmentId: id }, { deletedAt: new Date() });
    });
  }

  /**
   * Check if equipment name exists in the same cell
   */
  async nameExistsInCell(
    name: string,
    cellId: string,
    excludeEquipmentId?: string
  ): Promise<boolean> {
    let queryBuilder = this.repository
      .createQueryBuilder('equipment')
      .where('LOWER(equipment.name) = LOWER(:name)', { name: name.trim() })
      .andWhere('equipment.cellId = :cellId', { cellId })
      .andWhere('equipment.deletedAt IS NULL');

    if (excludeEquipmentId) {
      queryBuilder = queryBuilder.andWhere('equipment.id != :equipmentId', {
        equipmentId: excludeEquipmentId,
      });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  /**
   * Get equipment count by cell
   */
  async getEquipmentCountByCell(cellId: string): Promise<number> {
    return this.repository.count({
      where: {
        cellId,
      },
    });
  }

  /**
   * Get equipment count by site
   */
  async getEquipmentCountBySite(siteId: string): Promise<number> {
    return this.repository.count({
      where: {
        cell: {
          siteId,
        },
      },
      relations: ['cell'],
    });
  }

  /**
   * Get all equipment without pagination (for internal operations)
   */
  async findAllWithDetails(): Promise<EquipmentWithDetails[]> {
    return this.repository.find({
      relations: ['cell', 'cell.site', 'plcs', 'plcs.tags'],
      order: {
        name: 'ASC',
      },
    }) as Promise<EquipmentWithDetails[]>;
  }

  /**
   * Get sort column mapping for different sort fields
   */
  private getSortColumn(sortBy: string): string {
    const sortMapping: Record<string, string> = {
      name: 'equipment.name',
      equipmentType: 'equipment.equipmentType',
      createdAt: 'equipment.createdAt',
      siteName: 'site.name',
      cellName: 'cell.name',
      make: 'plcs.make',
      model: 'plcs.model',
    };

    return sortMapping[sortBy] || 'equipment.name';
  }
}
