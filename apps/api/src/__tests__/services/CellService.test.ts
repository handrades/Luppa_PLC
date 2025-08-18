/**
 * Cell Service Unit Tests
 *
 * Comprehensive test suite for CellService functionality including
 * CRUD operations, validation, error handling, and business logic.
 */

import { EntityManager, Repository } from 'typeorm';
import {
  CellSearchFilters,
  CellService,
  CreateCellInput,
  UpdateCellInput,
} from '../../services/CellService';
import { Cell } from '../../entities/Cell';
import { Site } from '../../entities/Site';
import { Equipment } from '../../entities/Equipment';

// Mock logger to prevent console output during tests
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CellService', () => {
  let cellService: CellService;
  let mockEntityManager: jest.Mocked<EntityManager>;
  let mockCellRepository: jest.Mocked<Repository<Cell>>;
  let mockSiteRepository: jest.Mocked<Repository<Site>>;
  let mockEquipmentRepository: jest.Mocked<Repository<Equipment>>;
  let mockQueryBuilder: {
    createQueryBuilder: jest.Mock;
    leftJoinAndSelect: jest.Mock;
    leftJoin: jest.Mock;
    innerJoin: jest.Mock;
    addSelect: jest.Mock;
    select: jest.Mock;
    groupBy: jest.Mock;
    addGroupBy: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    having: jest.Mock;
    orderBy: jest.Mock;
    offset: jest.Mock;
    limit: jest.Mock;
    getCount: jest.Mock;
    getRawAndEntities: jest.Mock;
    getRawMany: jest.Mock;
    getOne: jest.Mock;
    getMany: jest.Mock;
  };

  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockSiteId = '550e8400-e29b-41d4-a716-446655440002';

  beforeEach(() => {
    // Create mock query builder
    mockQueryBuilder = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getRawAndEntities: jest.fn().mockResolvedValue({ entities: [], raw: [] }),
      getRawMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
    };

    // Create mock repositories
    mockCellRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as jest.Mocked<Repository<Cell>>;

    mockSiteRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as jest.Mocked<Repository<Site>>;

    mockEquipmentRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as jest.Mocked<Repository<Equipment>>;

    // Create mock entity manager
    mockEntityManager = {
      getRepository: jest.fn(entity => {
        if (entity === Cell) return mockCellRepository;
        if (entity === Site) return mockSiteRepository;
        if (entity === Equipment) return mockEquipmentRepository;
        throw new Error(`Unexpected entity: ${entity}`);
      }),
      transaction: jest.fn().mockImplementation(callback => callback(mockEntityManager)),
    } as jest.Mocked<EntityManager>;

    cellService = new CellService(mockEntityManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should throw error if EntityManager is not provided', () => {
      expect(() => new CellService()).toThrow(
        'EntityManager is required for CellService initialization'
      );
    });

    it('should create service instance with EntityManager', () => {
      expect(cellService).toBeInstanceOf(CellService);
    });
  });

  describe('createCell', () => {
    const validCreateInput: CreateCellInput = {
      siteId: mockSiteId,
      name: 'Test Cell',
      lineNumber: 'LINE-01',
    };

    const mockSite: Site = {
      id: mockSiteId,
      name: 'Test Site',
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      cells: [],
      creator: null as unknown,
      updater: null as unknown,
    };

    const mockCell: Cell = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      siteId: mockSiteId,
      name: 'Test Cell',
      lineNumber: 'LINE-01',
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      site: mockSite,
      equipment: [],
      creator: null as unknown,
      updater: null as unknown,
    };

    beforeEach(() => {
      mockSiteRepository.findOne.mockResolvedValue(mockSite);
      mockCellRepository.findOne.mockResolvedValue(null); // No existing cell
      mockCellRepository.create.mockReturnValue(mockCell);
      mockCellRepository.save.mockResolvedValue(mockCell);
    });

    it('should create a new cell successfully', async () => {
      const result = await cellService.createCell(validCreateInput, {
        userId: mockUserId,
      });

      expect(mockCellRepository.create).toHaveBeenCalledWith({
        siteId: mockSiteId,
        name: 'Test Cell',
        lineNumber: 'LINE-01',
        createdBy: mockUserId,
        updatedBy: mockUserId,
      });
      expect(mockCellRepository.save).toHaveBeenCalledWith(mockCell);
      expect(result).toEqual({
        ...mockCell,
        equipmentCount: 0,
        siteName: 'Test Site',
      });
    });

    it('should validate site ID is required', async () => {
      await expect(
        cellService.createCell({ ...validCreateInput, siteId: '' }, { userId: mockUserId })
      ).rejects.toThrow('Site ID is required');
    });

    it('should validate cell name is required', async () => {
      await expect(
        cellService.createCell({ ...validCreateInput, name: '' }, { userId: mockUserId })
      ).rejects.toThrow('Cell name is required');
    });

    it('should validate line number is required', async () => {
      await expect(
        cellService.createCell({ ...validCreateInput, lineNumber: '' }, { userId: mockUserId })
      ).rejects.toThrow('Line number is required');
    });

    it('should validate cell name length', async () => {
      const longName = 'a'.repeat(101);
      await expect(
        cellService.createCell({ ...validCreateInput, name: longName }, { userId: mockUserId })
      ).rejects.toThrow('Cell name must be less than 100 characters');
    });

    it('should validate line number length', async () => {
      const longLineNumber = 'A'.repeat(51);
      await expect(
        cellService.createCell(
          { ...validCreateInput, lineNumber: longLineNumber },
          { userId: mockUserId }
        )
      ).rejects.toThrow('Line number must be less than 50 characters');
    });

    it('should validate line number format', async () => {
      await expect(
        cellService.createCell(
          { ...validCreateInput, lineNumber: 'invalid@line' },
          { userId: mockUserId }
        )
      ).rejects.toThrow('Line number must be uppercase alphanumeric with hyphens only');
    });

    it('should convert line number to uppercase', async () => {
      await cellService.createCell(
        { ...validCreateInput, lineNumber: 'line-01' },
        { userId: mockUserId }
      );

      expect(mockCellRepository.create).toHaveBeenCalledWith({
        siteId: mockSiteId,
        name: 'Test Cell',
        lineNumber: 'LINE-01',
        createdBy: mockUserId,
        updatedBy: mockUserId,
      });
    });

    it('should validate site exists', async () => {
      mockSiteRepository.findOne.mockResolvedValue(null);

      await expect(
        cellService.createCell(validCreateInput, { userId: mockUserId })
      ).rejects.toThrow(`Site with ID '${mockSiteId}' not found`);
    });

    it('should handle line number uniqueness within site', async () => {
      const existingCell = { ...mockCell, id: 'different-id' };
      mockCellRepository.findOne.mockResolvedValue(existingCell);

      await expect(
        cellService.createCell(validCreateInput, { userId: mockUserId })
      ).rejects.toThrow(`Line number 'LINE-01' already exists in site 'Test Site'`);
    });

    it('should handle database constraint errors', async () => {
      const dbError = new Error('Database error') as Error & { code: string };
      dbError.code = '23505'; // PostgreSQL unique constraint violation
      mockCellRepository.save.mockRejectedValue(dbError);

      await expect(
        cellService.createCell(validCreateInput, { userId: mockUserId })
      ).rejects.toThrow("Line number 'LINE-01' already exists in this site");
    });

    it('should trim input values', async () => {
      const inputWithSpaces = {
        siteId: mockSiteId,
        name: '  Test Cell  ',
        lineNumber: '  line-01  ',
      };

      await cellService.createCell(inputWithSpaces, { userId: mockUserId });

      expect(mockCellRepository.create).toHaveBeenCalledWith({
        siteId: mockSiteId,
        name: 'Test Cell',
        lineNumber: 'LINE-01',
        createdBy: mockUserId,
        updatedBy: mockUserId,
      });
    });
  });

  describe('getCellById', () => {
    const cellId = '550e8400-e29b-41d4-a716-446655440001';
    const mockSite: Site = {
      id: mockSiteId,
      name: 'Test Site',
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      cells: [],
      creator: null as unknown,
      updater: null as unknown,
    };

    const mockCell: Cell = {
      id: cellId,
      siteId: mockSiteId,
      name: 'Test Cell',
      lineNumber: 'LINE-01',
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      site: mockSite,
      equipment: [],
      creator: null as unknown,
      updater: null as unknown,
    };

    beforeEach(() => {
      mockCellRepository.findOne.mockResolvedValue(mockCell);
      mockEquipmentRepository.count.mockResolvedValue(3);
    });

    it('should return cell with counts', async () => {
      const result = await cellService.getCellById(cellId);

      expect(mockCellRepository.findOne).toHaveBeenCalledWith({
        where: { id: cellId },
        relations: ['site'],
      });
      expect(mockEquipmentRepository.count).toHaveBeenCalledWith({
        where: { cellId },
      });
      expect(result).toEqual({
        ...mockCell,
        equipmentCount: 3,
        siteName: 'Test Site',
      });
    });

    it('should throw error if cell not found', async () => {
      mockCellRepository.findOne.mockResolvedValue(null);

      await expect(cellService.getCellById(cellId)).rejects.toThrow(
        `Cell with ID '${cellId}' not found`
      );
    });
  });

  describe('searchCells', () => {
    const mockSite: Site = {
      id: mockSiteId,
      name: 'Test Site',
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      cells: [],
      creator: null as unknown,
      updater: null as unknown,
    };

    const mockCells: Cell[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        siteId: mockSiteId,
        name: 'Cell A',
        lineNumber: 'LINE-01',
        createdBy: mockUserId,
        updatedBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        site: mockSite,
        equipment: [],
        creator: null as unknown,
        updater: null as unknown,
      },
    ];

    beforeEach(() => {
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: mockCells,
        raw: [{ equipmentCount: '2' }],
      });
    });

    it('should search cells with default parameters', async () => {
      const filters: CellSearchFilters = {};

      const result = await cellService.searchCells(filters);

      expect(mockQueryBuilder.createQueryBuilder).toHaveBeenCalledWith('cell');
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        totalItems: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });

    it('should apply site filter', async () => {
      const filters: CellSearchFilters = { siteId: mockSiteId };

      await cellService.searchCells(filters);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('cell.siteId = :siteId', {
        siteId: mockSiteId,
      });
    });

    it('should apply search filter', async () => {
      const filters: CellSearchFilters = { search: 'test' };

      await cellService.searchCells(filters);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        '(cell.name ILIKE :search OR cell.lineNumber ILIKE :search OR site.name ILIKE :search)',
        { search: '%test%' }
      );
    });

    it('should combine site and search filters', async () => {
      const filters: CellSearchFilters = { siteId: mockSiteId, search: 'test' };

      await cellService.searchCells(filters);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('cell.siteId = :siteId', {
        siteId: mockSiteId,
      });
      expect(mockQueryBuilder.and).toHaveBeenCalledWith(
        '(cell.name ILIKE :search OR cell.lineNumber ILIKE :search OR site.name ILIKE :search)',
        { search: '%test%' }
      );
    });

    it('should apply pagination', async () => {
      const filters: CellSearchFilters = { page: 2, pageSize: 10 };

      await cellService.searchCells(filters);

      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should apply sorting by equipment count', async () => {
      const filters: CellSearchFilters = {
        sortBy: 'equipmentCount',
        sortOrder: 'DESC',
      };

      await cellService.searchCells(filters);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('equipmentCount', 'DESC');
    });

    it('should apply sorting by line number', async () => {
      const filters: CellSearchFilters = {
        sortBy: 'lineNumber',
        sortOrder: 'ASC',
      };

      await cellService.searchCells(filters);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('cell.lineNumber', 'ASC');
    });

    it('should filter empty cells when includeEmpty is false', async () => {
      const filters: CellSearchFilters = { includeEmpty: false };

      await cellService.searchCells(filters);

      expect(mockQueryBuilder.having).toHaveBeenCalledWith('COUNT(DISTINCT equipment.id) > 0');
    });
  });

  describe('updateCell', () => {
    const cellId = '550e8400-e29b-41d4-a716-446655440001';
    const updateData: UpdateCellInput = {
      name: 'Updated Cell',
      lineNumber: 'LINE-02',
    };
    const expectedUpdatedAt = new Date();

    const mockSite: Site = {
      id: mockSiteId,
      name: 'Test Site',
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      cells: [],
      creator: null as unknown,
      updater: null as unknown,
    };

    const mockCurrentCell: Cell = {
      id: cellId,
      siteId: mockSiteId,
      name: 'Original Cell',
      lineNumber: 'LINE-01',
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date(),
      updatedAt: expectedUpdatedAt,
      site: mockSite,
      equipment: [],
      creator: null as unknown,
      updater: null as unknown,
    };

    beforeEach(() => {
      mockCellRepository.findOne
        .mockResolvedValueOnce(mockCurrentCell) // First call for current cell
        .mockResolvedValueOnce(null); // Second call for uniqueness check
      mockCellRepository.update.mockResolvedValue(null as unknown);
      // Mock getCellById for return value
      jest.spyOn(cellService, 'getCellById').mockResolvedValue({
        ...mockCurrentCell,
        name: 'Updated Cell',
        lineNumber: 'LINE-02',
        equipmentCount: 0,
        siteName: 'Test Site',
      });
    });

    it('should update cell successfully', async () => {
      const result = await cellService.updateCell(cellId, updateData, expectedUpdatedAt, {
        userId: mockUserId,
      });

      expect(mockCellRepository.update).toHaveBeenCalledWith(cellId, {
        name: 'Updated Cell',
        lineNumber: 'LINE-02',
        updatedBy: mockUserId,
      });
      expect(result.name).toBe('Updated Cell');
      expect(result.lineNumber).toBe('LINE-02');
    });

    it('should throw error if cell not found', async () => {
      mockCellRepository.findOne.mockResolvedValue(null);

      await expect(
        cellService.updateCell(cellId, updateData, expectedUpdatedAt, {
          userId: mockUserId,
        })
      ).rejects.toThrow(`Cell with ID '${cellId}' not found`);
    });

    it('should handle optimistic locking conflict', async () => {
      const differentTimestamp = new Date(Date.now() + 1000);

      await expect(
        cellService.updateCell(cellId, updateData, differentTimestamp, {
          userId: mockUserId,
        })
      ).rejects.toThrow('Cell was modified by another user. Please refresh and try again.');
    });

    it('should validate updated line number uniqueness', async () => {
      const existingCell = {
        ...mockCurrentCell,
        id: 'different-id',
        lineNumber: 'LINE-02',
      };
      mockCellRepository.findOne
        .mockResolvedValueOnce(mockCurrentCell) // First call for current cell
        .mockResolvedValueOnce(existingCell); // Second call for uniqueness check

      await expect(
        cellService.updateCell(cellId, updateData, expectedUpdatedAt, {
          userId: mockUserId,
        })
      ).rejects.toThrow("Line number 'LINE-02' already exists in this site");
    });

    it('should validate cell name format', async () => {
      const invalidUpdateData = { name: 'Invalid@Name#' };

      await expect(
        cellService.updateCell(cellId, invalidUpdateData, expectedUpdatedAt, {
          userId: mockUserId,
        })
      ).rejects.toThrow('Cell name contains invalid characters');
    });

    it('should validate line number format', async () => {
      const invalidUpdateData = { lineNumber: 'invalid@line' };

      await expect(
        cellService.updateCell(cellId, invalidUpdateData, expectedUpdatedAt, {
          userId: mockUserId,
        })
      ).rejects.toThrow('Line number must be uppercase alphanumeric with hyphens only');
    });

    it('should convert line number to uppercase', async () => {
      const lowerCaseUpdate = { lineNumber: 'line-02' };

      await cellService.updateCell(cellId, lowerCaseUpdate, expectedUpdatedAt, {
        userId: mockUserId,
      });

      expect(mockCellRepository.update).toHaveBeenCalledWith(cellId, {
        lineNumber: 'LINE-02',
        updatedBy: mockUserId,
      });
    });
  });

  describe('deleteCell', () => {
    const cellId = '550e8400-e29b-41d4-a716-446655440001';
    const mockSite: Site = {
      id: mockSiteId,
      name: 'Test Site',
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      cells: [],
      creator: null as unknown,
      updater: null as unknown,
    };

    const mockCell: Cell = {
      id: cellId,
      siteId: mockSiteId,
      name: 'Test Cell',
      lineNumber: 'LINE-01',
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      site: mockSite,
      equipment: [],
      creator: null as unknown,
      updater: null as unknown,
    };

    beforeEach(() => {
      mockCellRepository.findOne.mockResolvedValue(mockCell);
      mockEquipmentRepository.count.mockResolvedValue(0);
      mockCellRepository.delete.mockResolvedValue(null as unknown);
    });

    it('should delete cell successfully', async () => {
      await cellService.deleteCell(cellId, { userId: mockUserId });

      expect(mockCellRepository.delete).toHaveBeenCalledWith(cellId);
    });

    it('should throw error if cell not found', async () => {
      mockCellRepository.findOne.mockResolvedValue(null);

      await expect(cellService.deleteCell(cellId, { userId: mockUserId })).rejects.toThrow(
        `Cell with ID '${cellId}' not found`
      );
    });

    it('should prevent deletion of cell with equipment', async () => {
      mockEquipmentRepository.count.mockResolvedValue(5);

      await expect(cellService.deleteCell(cellId, { userId: mockUserId })).rejects.toThrow(
        `Cannot delete cell 'Test Cell' because it contains 5 equipment record(s)`
      );
    });
  });

  describe('validateCellUniqueness', () => {
    it('should return true for unique line number within site', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await cellService.validateCellUniqueness(mockSiteId, 'LINE-01');

      expect(result).toBe(true);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('cell.siteId = :siteId', {
        siteId: mockSiteId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('cell.lineNumber = :lineNumber', {
        lineNumber: 'LINE-01',
      });
    });

    it('should return false for existing line number within site', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ lineNumber: 'LINE-01' });

      const result = await cellService.validateCellUniqueness(mockSiteId, 'LINE-01');

      expect(result).toBe(false);
    });

    it('should exclude specified cell ID from check', async () => {
      const excludeId = '550e8400-e29b-41d4-a716-446655440001';

      await cellService.validateCellUniqueness(mockSiteId, 'LINE-01', excludeId);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('cell.id != :excludeId', {
        excludeId,
      });
    });

    it('should convert line number to uppercase', async () => {
      await cellService.validateCellUniqueness(mockSiteId, 'line-01');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('cell.lineNumber = :lineNumber', {
        lineNumber: 'LINE-01',
      });
    });
  });

  describe('getCellStatistics', () => {
    beforeEach(() => {
      mockCellRepository.count.mockResolvedValue(15);
      mockEquipmentRepository.count.mockResolvedValue(45);
      mockQueryBuilder.getCount.mockResolvedValue(3); // cells without equipment
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { siteName: 'Site A', cellCount: '5' },
        { siteName: 'Site B', cellCount: '10' },
      ]);
    });

    it('should return comprehensive cell statistics', async () => {
      const result = await cellService.getCellStatistics();

      expect(result).toEqual({
        totalCells: 15,
        totalEquipment: 45,
        averageEquipmentPerCell: 3,
        cellsWithoutEquipment: 3,
        cellsPerSite: {
          'Site A': 5,
          'Site B': 10,
        },
      });
    });

    it('should handle zero cells gracefully', async () => {
      mockCellRepository.count.mockResolvedValue(0);
      mockEquipmentRepository.count.mockResolvedValue(0);

      const result = await cellService.getCellStatistics();

      expect(result.averageEquipmentPerCell).toBe(0);
    });
  });

  describe('validateHierarchyIntegrity', () => {
    it('should return valid result when no issues found', async () => {
      mockQueryBuilder.getMany
        .mockResolvedValueOnce([]) // No orphaned cells
        .mockResolvedValueOnce([]); // No duplicate line numbers

      const result = await cellService.validateHierarchyIntegrity();

      expect(result).toEqual({
        isValid: true,
        errors: [],
        warnings: [],
      });
    });

    it('should detect orphaned cells', async () => {
      const orphanedCells = [
        {
          id: '1',
          name: 'Orphaned Cell 1',
          lineNumber: 'LINE-01',
          siteId: 'nonexistent-site',
        },
        {
          id: '2',
          name: 'Orphaned Cell 2',
          lineNumber: 'LINE-02',
          siteId: 'another-nonexistent-site',
        },
      ];

      mockQueryBuilder.getMany
        .mockResolvedValueOnce(orphanedCells) // Orphaned cells found
        .mockResolvedValueOnce([]); // No duplicate line numbers

      const result = await cellService.validateHierarchyIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Found 2 orphaned cells without valid sites');
      expect(result.errors).toContain(
        'Orphaned cell: Orphaned Cell 1 (LINE-01) - Site ID: nonexistent-site'
      );
    });

    it('should detect duplicate line numbers within sites', async () => {
      mockSiteRepository.findOne.mockResolvedValue({
        id: mockSiteId,
        name: 'Test Site',
      });

      mockQueryBuilder.getMany
        .mockResolvedValueOnce([]) // No orphaned cells
        .mockResolvedValueOnce([]); // Will be replaced by getRawMany

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { siteId: mockSiteId, lineNumber: 'LINE-01', count: '2' },
      ]);

      const result = await cellService.validateHierarchyIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Found 1 duplicate line numbers within sites');
      expect(result.errors).toContain(
        'Duplicate line number LINE-01 in site Test Site (2 occurrences)'
      );
    });
  });

  describe('getCellSuggestions', () => {
    it('should return empty array for empty query', async () => {
      const result = await cellService.getCellSuggestions(mockSiteId, '');

      expect(result).toEqual([]);
    });

    it('should return suggestions for valid query', async () => {
      const mockSuggestions = [
        {
          id: '1',
          name: 'Cell A',
          lineNumber: 'LINE-01',
          equipmentCount: 2,
          siteName: 'Test Site',
        },
      ];

      jest.spyOn(cellService, 'searchCells').mockResolvedValue({
        data: mockSuggestions as unknown,
        pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
      });

      const result = await cellService.getCellSuggestions(mockSiteId, 'Cell', 5);

      expect(result).toEqual(mockSuggestions);
    });
  });
});
