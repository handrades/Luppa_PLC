/**
 * Site Service Unit Tests
 *
 * Comprehensive test suite for SiteService functionality including
 * CRUD operations, validation, error handling, and business logic.
 */

import { EntityManager, Repository } from "typeorm";
import {
  CreateSiteInput,
  SiteSearchFilters,
  SiteService,
  UpdateSiteInput,
} from "../../services/SiteService";
import { Site } from "../../entities/Site";
import { Cell } from "../../entities/Cell";
import { Equipment } from "../../entities/Equipment";
import { User } from "../../entities/User";

// Mock logger to prevent console output during tests
jest.mock("../../config/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("SiteService", () => {
  let siteService: SiteService;
  let mockEntityManager: jest.Mocked<EntityManager>;
  let mockSiteRepository: jest.Mocked<Repository<Site>>;
  let mockCellRepository: jest.Mocked<Repository<Cell>>;
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
    update: jest.Mock;
    set: jest.Mock;
    execute: jest.Mock;
    getCount: jest.Mock;
    getRawAndEntities: jest.Mock;
    getRawMany: jest.Mock;
    getOne: jest.Mock;
  };

  const mockUserId = "550e8400-e29b-41d4-a716-446655440000";

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
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
      getCount: jest.fn().mockResolvedValue(0),
      getRawAndEntities: jest.fn().mockResolvedValue({ entities: [], raw: [] }),
      getRawMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
    };

    // Create mock repositories
    mockSiteRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as jest.Mocked<Repository<Site>>;

    mockCellRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as jest.Mocked<Repository<Cell>>;

    mockEquipmentRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as jest.Mocked<Repository<Equipment>>;

    // Create mock transaction manager with same repository mocking
    const mockTransactionManager = {
      getRepository: jest.fn((entity) => {
        if (entity === Site) return mockSiteRepository;
        if (entity === Cell) return mockCellRepository;
        if (entity === Equipment) return mockEquipmentRepository;
        throw new Error(`Unexpected entity: ${entity}`);
      }),
    } as jest.Mocked<EntityManager>;

    // Create mock entity manager
    mockEntityManager = {
      getRepository: jest.fn((entity) => {
        if (entity === Site) return mockSiteRepository;
        if (entity === Cell) return mockCellRepository;
        if (entity === Equipment) return mockEquipmentRepository;
        throw new Error(`Unexpected entity: ${entity}`);
      }),
      transaction: jest
        .fn()
        .mockImplementation((callback) => callback(mockTransactionManager)),
    } as jest.Mocked<EntityManager>;

    siteService = new SiteService(mockEntityManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should throw error if EntityManager is not provided", () => {
      expect(() => new SiteService()).toThrow(
        "EntityManager is required for SiteService initialization",
      );
    });

    it("should create service instance with EntityManager", () => {
      expect(siteService).toBeInstanceOf(SiteService);
    });
  });

  describe("createSite", () => {
    const validCreateInput: CreateSiteInput = {
      name: "Test Site",
    };

    const mockSite: Site = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Test Site",
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      cells: [],
      creator: null as User | null,
      updater: null as User | null,
    };

    beforeEach(() => {
      mockSiteRepository.findOne.mockResolvedValue(null); // No existing site
      mockSiteRepository.create.mockReturnValue(mockSite);
      mockSiteRepository.save.mockResolvedValue(mockSite);
    });

    it("should create a new site successfully", async () => {
      const result = await siteService.createSite(validCreateInput, {
        userId: mockUserId,
      });

      expect(mockSiteRepository.create).toHaveBeenCalledWith({
        name: "Test Site",
        createdBy: mockUserId,
        updatedBy: mockUserId,
      });
      expect(mockSiteRepository.save).toHaveBeenCalledWith(mockSite);
      expect(result).toEqual({
        ...mockSite,
        cellCount: 0,
        equipmentCount: 0,
      });
    });

    it("should validate site name is required", async () => {
      await expect(
        siteService.createSite({ name: "" }, { userId: mockUserId }),
      ).rejects.toThrow("Site name is required");
    });

    it("should validate site name length", async () => {
      const longName = "a".repeat(101);
      await expect(
        siteService.createSite({ name: longName }, { userId: mockUserId }),
      ).rejects.toThrow("Site name must be less than 100 characters");
    });

    it("should validate site name format", async () => {
      await expect(
        siteService.createSite(
          { name: "Invalid@Name#" },
          { userId: mockUserId },
        ),
      ).rejects.toThrow("Site name contains invalid characters");
    });

    it("should handle name uniqueness validation", async () => {
      mockSiteRepository.findOne.mockResolvedValue(mockSite); // Existing site found

      await expect(
        siteService.createSite(validCreateInput, { userId: mockUserId }),
      ).rejects.toThrow("Site name 'Test Site' already exists");
    });

    it("should handle database constraint errors", async () => {
      const dbError = new Error("Database error") as Error & { code: string };
      dbError.code = "23505"; // PostgreSQL unique constraint violation
      mockSiteRepository.save.mockRejectedValue(dbError);

      await expect(
        siteService.createSite(validCreateInput, { userId: mockUserId }),
      ).rejects.toThrow("Site name 'Test Site' already exists");
    });

    it("should trim site name", async () => {
      const inputWithSpaces = { name: "  Test Site  " };

      await siteService.createSite(inputWithSpaces, { userId: mockUserId });

      expect(mockSiteRepository.create).toHaveBeenCalledWith({
        name: "Test Site",
        createdBy: mockUserId,
        updatedBy: mockUserId,
      });
    });
  });

  describe("getSiteById", () => {
    const siteId = "550e8400-e29b-41d4-a716-446655440001";
    const mockSite: Site = {
      id: siteId,
      name: "Test Site",
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      cells: [],
      creator: null as User | null,
      updater: null as User | null,
    };

    beforeEach(() => {
      mockSiteRepository.findOne.mockResolvedValue(mockSite);
      mockCellRepository.count.mockResolvedValue(5);
      mockQueryBuilder.getCount.mockResolvedValue(10); // equipment count
    });

    it("should return site with counts", async () => {
      const result = await siteService.getSiteById(siteId);

      expect(mockSiteRepository.findOne).toHaveBeenCalledWith({
        where: { id: siteId },
      });
      expect(mockCellRepository.count).toHaveBeenCalledWith({
        where: { siteId },
      });
      expect(result).toEqual({
        ...mockSite,
        cellCount: 5,
        equipmentCount: 10,
      });
    });

    it("should throw error if site not found", async () => {
      mockSiteRepository.findOne.mockResolvedValue(null);

      await expect(siteService.getSiteById(siteId)).rejects.toThrow(
        `Site with ID '${siteId}' not found`,
      );
    });
  });

  describe("searchSites", () => {
    const mockSites: Site[] = [
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Site A",
        createdBy: mockUserId,
        updatedBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        cells: [],
        creator: null as User | null,
        updater: null as User | null,
      },
    ];

    beforeEach(() => {
      mockQueryBuilder.getRawAndEntities.mockResolvedValue({
        entities: mockSites,
        raw: [{ cellCount: "2", equipmentCount: "5" }],
      });
    });

    it("should search sites with default parameters", async () => {
      const filters: SiteSearchFilters = {};

      const result = await siteService.searchSites(filters);

      expect(mockSiteRepository.createQueryBuilder).toHaveBeenCalledWith(
        "site",
      );
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        totalItems: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });

    it("should apply search filter", async () => {
      const filters: SiteSearchFilters = { search: "test" };

      await siteService.searchSites(filters);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "LOWER(site.name) LIKE LOWER(:search)",
        {
          search: "%test%",
        },
      );
    });

    it("should apply pagination", async () => {
      const filters: SiteSearchFilters = { page: 2, pageSize: 10 };

      await siteService.searchSites(filters);

      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it("should apply sorting", async () => {
      const filters: SiteSearchFilters = {
        sortBy: "createdAt",
        sortOrder: "DESC",
      };

      await siteService.searchSites(filters);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        "site.createdAt",
        "DESC",
      );
    });

    it("should filter empty sites when includeEmpty is false", async () => {
      const filters: SiteSearchFilters = { includeEmpty: false };

      await siteService.searchSites(filters);

      expect(mockQueryBuilder.having).toHaveBeenCalledWith(
        "COUNT(DISTINCT equipment.id) > 0",
      );
    });
  });

  describe("updateSite", () => {
    const siteId = "550e8400-e29b-41d4-a716-446655440001";
    const updateData: UpdateSiteInput = { name: "Updated Site" };
    const expectedUpdatedAt = new Date();

    const mockCurrentSite: Site = {
      id: siteId,
      name: "Original Site",
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date(),
      updatedAt: expectedUpdatedAt,
      cells: [],
      creator: null as User | null,
      updater: null as User | null,
    };

    beforeEach(() => {
      // Clear mocks for clean test state
      jest.clearAllMocks();
    });

    it("should update site successfully", async () => {
      mockSiteRepository.findOne
        .mockResolvedValueOnce(mockCurrentSite) // First call for current site
        .mockResolvedValueOnce(null); // Second call for uniqueness check

      // Mock the query builder for successful update
      const mockUpdateQueryBuilder = {
        ...mockQueryBuilder,
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockSiteRepository.createQueryBuilder.mockReturnValue(
        mockUpdateQueryBuilder,
      );

      // Mock getSiteById for return value
      jest.spyOn(siteService, "getSiteById").mockResolvedValue({
        ...mockCurrentSite,
        name: "Updated Site",
        cellCount: 0,
        equipmentCount: 0,
      });

      const result = await siteService.updateSite(
        siteId,
        updateData,
        expectedUpdatedAt,
        {
          userId: mockUserId,
        },
      );

      expect(mockUpdateQueryBuilder.update).toHaveBeenCalledWith(Site);
      expect(mockUpdateQueryBuilder.set).toHaveBeenCalledWith({
        name: "Updated Site",
        updatedBy: mockUserId,
      });
      expect(result.name).toBe("Updated Site");
    });

    it("should throw error if site not found", async () => {
      mockSiteRepository.findOne.mockReset();
      mockSiteRepository.findOne.mockResolvedValue(null);

      await expect(
        siteService.updateSite(siteId, updateData, expectedUpdatedAt, {
          userId: mockUserId,
        }),
      ).rejects.toThrow(`Site with ID '${siteId}' not found`);
    });

    it("should handle optimistic locking conflict", async () => {
      const differentTimestamp = new Date(Date.now() + 1000);
      mockSiteRepository.findOne
        .mockResolvedValueOnce(mockCurrentSite) // First call for current site
        .mockResolvedValueOnce(null) // Second call for uniqueness check (no conflict)
        .mockResolvedValueOnce(mockCurrentSite); // Third call to check if site still exists after failed update

      // Mock the query builder update to simulate optimistic locking failure
      const mockUpdateQueryBuilder = {
        ...mockQueryBuilder,
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      mockSiteRepository.createQueryBuilder.mockReturnValue(
        mockUpdateQueryBuilder,
      );

      await expect(
        siteService.updateSite(siteId, updateData, differentTimestamp, {
          userId: mockUserId,
        }),
      ).rejects.toThrow(
        "Site was modified by another user. Please refresh and try again.",
      );
    });

    it("should validate updated name uniqueness", async () => {
      const existingSite = { ...mockCurrentSite, id: "different-id" };
      mockSiteRepository.findOne.mockReset();
      mockSiteRepository.findOne
        .mockResolvedValueOnce(mockCurrentSite) // First call for current site
        .mockResolvedValueOnce(existingSite); // Second call for uniqueness check

      await expect(
        siteService.updateSite(siteId, updateData, expectedUpdatedAt, {
          userId: mockUserId,
        }),
      ).rejects.toThrow("Site name 'Updated Site' already exists");
    });
  });

  describe("deleteSite", () => {
    const siteId = "550e8400-e29b-41d4-a716-446655440001";
    const mockSite: Site = {
      id: siteId,
      name: "Test Site",
      createdBy: mockUserId,
      updatedBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      cells: [],
      creator: null as User | null,
      updater: null as User | null,
    };

    beforeEach(() => {
      mockSiteRepository.findOne.mockResolvedValue(mockSite);
      mockCellRepository.count.mockResolvedValue(0);
      mockSiteRepository.delete.mockResolvedValue({ affected: 1, raw: [] });
    });

    it("should delete site successfully", async () => {
      await siteService.deleteSite(siteId, { userId: mockUserId });

      expect(mockSiteRepository.delete).toHaveBeenCalledWith(siteId);
    });

    it("should throw error if site not found", async () => {
      mockSiteRepository.findOne.mockResolvedValue(null);

      await expect(
        siteService.deleteSite(siteId, { userId: mockUserId }),
      ).rejects.toThrow(`Site with ID '${siteId}' not found`);
    });

    it("should prevent deletion of site with cells", async () => {
      mockCellRepository.count.mockResolvedValue(3);

      await expect(
        siteService.deleteSite(siteId, { userId: mockUserId }),
      ).rejects.toThrow(
        `Cannot delete site 'Test Site' because it contains 3 cell(s)`,
      );
    });
  });

  describe("validateSiteUniqueness", () => {
    it("should return true for unique name", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await siteService.validateSiteUniqueness("Unique Name");

      expect(result).toBe(true);
    });

    it("should return false for existing name", async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ name: "Existing Name" });

      const result = await siteService.validateSiteUniqueness("Existing Name");

      expect(result).toBe(false);
    });

    it("should exclude specified ID from check", async () => {
      const excludeId = "550e8400-e29b-41d4-a716-446655440001";

      await siteService.validateSiteUniqueness("Test Name", excludeId);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "site.id != :excludeId",
        {
          excludeId,
        },
      );
    });
  });

  describe("getSiteStatistics", () => {
    beforeEach(() => {
      mockSiteRepository.count.mockResolvedValue(10);
      mockCellRepository.count.mockResolvedValue(25);
      mockEquipmentRepository.count.mockResolvedValue(50);
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(2) // sites without cells
        .mockResolvedValueOnce(3); // sites without equipment
    });

    it("should return comprehensive site statistics", async () => {
      const result = await siteService.getSiteStatistics();

      expect(result).toEqual({
        totalSites: 10,
        totalCells: 25,
        totalEquipment: 50,
        averageCellsPerSite: 2.5,
        averageEquipmentPerSite: 5,
        sitesWithoutCells: 2,
        sitesWithoutEquipment: 3,
      });
    });

    it("should handle zero sites gracefully", async () => {
      mockSiteRepository.count.mockResolvedValue(0);
      mockCellRepository.count.mockResolvedValue(0);
      mockEquipmentRepository.count.mockResolvedValue(0);

      const result = await siteService.getSiteStatistics();

      expect(result.averageCellsPerSite).toBe(0);
      expect(result.averageEquipmentPerSite).toBe(0);
    });
  });

  describe("getSiteSuggestions", () => {
    it("should return empty array for empty query", async () => {
      const result = await siteService.getSiteSuggestions("");

      expect(result).toEqual([]);
    });

    it("should return suggestions for valid query", async () => {
      const mockSuggestions = [
        { id: "1", name: "Site A", cellCount: 2, equipmentCount: 5 },
      ];

      jest.spyOn(siteService, "searchSites").mockResolvedValue({
        data: mockSuggestions,
        pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
      });

      const result = await siteService.getSiteSuggestions("Site", 5);

      expect(result).toEqual(mockSuggestions);
    });
  });
});
