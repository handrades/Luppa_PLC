/**
 * EquipmentService Test Suite
 *
 * Comprehensive unit tests for equipment business logic operations
 * including CRUD operations, validation, and error handling.
 */

import { EntityManager, Repository } from 'typeorm';
import {
  CreateEquipmentInput,
  EquipmentService,
  UpdateEquipmentInput,
} from '../../services/EquipmentService';
import { EquipmentRepository } from '../../repositories/EquipmentRepository';
import { Equipment, EquipmentType } from '../../entities/Equipment';
import { PLC } from '../../entities/PLC';
import { Cell } from '../../entities/Cell';
// Error types are tested via error messages rather than instanceof checks

// Mock dependencies
jest.mock('../../repositories/EquipmentRepository');
jest.mock('../../config/logger');

describe('EquipmentService', () => {
  let service: EquipmentService;
  let mockEntityManager: jest.Mocked<EntityManager>;
  let mockEquipmentRepository: jest.Mocked<EquipmentRepository>;
  let mockPLCRepository: jest.Mocked<Repository<PLC>>;
  let mockCellRepository: jest.Mocked<Repository<Cell>>;
  let mockTransaction: jest.Mock;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockCellId = '987fcdeb-51a2-43d1-b678-123456789abc';
  const mockEquipmentId = '456e7890-e12b-34d5-a678-901234567def';

  const mockEquipment: Equipment = {
    id: mockEquipmentId,
    name: 'Test Press',
    equipmentType: EquipmentType.PRESS,
    cellId: mockCellId,
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdAt: new Date('2025-08-15T10:00:00.000Z'),
    updatedAt: new Date('2025-08-15T10:00:00.000Z'),
  } as Equipment;

  const mockPLC: PLC = {
    id: '789e1234-e56b-78d9-a012-345678901abc',
    equipmentId: mockEquipmentId,
    tagId: 'PRESS_001',
    description: 'Main hydraulic press PLC',
    make: 'Allen-Bradley',
    model: 'CompactLogix 5370',
    ipAddress: '192.168.1.100',
    firmwareVersion: '33.01',
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdAt: new Date('2025-08-15T10:00:00.000Z'),
    updatedAt: new Date('2025-08-15T10:00:00.000Z'),
  } as PLC;

  const mockCell: Cell = {
    id: mockCellId,
    siteId: '654e3210-e87b-90d1-a234-567890123fed',
    name: 'Assembly Line 1',
    lineNumber: 'LINE-001',
    createdBy: mockUserId,
    updatedBy: mockUserId,
    createdAt: new Date('2025-08-15T09:00:00.000Z'),
    updatedAt: new Date('2025-08-15T09:00:00.000Z'),
  } as Cell;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock EntityManager
    mockTransaction = jest.fn();
    mockPLCRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    mockCellRepository = {
      findOne: jest.fn(),
    };

    mockEntityManager = {
      transaction: mockTransaction,
      getRepository: jest.fn().mockImplementation(entity => {
        if (entity === PLC) return mockPLCRepository;
        if (entity === Cell) return mockCellRepository;
        return null;
      }),
    } as jest.Mocked<EntityManager>;

    // Mock EquipmentRepository
    mockEquipmentRepository = {
      findWithDetails: jest.fn(),
      searchEquipmentWithPagination: jest.fn(),
      nameExistsInCell: jest.fn(),
      createEquipment: jest.fn(),
      updateEquipment: jest.fn(),
      softDeleteEquipment: jest.fn(),
      findBySite: jest.fn(),
      findByCell: jest.fn(),
      findAllWithDetails: jest.fn(),
    } as jest.Mocked<EquipmentRepository>;

    (EquipmentRepository as jest.MockedClass<typeof EquipmentRepository>).mockImplementation(
      () => mockEquipmentRepository
    );

    service = new EquipmentService(mockEntityManager);
  });

  describe('createEquipment', () => {
    const createInput: CreateEquipmentInput = {
      name: 'Test Press',
      equipmentType: EquipmentType.PRESS,
      cellId: mockCellId,
      plcData: {
        tagId: 'PRESS_001',
        description: 'Main hydraulic press PLC',
        make: 'Allen-Bradley',
        model: 'CompactLogix 5370',
        ipAddress: '192.168.1.100',
        firmwareVersion: '33.01',
      },
    };

    it('should successfully create equipment with PLC', async () => {
      // Setup mocks
      mockTransaction.mockImplementation(async callback => callback(mockEntityManager));
      mockCellRepository.findOne.mockResolvedValue(mockCell);
      mockEquipmentRepository.nameExistsInCell.mockResolvedValue(false);
      mockPLCRepository.findOne.mockResolvedValue(null); // Tag ID and IP available
      mockEquipmentRepository.createEquipment.mockResolvedValue(mockEquipment);
      mockPLCRepository.create.mockReturnValue(mockPLC);
      mockPLCRepository.save.mockResolvedValue(mockPLC);

      const mockEquipmentWithDetails = {
        ...mockEquipment,
        cell: mockCell,
        plcs: [mockPLC],
      };
      mockEquipmentRepository.findWithDetails.mockResolvedValue(mockEquipmentWithDetails);

      // Execute
      const result = await service.createEquipment(createInput, { userId: mockUserId });

      // Assert
      expect(result).toEqual(mockEquipmentWithDetails);
      expect(mockCellRepository.findOne).toHaveBeenCalledWith({ where: { id: mockCellId } });
      expect(mockEquipmentRepository.nameExistsInCell).toHaveBeenCalledWith(
        'Test Press',
        mockCellId
      );
      expect(mockPLCRepository.findOne).toHaveBeenCalledWith({ where: { tagId: 'PRESS_001' } });
      expect(mockPLCRepository.findOne).toHaveBeenCalledWith({
        where: { ipAddress: '192.168.1.100' },
      });
      expect(mockEquipmentRepository.createEquipment).toHaveBeenCalledWith({
        name: 'Test Press',
        equipmentType: EquipmentType.PRESS,
        cellId: mockCellId,
        createdBy: mockUserId,
        updatedBy: mockUserId,
      });
    });

    it('should throw error when cell does not exist', async () => {
      // Setup mocks
      mockTransaction.mockImplementation(async callback => callback(mockEntityManager));
      mockCellRepository.findOne.mockResolvedValue(null);

      // Execute & Assert
      await expect(service.createEquipment(createInput, { userId: mockUserId })).rejects.toThrow(
        "Cell with ID '987fcdeb-51a2-43d1-b678-123456789abc' not found"
      );
      expect(mockCellRepository.findOne).toHaveBeenCalledWith({ where: { id: mockCellId } });
    });

    it('should throw error when equipment name already exists in cell', async () => {
      // Setup mocks
      mockTransaction.mockImplementation(async callback => callback(mockEntityManager));
      mockCellRepository.findOne.mockResolvedValue(mockCell);
      mockEquipmentRepository.nameExistsInCell.mockResolvedValue(true);

      // Execute & Assert
      await expect(service.createEquipment(createInput, { userId: mockUserId })).rejects.toThrow(
        "Equipment name 'Test Press' already exists in this cell"
      );
      expect(mockEquipmentRepository.nameExistsInCell).toHaveBeenCalledWith(
        'Test Press',
        mockCellId
      );
    });

    it('should throw error when PLC tag ID already exists', async () => {
      // Setup mocks
      mockTransaction.mockImplementation(async callback => callback(mockEntityManager));
      mockCellRepository.findOne.mockResolvedValue(mockCell);
      mockEquipmentRepository.nameExistsInCell.mockResolvedValue(false);
      mockPLCRepository.findOne.mockImplementation(({ where }) => {
        if (where.tagId) return Promise.resolve(mockPLC);
        return Promise.resolve(null);
      });

      // Execute & Assert
      await expect(service.createEquipment(createInput, { userId: mockUserId })).rejects.toThrow(
        "PLC with tag ID 'PRESS_001' already exists"
      );
    });

    it('should throw error when PLC IP address already exists', async () => {
      // Setup mocks
      mockTransaction.mockImplementation(async callback => callback(mockEntityManager));
      mockCellRepository.findOne.mockResolvedValue(mockCell);
      mockEquipmentRepository.nameExistsInCell.mockResolvedValue(false);
      mockPLCRepository.findOne.mockImplementation(({ where }) => {
        if (where.ipAddress) return Promise.resolve(mockPLC);
        return Promise.resolve(null);
      });

      // Execute & Assert
      await expect(service.createEquipment(createInput, { userId: mockUserId })).rejects.toThrow(
        "PLC with IP address '192.168.1.100' already exists"
      );
    });
  });

  describe('getEquipmentById', () => {
    it('should return equipment when found', async () => {
      // Setup mocks
      const mockEquipmentWithDetails = {
        ...mockEquipment,
        cell: mockCell,
        plcs: [mockPLC],
      };
      mockEquipmentRepository.findWithDetails.mockResolvedValue(mockEquipmentWithDetails);

      // Execute
      const result = await service.getEquipmentById(mockEquipmentId);

      // Assert
      expect(result).toEqual(mockEquipmentWithDetails);
      expect(mockEquipmentRepository.findWithDetails).toHaveBeenCalledWith(mockEquipmentId);
    });

    it('should throw EquipmentNotFoundError when equipment not found', async () => {
      // Setup mocks
      mockEquipmentRepository.findWithDetails.mockResolvedValue(null);

      // Execute & Assert
      await expect(service.getEquipmentById(mockEquipmentId)).rejects.toThrow(
        "Equipment with ID '456e7890-e12b-34d5-a678-901234567def' not found"
      );
    });
  });

  describe('updateEquipment', () => {
    const updateInput: UpdateEquipmentInput = {
      name: 'Updated Press',
      plcData: {
        description: 'Updated description',
        make: 'Siemens',
      },
    };

    const expectedUpdatedAt = new Date('2025-08-15T10:00:00.000Z');

    it('should successfully update equipment', async () => {
      // Setup mocks
      const mockCurrentEquipment = {
        ...mockEquipment,
        cell: mockCell,
        plcs: [mockPLC],
        updatedAt: expectedUpdatedAt,
      };

      const mockUpdatedEquipment = {
        ...mockCurrentEquipment,
        name: 'Updated Press',
        plcs: [
          {
            ...mockPLC,
            description: 'Updated description',
            make: 'Siemens',
          },
        ],
      };

      mockTransaction.mockImplementation(async callback => callback(mockEntityManager));
      mockEquipmentRepository.findWithDetails.mockResolvedValueOnce(mockCurrentEquipment);
      mockEquipmentRepository.nameExistsInCell.mockResolvedValue(false);
      mockEquipmentRepository.updateEquipment.mockResolvedValue(mockUpdatedEquipment);
      mockPLCRepository.update.mockResolvedValue({ affected: 1 });
      mockEquipmentRepository.findWithDetails.mockResolvedValueOnce(mockUpdatedEquipment);

      // Execute
      const result = await service.updateEquipment(
        mockEquipmentId,
        updateInput,
        expectedUpdatedAt,
        { userId: mockUserId }
      );

      // Assert
      expect(result).toEqual(mockUpdatedEquipment);
      expect(mockEquipmentRepository.updateEquipment).toHaveBeenCalled();
      expect(mockPLCRepository.update).toHaveBeenCalled();
    });

    it('should throw OptimisticLockingError when timestamps do not match', async () => {
      // Setup mocks
      const mockCurrentEquipment = {
        ...mockEquipment,
        cell: mockCell,
        plcs: [mockPLC],
        updatedAt: new Date('2025-08-15T11:00:00.000Z'), // Different timestamp
      };

      mockTransaction.mockImplementation(async callback => callback(mockEntityManager));
      mockEquipmentRepository.findWithDetails.mockResolvedValue(mockCurrentEquipment);

      // Execute & Assert
      await expect(
        service.updateEquipment(mockEquipmentId, updateInput, expectedUpdatedAt, {
          userId: mockUserId,
        })
      ).rejects.toThrow('Equipment was modified by another user. Please refresh and try again.');
    });
  });

  describe('deleteEquipment', () => {
    it('should successfully soft delete equipment', async () => {
      // Setup mocks
      const mockEquipmentWithDetails = {
        ...mockEquipment,
        cell: mockCell,
        plcs: [mockPLC],
      };
      mockEquipmentRepository.findWithDetails.mockResolvedValue(mockEquipmentWithDetails);
      mockEquipmentRepository.softDeleteEquipment.mockResolvedValue(undefined);

      // Execute
      await service.deleteEquipment(mockEquipmentId, { userId: mockUserId });

      // Assert
      expect(mockEquipmentRepository.findWithDetails).toHaveBeenCalledWith(mockEquipmentId);
      expect(mockEquipmentRepository.softDeleteEquipment).toHaveBeenCalledWith(mockEquipmentId);
    });

    it('should throw EquipmentNotFoundError when equipment not found', async () => {
      // Setup mocks
      mockEquipmentRepository.findWithDetails.mockResolvedValue(null);

      // Execute & Assert
      await expect(
        service.deleteEquipment(mockEquipmentId, { userId: mockUserId })
      ).rejects.toThrow("Equipment with ID '456e7890-e12b-34d5-a678-901234567def' not found");
    });
  });

  describe('searchEquipment', () => {
    it('should return paginated equipment results', async () => {
      // Setup mocks
      const mockPaginatedResult = {
        data: [
          {
            ...mockEquipment,
            cell: mockCell,
            plcs: [mockPLC],
          },
        ],
        pagination: {
          page: 1,
          pageSize: 50,
          total: 1,
          totalPages: 1,
        },
      };

      mockEquipmentRepository.searchEquipmentWithPagination.mockResolvedValue(mockPaginatedResult);

      // Execute
      const filters = { search: 'test', page: 1, pageSize: 50 };
      const result = await service.searchEquipment(filters);

      // Assert
      expect(result).toEqual(mockPaginatedResult);
      expect(mockEquipmentRepository.searchEquipmentWithPagination).toHaveBeenCalledWith(filters);
    });
  });

  describe('getEquipmentStatistics', () => {
    it('should return equipment statistics', async () => {
      // Setup mocks
      const mockAllEquipment = [
        {
          ...mockEquipment,
          equipmentType: EquipmentType.PRESS,
          plcs: [{ ...mockPLC, ipAddress: '192.168.1.100' }],
        },
        {
          ...mockEquipment,
          id: 'another-id',
          equipmentType: EquipmentType.ROBOT,
          plcs: [{ ...mockPLC, ipAddress: null }],
        },
      ];

      mockEquipmentRepository.findAllWithDetails.mockResolvedValue(mockAllEquipment);

      // Execute
      const result = await service.getEquipmentStatistics();

      // Assert
      expect(result).toEqual({
        totalEquipment: 2,
        equipmentByType: {
          [EquipmentType.PRESS]: 1,
          [EquipmentType.ROBOT]: 1,
        },
        equipmentWithIP: 1,
        equipmentWithoutIP: 1,
      });
    });
  });
});
