/**
 * Equipment Service
 *
 * Business logic layer for all equipment operations including CRUD operations,
 * PLC management, and comprehensive equipment search functionality with audit integration.
 */

import { EntityManager } from 'typeorm';
import { Equipment, EquipmentType } from '../entities/Equipment';
import { PLC } from '../entities/PLC';
import { Cell } from '../entities/Cell';
import {
  EquipmentRepository,
  EquipmentSearchFilters,
  EquipmentWithDetails,
  PaginatedResponse,
} from '../repositories/EquipmentRepository';
import {
  EquipmentConflictError,
  EquipmentNotFoundError,
  EquipmentValidationError,
  OptimisticLockingError,
} from '../errors/EquipmentError';
import { logger } from '../config/logger';

export interface CreateEquipmentInput {
  name: string;
  equipmentType: EquipmentType;
  cellId: string;
  plcData: CreatePLCInput;
}

export interface CreatePLCInput {
  tagId: string;
  description: string;
  make: string;
  model: string;
  ipAddress?: string;
  firmwareVersion?: string;
}

export interface UpdateEquipmentInput {
  name?: string;
  equipmentType?: EquipmentType;
  cellId?: string;
  plcData?: UpdatePLCInput;
}

export interface UpdatePLCInput {
  tagId?: string;
  description?: string;
  make?: string;
  model?: string;
  ipAddress?: string;
  firmwareVersion?: string;
}

export interface EquipmentServiceOptions {
  userId: string;
}

export class EquipmentService {
  private equipmentRepository: EquipmentRepository;
  private manager: EntityManager;

  constructor(entityManager?: EntityManager) {
    if (!entityManager) {
      throw new Error('EntityManager is required for EquipmentService initialization');
    }
    this.manager = entityManager;
    this.equipmentRepository = new EquipmentRepository(entityManager);
  }

  /**
   * Create new equipment with associated PLC record
   */
  async createEquipment(
    equipmentData: CreateEquipmentInput,
    options: EquipmentServiceOptions
  ): Promise<EquipmentWithDetails> {
    const { name, equipmentType, cellId, plcData } = equipmentData;
    const { userId } = options;

    return await this.manager.transaction(async transactionManager => {
      const equipmentRepository = new EquipmentRepository(transactionManager);
      const plcRepository = transactionManager.getRepository(PLC);
      const cellRepository = transactionManager.getRepository(Cell);

      // Verify cell exists
      const cell = await cellRepository.findOne({
        where: { id: cellId },
      });

      if (!cell) {
        throw new EquipmentValidationError(`Cell with ID '${cellId}' not found`);
      }

      // Check if equipment name already exists in the same cell
      const nameExists = await equipmentRepository.nameExistsInCell(name, cellId);
      if (nameExists) {
        throw new EquipmentConflictError(`Equipment name '${name}' already exists in this cell`);
      }

      // Check if PLC tag ID is unique
      const existingPLC = await plcRepository.findOne({
        where: { tagId: plcData.tagId },
      });

      if (existingPLC) {
        throw new EquipmentConflictError(`PLC with tag ID '${plcData.tagId}' already exists`);
      }

      // Check IP address uniqueness if provided
      if (plcData.ipAddress) {
        const existingIPPLC = await plcRepository.findOne({
          where: { ipAddress: plcData.ipAddress },
        });

        if (existingIPPLC) {
          throw new EquipmentConflictError(
            `PLC with IP address '${plcData.ipAddress}' already exists`
          );
        }
      }

      // Create equipment record
      const equipment = await equipmentRepository.createEquipment({
        name,
        equipmentType,
        cellId,
        createdBy: userId,
        updatedBy: userId,
      });

      // Create associated PLC record
      const plc = plcRepository.create({
        equipmentId: equipment.id,
        tagId: plcData.tagId,
        description: plcData.description,
        make: plcData.make,
        model: plcData.model,
        ipAddress: plcData.ipAddress || null,
        firmwareVersion: plcData.firmwareVersion || null,
        createdBy: userId,
        updatedBy: userId,
      });

      try {
        await plcRepository.save(plc);
      } catch (error: unknown) {
        const dbError = error as Error & { code?: string; constraint?: string; detail?: string };
        // Handle database constraint violations (PostgreSQL error code 23505)
        if (dbError.code === '23505') {
          // Parse the constraint name to determine which field caused the conflict
          const constraintName = dbError.constraint;
          if (constraintName?.includes('tag_id') || dbError.detail?.includes('tag_id')) {
            throw new EquipmentConflictError(`PLC with tag ID '${plcData.tagId}' already exists`);
          } else if (
            constraintName?.includes('ip_address') ||
            dbError.detail?.includes('ip_address')
          ) {
            throw new EquipmentConflictError(
              `PLC with IP address '${plcData.ipAddress}' already exists`
            );
          } else {
            throw new EquipmentConflictError('PLC data conflicts with existing record');
          }
        }
        throw error;
      }

      logger.info('Equipment created successfully', {
        equipmentId: equipment.id,
        name: equipment.name,
        equipmentType: equipment.equipmentType,
        cellId: equipment.cellId,
        plcTagId: plc.tagId,
        createdBy: userId,
      });

      // Return equipment with full details
      const createdEquipment = await equipmentRepository.findWithDetails(equipment.id);
      if (!createdEquipment) {
        throw new EquipmentNotFoundError(equipment.id);
      }

      return createdEquipment;
    });
  }

