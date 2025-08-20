/**
 * Search Routes
 *
 * Provides full-text search capabilities for equipment and PLCs with
 * comprehensive filtering, pagination, and performance optimization.
 */

import { Request, Response, Router } from 'express';
import { SearchService } from '../services/SearchService';
import { authenticate, authorize } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimiter';
import {
  searchEquipmentSchema,
  searchMetricsSchema,
  searchSuggestionsSchema,
  validateSchema,
} from '../validation/searchSchemas';
import { logger } from '../config/logger';
import { getClientIP } from '../utils/ip';
import { asyncHandler } from '../utils/errorHandler';

const router: Router = Router();

// Initialize SearchService
const searchService = new SearchService();

/**
 * GET /api/equipment/search
 * Full-text search across all equipment fields
 */
router.get(
  '/equipment',
  authenticate,
  authorize(['equipment.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const searchQuery = validateSchema(searchEquipmentSchema)(req.query);

    // Track search request for analytics
    logger.info('Equipment search request', {
      query: searchQuery.q,
      fields: searchQuery.fields,
      sortBy: searchQuery.sortBy,
      userId: req.user?.sub,
      ipAddress: getClientIP(req),
    });

    // Execute search
    const searchResults = await searchService.search(searchQuery);

    // Log search performance metrics
    logger.info('Equipment search completed', {
      query: searchQuery.q,
      resultCount: searchResults.searchMetadata.totalMatches,
      executionTime: searchResults.searchMetadata.executionTimeMs,
      searchType: searchResults.searchMetadata.searchType,
      userId: req.user?.sub,
    });

    res.status(200).json(searchResults);
  }, 'Failed to perform equipment search')
);

/**
 * GET /api/search/suggestions
 * Get search suggestions based on partial query
 */
router.get(
  '/suggestions',
  authenticate,
  authorize(['equipment.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const { q, limit } = validateSchema(searchSuggestionsSchema)(req.query);

    // Get search suggestions
    const suggestions = await searchService.getSearchSuggestions(q, limit);

    res.status(200).json({
      query: q,
      suggestions,
      count: suggestions.length,
    });
  }, 'Failed to get search suggestions')
);

/**
 * POST /api/search/refresh
 * Refresh search materialized view (admin only)
 */
router.post(
  '/refresh',
  authenticate,
  authorize(['admin']),
  authRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Search view refresh requested', {
      userId: req.user?.sub,
      ipAddress: getClientIP(req),
    });

    // Refresh materialized view
    await searchService.refreshSearchView();

    logger.info('Search view refresh completed', {
      userId: req.user?.sub,
    });

    res.status(200).json({
      message: 'Search view refreshed successfully',
      refreshedAt: new Date().toISOString(),
    });
  }, 'Failed to refresh search view')
);

/**
 * GET /api/search/metrics
 * Get search performance metrics (admin only)
 */
router.get(
  '/metrics',
  authenticate,
  authorize(['admin']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const { timeRange, includeDetails } = validateSchema(searchMetricsSchema)(req.query);

    // Get search metrics
    const metrics = await searchService.getSearchMetrics(timeRange);

    // Process metrics for response
    const processedMetrics = {
      timeRange,
      totalSearches: metrics.length,
      averageExecutionTime:
        metrics.length > 0
          ? metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length
          : 0,
      averageResultCount:
        metrics.length > 0
          ? metrics.reduce((sum, m) => sum + m.resultCount, 0) / metrics.length
          : 0,
      searchTypes: metrics.reduce(
        (acc, m) => {
          acc[m.searchType] = (acc[m.searchType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      ...(includeDetails && { details: metrics }),
    };

    res.status(200).json({
      metrics: processedMetrics,
      generatedAt: new Date().toISOString(),
    });
  }, 'Failed to get search metrics')
);

/**
 * GET /api/search/health
 * Search service health check
 */
router.get(
  '/health',
  authenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    const healthStart = Date.now();

    try {
      // Perform a lightweight search to test functionality
      const testResult = await searchService.search({
        q: 'test',
        page: 1,
        pageSize: 1,
        maxResults: 1,
      });

      const healthTime = Date.now() - healthStart;

      res.status(200).json({
        status: 'healthy',
        service: 'search',
        responseTime: healthTime,
        timestamp: new Date().toISOString(),
        testQuery: {
          executed: true,
          resultCount: testResult.searchMetadata.totalMatches,
          executionTime: testResult.searchMetadata.executionTimeMs,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Search health check failed', { error: errorMessage });

      res.status(503).json({
        status: 'unhealthy',
        service: 'search',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }, 'Search health check failed')
);

export default router;
