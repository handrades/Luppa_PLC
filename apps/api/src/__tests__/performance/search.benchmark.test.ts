/**
 * Search Performance Benchmark Tests
 * 
 * Tests to ensure search performance meets requirements
 */

import { SearchService } from '../../services/SearchService';
import { AppDataSource } from '../../config/database';
import { createClient } from 'redis';

// Mock dependencies
jest.mock('redis');
jest.mock('../../config/database');

describe('Search Performance Benchmarks', () => {
  let searchService: SearchService;
  let mockRedis: jest.Mocked<ReturnType<typeof createClient>>;
  let mockQueryRunner: { query: jest.Mock; release: jest.Mock };

  beforeAll(() => {
    // Increase timeout for performance tests
    jest.setTimeout(60000);
  });

  beforeEach(() => {
    mockRedis = {
      get: jest.fn(),
      setEx: jest.fn(),
      keys: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn().mockResolvedValue('PONG'),
      on: jest.fn(),
    };
    (createClient as jest.MockedFunction<typeof createClient>).mockReturnValue(mockRedis);

    mockQueryRunner = {
      query: jest.fn(),
      release: jest.fn(),
    };
    (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);

    searchService = new SearchService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('query execution time benchmarks', () => {
    it('should execute simple search in under 100ms', async () => {
      // Mock fast database response
      mockQueryRunner.query.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 50))
      );
      mockRedis.get.mockResolvedValue(null);

      const startTime = performance.now();
      
      await searchService.search({
        q: 'test',
        page: 1,
        pageSize: 50,
      });

      const executionTime = performance.now() - startTime;
      expect(executionTime).toBeLessThan(100);
    });

    it('should execute complex search in under 200ms', async () => {
      // Mock moderate database response time
      mockQueryRunner.query.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 150))
      );
      mockRedis.get.mockResolvedValue(null);

      const startTime = performance.now();
      
      await searchService.search({
        q: 'complex search with multiple terms and filters',
        page: 1,
        pageSize: 100,
        includeHighlights: true,
        sortBy: 'relevance',
      });

      const executionTime = performance.now() - startTime;
      expect(executionTime).toBeLessThan(200);
    });

    it('should handle 1000 results in under 500ms', async () => {
      const largeResultSet = Array.from({ length: 1000 }, (_, i) => ({
        plc_id: `plc-${i}`,
        tag_id: `PLC-${i.toString().padStart(4, '0')}`,
        plc_description: `Large dataset PLC ${i}`,
        make: 'Performance Test',
        model: 'Benchmark',
        relevance_score: Math.random(),
        hierarchy_path: `Site > Cell > Equipment > PLC-${i}`,
      }));

      mockQueryRunner.query.mockResolvedValue(largeResultSet);
      mockRedis.get.mockResolvedValue(null);

      const startTime = performance.now();
      
      const result = await searchService.search({
        q: 'performance test',
        page: 1,
        pageSize: 100,
        maxResults: 1000,
      });

      const executionTime = performance.now() - startTime;
      
      expect(executionTime).toBeLessThan(500);
      expect(result.data).toBeDefined();
      expect(result.pagination.total).toBe(1000);
    });
  });

  describe('cache performance benchmarks', () => {
    it('should serve cached results in under 10ms', async () => {
      const cachedResult = {
        data: [],
        pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        searchMetadata: { query: 'cached', searchType: 'fulltext', totalMatches: 0, executionTimeMs: 5 },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResult));

      const startTime = performance.now();
      
      await searchService.search({
        q: 'cached',
        page: 1,
        pageSize: 50,
      });

      const executionTime = performance.now() - startTime;
      expect(executionTime).toBeLessThan(10);
    });

    it('should cache large results efficiently', async () => {
      const largeResults = Array.from({ length: 500 }, (_, i) => ({
        plc_id: `plc-${i}`,
        tag_id: `PLC-${i}`,
        plc_description: `Cache test PLC ${i}`,
        relevance_score: Math.random(),
      }));

      mockQueryRunner.query.mockResolvedValue(largeResults);
      mockRedis.get.mockResolvedValue(null);

      const startTime = performance.now();
      
      await searchService.search({
        q: 'cache performance',
        page: 1,
        pageSize: 50,
      });

      const cacheTime = performance.now() - startTime;
      
      // Should cache even large results quickly
      expect(mockRedis.setEx).toHaveBeenCalled();
      expect(cacheTime).toBeLessThan(1000);
    });
  });

  describe('concurrent request benchmarks', () => {
    it('should handle 10 concurrent searches efficiently', async () => {
      mockQueryRunner.query.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      );
      mockRedis.get.mockResolvedValue(null);

      const startTime = performance.now();
      
      const promises = Array.from({ length: 10 }, (_, i) =>
        searchService.search({
          q: `concurrent-${i}`,
          page: 1,
          pageSize: 20,
        })
      );

      const results = await Promise.all(promises);

      const totalTime = performance.now() - startTime;
      
      // Should complete all 10 searches in reasonable time
      expect(totalTime).toBeLessThan(2000);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.searchMetadata).toBeDefined();
      });
    });

    it('should maintain performance under load', async () => {
      // Simulate varying response times
      mockQueryRunner.query.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve([]), Math.random() * 200 + 50)
        )
      );
      mockRedis.get.mockResolvedValue(null);

      const iterations = 50;
      const results: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await searchService.search({
          q: `load-test-${i}`,
          page: 1,
          pageSize: 25,
        });

        const executionTime = performance.now() - startTime;
        results.push(executionTime);
      }

      // Calculate statistics
      const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      const maxTime = Math.max(...results);
      const _minTime = Math.min(...results); // eslint-disable-line @typescript-eslint/no-unused-vars

      // Load test results over ${iterations} iterations
      // Average: ${avgTime.toFixed(2)}ms
      // Min: ${minTime.toFixed(2)}ms  
      // Max: ${maxTime.toFixed(2)}ms

      // Performance requirements
      expect(avgTime).toBeLessThan(300);
      expect(maxTime).toBeLessThan(1000);
    }, 30000); // 30 second timeout
  });

  describe('memory usage benchmarks', () => {
    it('should not leak memory during repeated searches', async () => {
      mockQueryRunner.query.mockResolvedValue([]);
      mockRedis.get.mockResolvedValue(null);

      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many searches
      for (let i = 0; i < 100; i++) {
        await searchService.search({
          q: `memory-test-${i}`,
          page: 1,
          pageSize: 50,
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });

  describe('database query optimization benchmarks', () => {
    it('should generate efficient PostgreSQL queries', async () => {
      mockQueryRunner.query.mockResolvedValue([]);

      await searchService.search({
        q: 'optimization test fulltext query',
        page: 1,
        pageSize: 50,
      });

      // Find the query that contains ts_rank (full-text search query)
      const tsRankQuery = mockQueryRunner.query.mock.calls
        .map(call => call[0])
        .find(query => typeof query === 'string' && query.includes('ts_rank'));

      if (!tsRankQuery) {
        fail('No query containing ts_rank was found in mock calls. Available queries: ' + 
             mockQueryRunner.query.mock.calls.map(call => call[0]).join('\n---\n'));
      }

      // Verify query contains performance optimizations
      expect(tsRankQuery).toContain('ts_rank'); // Full-text search ranking
      expect(tsRankQuery).toContain('LIMIT'); // Pagination
      expect(tsRankQuery).not.toContain('SELECT *'); // Should select specific columns
    });

    it('should use appropriate search strategy based on query', async () => {
      const testCases = [
        { query: 'a', expectedCalls: 1 }, // Should use similarity search
        { query: 'AB', expectedCalls: 1 }, // Should use similarity search
        { query: 'ABC DEF', expectedCalls: 2 }, // Should use hybrid search (2 calls)
        { query: 'long multi word query test', expectedCalls: 1 }, // Should use full-text
      ];

      for (const testCase of testCases) {
        mockQueryRunner.query.mockClear();
        mockQueryRunner.query.mockResolvedValue([]);

        await searchService.search({
          q: testCase.query,
          page: 1,
          pageSize: 50,
        });

        expect(mockQueryRunner.query).toHaveBeenCalledTimes(testCase.expectedCalls);
      }
    });
  });

  describe('pagination performance benchmarks', () => {
    it('should handle deep pagination efficiently', async () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        plc_id: `plc-${i}`,
        tag_id: `PLC-${i}`,
        relevance_score: Math.random(),
      }));

      mockQueryRunner.query.mockResolvedValue(mockData);
      mockRedis.get.mockResolvedValue(null);

      // Test pagination at page 20
      const startTime = performance.now();
      
      const result = await searchService.search({
        q: 'pagination test',
        page: 20,
        pageSize: 50,
      });

      const executionTime = performance.now() - startTime;

      // Deep pagination should still be fast
      expect(executionTime).toBeLessThan(200);
      expect(result.pagination.page).toBe(20);
    });
  });

  describe('highlighting performance benchmarks', () => {
    it('should generate highlights efficiently for large text', async () => {
      const longDescription = 'A'.repeat(1000) + ' test description ' + 'B'.repeat(1000);
      
      const mockData = Array.from({ length: 50 }, (_, i) => ({
        plc_id: `plc-${i}`,
        tag_id: `PLC-${i}`,
        plc_description: longDescription,
        relevance_score: Math.random(),
      }));

      mockQueryRunner.query.mockResolvedValue(mockData);
      mockRedis.get.mockResolvedValue(null);

      const startTime = performance.now();
      
      await searchService.search({
        q: 'test',
        page: 1,
        pageSize: 50,
        includeHighlights: true,
      });

      const executionTime = performance.now() - startTime;

      // Highlighting should not significantly impact performance
      expect(executionTime).toBeLessThan(500);
    });
  });
});