  /**
   * Get equipment by ID with full details
   */
  async getEquipmentById(id: string): Promise<EquipmentWithDetails> {
    const equipment = await this.equipmentRepository.findWithDetails(id);
    if (!equipment) {
      throw new EquipmentNotFoundError(id);
    }
    return equipment;
  }

  /**
   * Search equipment with pagination and filtering
   */
  async searchEquipment(
    filters: EquipmentSearchFilters
  ): Promise<PaginatedResponse<EquipmentWithDetails>> {
    return this.equipmentRepository.searchEquipmentWithPagination(filters);
  }

  /**
   * Update equipment with optimistic locking
   */
  async updateEquipment(
    id: string,
    updateData: UpdateEquipmentInput,
    expectedUpdatedAt: Date,
    options: EquipmentServiceOptions
  ): Promise<EquipmentWithDetails> {
    const { userId } = options;

    return await this.manager.transaction(async transactionManager => {
      const equipmentRepository = new EquipmentRepository(transactionManager);
      const plcRepository = transactionManager.getRepository(PLC);
      const cellRepository = transactionManager.getRepository(Cell);

      // Get current equipment to check optimistic locking
      const currentEquipment = await equipmentRepository.findWithDetails(id);
      if (!currentEquipment) {
        throw new EquipmentNotFoundError(id);
      }

      // Check optimistic locking
      if (currentEquipment.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new OptimisticLockingError();
      }

      // Prepare equipment update data
      const equipmentUpdateData: Partial<Equipment> = {
        updatedBy: userId,
      };

      if (updateData.name !== undefined) {
        // Check name uniqueness in cell if name is being changed
        if (updateData.name !== currentEquipment.name) {
          const nameExists = await equipmentRepository.nameExistsInCell(
            updateData.name,
            updateData.cellId || currentEquipment.cellId,
            id
          );
          if (nameExists) {
            throw new EquipmentConflictError(
              `Equipment name '${updateData.name}' already exists in this cell`
            );
          }
        }
        equipmentUpdateData.name = updateData.name;
      }

      if (updateData.equipmentType !== undefined) {
        equipmentUpdateData.equipmentType = updateData.equipmentType;
      }

      if (updateData.cellId !== undefined) {
        // Verify new cell exists
        const cell = await cellRepository.findOne({
          where: { id: updateData.cellId },
        });

        if (!cell) {
          throw new EquipmentValidationError(`Cell with ID '${updateData.cellId}' not found`);
        }

        // Check name uniqueness in new cell if moving equipment
        if (updateData.cellId !== currentEquipment.cellId) {
          const nameExists = await equipmentRepository.nameExistsInCell(
            updateData.name || currentEquipment.name,
            updateData.cellId,
            id
          );
          if (nameExists) {
            throw new EquipmentConflictError(
              `Equipment name '${updateData.name || currentEquipment.name}' already exists in the target cell`
            );
          }
        }

        equipmentUpdateData.cellId = updateData.cellId;
      }

      // Update equipment record
      await equipmentRepository.updateEquipment(id, equipmentUpdateData, expectedUpdatedAt);

      // Update PLC data if provided
      if (updateData.plcData && currentEquipment.plcs.length > 0) {
        const plc = currentEquipment.plcs[0]; // Assuming one PLC per equipment
        const plcUpdateData: Partial<PLC> = {
          updatedBy: userId,
        };

        if (updateData.plcData.tagId !== undefined) {
          // Check tag ID uniqueness if being changed
          if (updateData.plcData.tagId !== plc.tagId) {
            const existingPLC = await plcRepository.findOne({
              where: { tagId: updateData.plcData.tagId },
            });

            if (existingPLC && existingPLC.id !== plc.id) {
              throw new EquipmentConflictError(
                `PLC with tag ID '${updateData.plcData.tagId}' already exists`
              );
            }
          }
          plcUpdateData.tagId = updateData.plcData.tagId;
        }

        if (updateData.plcData.description !== undefined) {
          plcUpdateData.description = updateData.plcData.description;
        }

        if (updateData.plcData.make !== undefined) {
          plcUpdateData.make = updateData.plcData.make;
        }

        if (updateData.plcData.model !== undefined) {
          plcUpdateData.model = updateData.plcData.model;
        }

        if (updateData.plcData.ipAddress !== undefined) {
          // Check IP address uniqueness if being changed
          if (updateData.plcData.ipAddress && updateData.plcData.ipAddress !== plc.ipAddress) {
            const existingIPPLC = await plcRepository.findOne({
              where: { ipAddress: updateData.plcData.ipAddress },
            });

            if (existingIPPLC && existingIPPLC.id !== plc.id) {
              throw new EquipmentConflictError(
                `PLC with IP address '${updateData.plcData.ipAddress}' already exists`
              );
            }
          }
          plcUpdateData.ipAddress = updateData.plcData.ipAddress || null;
        }

        if (updateData.plcData.firmwareVersion !== undefined) {
          plcUpdateData.firmwareVersion = updateData.plcData.firmwareVersion || null;
        }

        try {
          await plcRepository.update(plc.id, plcUpdateData);
        } catch (error: unknown) {
          const dbError = error as Error & { code?: string; constraint?: string; detail?: string };
          // Handle database constraint violations (PostgreSQL error code 23505)
          if (dbError.code === '23505') {
            // Parse the constraint name to determine which field caused the conflict
            const constraintName = dbError.constraint;
            if (constraintName?.includes('tag_id') || dbError.detail?.includes('tag_id')) {
              throw new EquipmentConflictError(
                `PLC with tag ID '${updateData.plcData.tagId}' already exists`
              );
            } else if (
              constraintName?.includes('ip_address') ||
              dbError.detail?.includes('ip_address')
            ) {
              throw new EquipmentConflictError(
                `PLC with IP address '${updateData.plcData.ipAddress}' already exists`
              );
            } else {
              throw new EquipmentConflictError('PLC data conflicts with existing record');
            }
          }
          throw error;
        }
      }

      logger.info('Equipment updated successfully', {
        equipmentId: id,
        updatedFields: Object.keys(updateData),
        updatedBy: userId,
      });

      // Return updated equipment with full details
      const updatedEquipment = await equipmentRepository.findWithDetails(id);
      if (!updatedEquipment) {
        throw new EquipmentNotFoundError(id);
      }

      return updatedEquipment;
    });
  }

