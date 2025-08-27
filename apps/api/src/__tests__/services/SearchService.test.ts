/**
 * SearchService Tests
 *
 * Comprehensive tests for search functionality including performance benchmarks
 */

import { SearchService } from "../../services/SearchService";
import { AppDataSource } from "../../config/database";
import { createClient } from "redis";
import { createHash } from "crypto";

// Mock Redis
jest.mock("redis");
const MockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Mock AppDataSource
jest.mock("../../config/database");
const MockedAppDataSource = AppDataSource as jest.Mocked<typeof AppDataSource>;

describe("SearchService", () => {
  let searchService: SearchService;
  let mockRedis: jest.Mocked<ReturnType<typeof createClient>>;
  let mockQueryRunner: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    // Setup Redis mock
    mockRedis = {
      get: jest.fn(),
      setEx: jest.fn(),
      keys: jest.fn(),
      mget: jest.fn(),
      scanIterator: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn().mockResolvedValue("PONG"),
      on: jest.fn(),
      disconnect: jest.fn(),
      quit: jest.fn(),
    } as jest.Mocked<ReturnType<typeof createClient>>;
    MockedCreateClient.mockReturnValue(mockRedis);

    // Setup QueryRunner mock
    mockQueryRunner = {
      query: jest.fn(),
      release: jest.fn(),
    };
    MockedAppDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

    searchService = new SearchService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("search", () => {
    it("should execute full-text search successfully", async () => {
      // Mock database results
      const mockResults = [
        {
          plc_id: "123e4567-e89b-12d3-a456-426614174000",
          tag_id: "PLC-001",
          plc_description: "Main production line PLC",
          make: "Siemens",
          model: "S7-1200",
          relevance_score: 0.95,
          hierarchy_path: "Site A > Cell 1 > Equipment 1 > PLC-001",
        },
      ];

      mockQueryRunner.query.mockResolvedValue(mockResults);
      mockRedis.get.mockResolvedValue(null); // No cache hit

      const result = await searchService.search({
        q: "Siemens PLC",
        page: 1,
        pageSize: 50,
      });

      expect(result).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            plc_id: "123e4567-e89b-12d3-a456-426614174000",
            tag_id: "PLC-001",
            make: "Siemens",
            model: "S7-1200",
            relevance_score: 0.95,
          }),
        ]),
        pagination: {
          page: 1,
          pageSize: 50,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        searchMetadata: {
          query: "Siemens PLC",
          searchType: "hybrid",
          totalMatches: 1,
        },
      });

      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining("ts_rank"),
        expect.arrayContaining(["Siemens:* & PLC:*", 500])
      );
    });

    it("should handle cached results", async () => {
      const cachedResult = {
        data: [],
        pagination: {
          page: 1,
          pageSize: 50,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        searchMetadata: {
          query: "cached",
          searchType: "fulltext",
          totalMatches: 0,
          executionTimeMs: 5,
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await searchService.search({
        q: "cached",
        page: 1,
        pageSize: 50,
      });

      expect(result).toEqual(cachedResult);
      expect(mockQueryRunner.query).not.toHaveBeenCalled();
    });

    it("should sanitize malicious input", async () => {
      const maliciousQuery = "'; DROP TABLE plcs; --";

      await expect(searchService.search({ q: maliciousQuery })).rejects.toThrow();
    });

    it("should handle empty query", async () => {
      await expect(searchService.search({ q: "" })).rejects.toThrow(
        "Search query must be at least 1 character long"
      );
    });

    it("should determine correct search type", async () => {
      // Test different query types based on actual SearchService logic
      const testCases = [
        { query: "a", expectedType: "similarity" }, // <= 3 chars
        { query: "PLC", expectedType: "similarity" }, // <= 3 chars
        { query: "Siemens S7", expectedType: "hybrid" }, // 2 words, > 3 chars
        { query: "Siemens S7 1200 PLC", expectedType: "fulltext" }, // >= 3 words
      ];

      for (const testCase of testCases) {
        mockQueryRunner.query.mockResolvedValue([]);

        const result = await searchService.search({
          q: testCase.query,
          page: 1,
          pageSize: 10,
        });

        expect(result.searchMetadata.searchType).toBe(testCase.expectedType);
      }
    });
  });

  describe("executeFullTextSearch", () => {
    it("should build correct PostgreSQL tsquery", async () => {
      mockQueryRunner.query.mockResolvedValue([]);

      await searchService.search({
        q: "Siemens S7 1200",
        page: 1,
        pageSize: 50,
      });

      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining("to_tsquery"),
        expect.arrayContaining(["Siemens:* & S7:* & 1200:*", 1000])
      );
    });

    it("should include highlighting when requested", async () => {
      mockQueryRunner.query.mockResolvedValue([]);

      await searchService.search({
        q: "test",
        includeHighlights: true,
      });

      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining("ts_headline"),
        expect.any(Array)
      );
    });
  });

  describe("executeSimilaritySearch", () => {
    it("should use similarity function for fuzzy matching", async () => {
      mockQueryRunner.query.mockResolvedValue([]);

      await searchService.search({
        q: "PLCs", // Should trigger similarity search
      });

      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        expect.stringContaining("similarity("),
        expect.arrayContaining(["PLCs", 500])
      );
    });
  });

  describe("performance tests", () => {
    it("should complete search in under 100ms for small datasets", async () => {
      // Mock fast database response
      mockQueryRunner.query.mockResolvedValue(
        Array.from({ length: 100 }, (_, i) => ({
          plc_id: `plc-${i}`,
          tag_id: `PLC-${i.toString().padStart(3, "0")}`,
          plc_description: `Test PLC ${i}`,
          make: "Test Make",
          model: "Test Model",
          relevance_score: Math.random(),
        }))
      );

      const startTime = Date.now();

      await searchService.search({
        q: "test",
        page: 1,
        pageSize: 100,
      });

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(100);
    });

    it("should handle large result sets efficiently", async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        plc_id: `plc-${i}`,
        tag_id: `PLC-${i.toString().padStart(4, "0")}`,
        plc_description: `Large dataset PLC ${i}`,
        make: "Siemens",
        model: "S7-1500",
        relevance_score: Math.random(),
      }));

      mockQueryRunner.query.mockResolvedValue(largeDataset);

      const result = await searchService.search({
        q: "Siemens",
        page: 1,
        pageSize: 50,
        maxResults: 1000,
      });

      expect(result.data).toHaveLength(50); // Respects page size
      expect(result.pagination.total).toBe(1000);
      expect(result.pagination.totalPages).toBe(20);
    });
  });

  describe("caching", () => {
    it("should cache successful search results", async () => {
      mockQueryRunner.query.mockResolvedValue([]);
      mockRedis.get.mockResolvedValue(null);

      await searchService.search({
        q: "cache test",
        page: 1,
        pageSize: 50,
      });

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        expect.stringContaining("search:"),
        300, // 5 minutes TTL
        expect.stringContaining('"query":"cache test"')
      );
    });

    it("should generate consistent SHA256-hashed cache keys", async () => {
      const query1 = { q: "test", page: 1, pageSize: 50 };
      const query2 = { q: "test", page: 1, pageSize: 50 };

      mockQueryRunner.query.mockResolvedValue([]);
      mockRedis.get.mockResolvedValue(null);

      await searchService.search(query1);
      const firstCacheKey = mockRedis.setEx.mock.calls[0][0];

      mockRedis.setEx.mockClear();
      await searchService.search(query2);
      const secondCacheKey = mockRedis.setEx.mock.calls[0][0];

      // Cache keys should be identical
      expect(firstCacheKey).toBe(secondCacheKey);

      // Cache key should start with prefix and contain SHA256 hash
      expect(firstCacheKey).toMatch(/^search:[a-f0-9]{64}$/i);

      // Verify it matches the expected hash of the canonicalized query (as the service normalizes it)
      const normalizedKey = {
        q: "test", // Service normalizes to lowercase
        page: 1,
        pageSize: 50,
        fields: [], // Empty array
        sortBy: "",
        sortOrder: "DESC",
        includeHighlights: false,
        maxResults: 1000,
      };
      const keyString = JSON.stringify(normalizedKey, Object.keys(normalizedKey).sort());
      const expectedHash = createHash("sha256").update(keyString).digest("hex");
      const expectedCacheKey = `search:${expectedHash}`;
      expect(firstCacheKey).toBe(expectedCacheKey);
    });
  });

  describe("error handling", () => {
    it("should handle database connection errors", async () => {
      mockQueryRunner.query.mockRejectedValue(new Error("Database connection failed"));

      await expect(searchService.search({ q: "test" })).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should handle Redis cache errors gracefully", async () => {
      mockRedis.get.mockRejectedValue(new Error("Redis connection failed"));
      mockQueryRunner.query.mockResolvedValue([]);

      // Should still work even if cache fails
      const result = await searchService.search({ q: "test" });
      expect(result).toBeDefined();
    });

    it("should handle Redis initialization failure gracefully", async () => {
      // Test Redis connection failure during initialization
      mockRedis.connect.mockRejectedValue(new Error("Redis connection failed"));

      // Create new service instance to trigger initialization error
      const failingService = new SearchService();

      // Should still work without Redis
      mockQueryRunner.query.mockResolvedValue([]);
      const result = await failingService.search({ q: "test" });
      expect(result).toBeDefined();
    });

    it("should disable Redis temporarily on operation failures", async () => {
      mockRedis.get.mockRejectedValue(new Error("Redis operation failed"));
      mockQueryRunner.query.mockResolvedValue([]);

      await searchService.search({ q: "test" });

      // Redis should be marked as unavailable
      expect(mockRedis.setEx).not.toHaveBeenCalled();
    });

    it("should validate search parameters", async () => {
      await expect(searchService.search({ q: "", page: 0 })).rejects.toThrow();

      await expect(searchService.search({ q: "test", pageSize: 0 })).rejects.toThrow();

      await expect(searchService.search({ q: "test", pageSize: 101 })).rejects.toThrow();
    });
  });

  describe("analytics tracking", () => {
    it("should track search analytics", async () => {
      mockQueryRunner.query.mockResolvedValue([]);
      mockRedis.get.mockResolvedValue(null);

      await searchService.search({
        q: "analytics test",
        page: 1,
        pageSize: 50,
      });

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        expect.stringContaining("search_analytics:"),
        86400, // 24 hours
        expect.stringContaining('"query":"analytics test"')
      );
    });
  });

  describe("getSearchSuggestions", () => {
    it("should return empty array for now", async () => {
      const suggestions = await searchService.getSearchSuggestions("test", 5);
      expect(suggestions).toEqual([]);
    });
  });

  describe("refreshSearchView", () => {
    it("should refresh materialized view successfully", async () => {
      mockQueryRunner.query.mockResolvedValue([]);

      await searchService.refreshSearchView();

      expect(mockQueryRunner.query).toHaveBeenCalledWith("SELECT refresh_equipment_search_view()");
    });

    it("should handle refresh errors", async () => {
      mockQueryRunner.query.mockRejectedValue(new Error("Refresh failed"));

      await expect(searchService.refreshSearchView()).rejects.toThrow("Refresh failed");
    });
  });

  describe("getSearchMetrics", () => {
    it("should return analytics metrics", async () => {
      const mockAnalytics = [
        {
          query: "test",
          executionTime: 50,
          resultCount: 10,
          timestamp: "2025-08-20T05:31:46.870Z",
        },
      ];

      // Mock scanIterator to return the keys
      mockRedis.scanIterator = jest.fn().mockImplementation(function* () {
        yield "search_analytics:1";
        yield "search_analytics:2";
      });

      // Mock mget to return the values
      mockRedis.mget.mockResolvedValue([JSON.stringify(mockAnalytics[0]), null]);

      const metrics = await searchService.getSearchMetrics();

      expect(metrics).toEqual([
        {
          ...mockAnalytics[0],
          timestamp: new Date(mockAnalytics[0].timestamp),
        },
      ]);
    });
  });

  describe("security", () => {
    it("should sanitize highlighted fields to prevent XSS", async () => {
      const mockResult = [
        {
          plc_id: "1",
          tag_id: "test",
          plc_description: "test description",
          make: "test",
          model: "test",
          ip_address: null,
          firmware_version: null,
          equipment_id: "1",
          equipment_name: "test",
          equipment_type: "test",
          cell_id: "1",
          cell_name: "test",
          line_number: "1",
          site_id: "1",
          site_name: "test",
          hierarchy_path: "test",
          relevance_score: 1.0,
          highlighted_fields: {
            description: "<script>alert(1)</script><mark>test</mark>",
            make: "<img src=x onerror=alert(1)><b>test</b>",
            model: "<mark>safe content</mark>",
          },
          tags_text: "test",
        },
      ];

      mockQueryRunner.query.mockResolvedValue(mockResult);
      mockRedis.get.mockResolvedValue(null);

      const result = await searchService.search({
        q: "test",
        includeHighlights: true,
      });

      // Verify XSS payloads are removed but safe highlighting is preserved
      expect(result.data[0].highlighted_fields?.description).toBe("<mark>test</mark>");
      expect(result.data[0].highlighted_fields?.make).toBe("<b>test</b>");
      expect(result.data[0].highlighted_fields?.model).toBe("<mark>safe content</mark>");

      // Verify dangerous content was stripped
      expect(result.data[0].highlighted_fields?.description).not.toContain("<script>");
      expect(result.data[0].highlighted_fields?.make).not.toContain("onerror=");
    });
  });
});