  /**
   * Soft delete equipment (preserves audit trail)
   */
  async deleteEquipment(id: string, options: EquipmentServiceOptions): Promise<void> {
    const { userId } = options;

    // Verify equipment exists
    const equipment = await this.equipmentRepository.findWithDetails(id);
    if (!equipment) {
      throw new EquipmentNotFoundError(id);
    }

    await this.equipmentRepository.softDeleteEquipment(id);

    logger.info('Equipment soft deleted successfully', {
      equipmentId: id,
      name: equipment.name,
      equipmentType: equipment.equipmentType,
      deletedBy: userId,
    });
  }

  /**
   * Get equipment by site
   */
  async getEquipmentBySite(siteId: string): Promise<EquipmentWithDetails[]> {
    return this.equipmentRepository.findBySite(siteId);
  }

  /**
   * Get equipment by cell
   */
  async getEquipmentByCell(cellId: string): Promise<EquipmentWithDetails[]> {
    return this.equipmentRepository.findByCell(cellId);
  }

  /**
   * Get equipment statistics
   */
  async getEquipmentStatistics(): Promise<{
    totalEquipment: number;
    equipmentByType: Partial<Record<EquipmentType, number>>;
    equipmentWithIP: number;
    equipmentWithoutIP: number;
  }> {
    const allEquipment = await this.equipmentRepository.findAllWithDetails();

    const equipmentByType: Partial<Record<EquipmentType, number>> = {};
    allEquipment.forEach(equipment => {
      const count = equipmentByType[equipment.equipmentType] || 0;
      equipmentByType[equipment.equipmentType] = count + 1;
    });

    const equipmentWithIP = allEquipment.filter(
      equipment => equipment.plcs.length > 0 && equipment.plcs[0].ipAddress
    ).length;

    return {
      totalEquipment: allEquipment.length,
      equipmentByType,
      equipmentWithIP,
      equipmentWithoutIP: allEquipment.length - equipmentWithIP,
    };
  }
}
