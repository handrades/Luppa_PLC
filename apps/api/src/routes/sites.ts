/**
 * Site Management Routes
 *
 * Provides comprehensive site CRUD operations with authentication, authorization,
 * statistics, and audit logging integration.
 */

import { Request, Response, Router } from 'express';
import { SiteService } from '../services/SiteService';
import { authenticate, authorize } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimiter';
import {
  createSiteSchema,
  siteBulkOperationSchema,
  siteIdParamSchema,
  siteSearchSchema,
  siteStatisticsSchema,
  siteSuggestionsSchema,
  siteUniquenessSchema,
  updateSiteSchema,
  validateSchema,
} from '../validation/siteSchemas';
import { logger } from '../config/logger';
import { getClientIP } from '../utils/ip';
import { asyncHandler } from '../utils/errorHandler';

const router: Router = Router();

/**
 * Get SiteService with request-scoped EntityManager for audit context
 */
const getSiteService = (req: Request): SiteService => {
  if (!req.auditEntityManager) {
    throw new Error(
      'auditEntityManager is not available on request. Ensure auditContext middleware is registered before site routes.'
    );
  }
  return new SiteService(req.auditEntityManager);
};

/**
 * POST /sites
 * Create new site
 */
router.post(
  '/',
  authenticate,
  authorize(['sites.create']),
  authRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const siteData = validateSchema(createSiteSchema)(req.body);

    const siteService = getSiteService(req);
    const site = await siteService.createSite(siteData, {
      userId: req.user!.sub,
    });

    logger.info('Site created successfully', {
      siteId: site.id,
      name: site.name,
      createdBy: req.user?.sub,
      ipAddress: getClientIP(req),
    });

    res.status(201).json({
      message: 'Site created successfully',
      site,
    });
  }, 'Failed to create site')
);

/**
 * GET /sites
 * List sites with filtering and pagination
 */
router.get(
  '/',
  authenticate,
  authorize(['sites.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const filters = validateSchema(siteSearchSchema)(req.query);

    const siteService = getSiteService(req);
    const result = await siteService.searchSites(filters);

    res.status(200).json({
      data: result.data,
      pagination: result.pagination,
    });
  }, 'Failed to fetch sites')
);

/**
 * GET /sites/statistics
 * Get site statistics for dashboard
 */
router.get(
  '/statistics',
  authenticate,
  authorize(['sites.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    validateSchema(siteStatisticsSchema)(req.query);

    const siteService = getSiteService(req);
    const statistics = await siteService.getSiteStatistics();

    res.status(200).json(statistics);
  }, 'Failed to fetch site statistics')
);

/**
 * GET /sites/suggestions
 * Get site suggestions for autocomplete
 */
router.get(
  '/suggestions',
  authenticate,
  authorize(['sites.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const params = validateSchema(siteSuggestionsSchema)(req.query);

    const siteService = getSiteService(req);
    const suggestions = await siteService.getSiteSuggestions(params.q, params.limit);

    res.status(200).json({
      suggestions,
    });
  }, 'Failed to fetch site suggestions')
);

/**
 * POST /sites/validate-uniqueness
 * Validate site name uniqueness
 */
router.post(
  '/validate-uniqueness',
  authenticate,
  authorize(['sites.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const params = validateSchema(siteUniquenessSchema)(req.body);

    const siteService = getSiteService(req);
    const isUnique = await siteService.validateSiteUniqueness(params.name, params.excludeId);

    res.status(200).json({
      isUnique,
      name: params.name,
    });
  }, 'Failed to validate site uniqueness')
);

/**
 * GET /sites/:id
 * Get specific site by ID
 */
router.get(
  '/:id',
  authenticate,
  authorize(['sites.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate path parameters
    const params = validateSchema(siteIdParamSchema)(req.params);

    const siteService = getSiteService(req);
    const site = await siteService.getSiteById(params.id);

    res.status(200).json({
      site,
    });
  }, 'Failed to fetch site')
);

/**
 * PUT /sites/:id
 * Update specific site
 */
router.put(
  '/:id',
  authenticate,
  authorize(['sites.update']),
  authRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate path parameters
    const params = validateSchema(siteIdParamSchema)(req.params);

    // Validate request body
    const updateData = validateSchema(updateSiteSchema)(req.body);
    const { updatedAt, ...siteUpdateData } = updateData;

    const siteService = getSiteService(req);
    const site = await siteService.updateSite(params.id, siteUpdateData, new Date(updatedAt), {
      userId: req.user!.sub,
    });

    logger.info('Site updated successfully', {
      siteId: params.id,
      updatedFields: Object.keys(siteUpdateData),
      updatedBy: req.user?.sub,
      ipAddress: getClientIP(req),
    });

    res.status(200).json({
      message: 'Site updated successfully',
      site,
    });
  }, 'Failed to update site')
);

/**
 * DELETE /sites/:id
 * Delete specific site
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['sites.delete']),
  authRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate path parameters
    const params = validateSchema(siteIdParamSchema)(req.params);

    const siteService = getSiteService(req);
    await siteService.deleteSite(params.id, {
      userId: req.user!.sub,
    });

    logger.info('Site deleted successfully', {
      siteId: params.id,
      deletedBy: req.user?.sub,
      ipAddress: getClientIP(req),
    });

    res.status(200).json({
      message: 'Site deleted successfully',
    });
  }, 'Failed to delete site')
);

/**
 * POST /sites/bulk
 * Perform bulk operations on sites
 */
router.post(
  '/bulk',
  authenticate,
  authorize(['sites.delete', 'sites.read']),
  authRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const bulkData = validateSchema(siteBulkOperationSchema)(req.body);

    const siteService = getSiteService(req);

    if (bulkData.operation === 'delete') {
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const siteId of bulkData.siteIds) {
        try {
          await siteService.deleteSite(siteId, {
            userId: req.user!.sub,
          });
          results.push({ siteId, status: 'success' });
          successCount++;
        } catch (error) {
          results.push({
            siteId,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          errorCount++;
        }
      }

      logger.info('Bulk delete sites completed', {
        totalSites: bulkData.siteIds.length,
        successCount,
        errorCount,
        executedBy: req.user?.sub,
        ipAddress: getClientIP(req),
      });

      res.status(200).json({
        message: `Bulk delete completed: ${successCount} succeeded, ${errorCount} failed`,
        results,
        summary: {
          total: bulkData.siteIds.length,
          success: successCount,
          errors: errorCount,
        },
      });
    } else if (bulkData.operation === 'export') {
      // Get all requested sites
      const sites = [];
      for (const siteId of bulkData.siteIds) {
        try {
          const site = await siteService.getSiteById(siteId);
          sites.push(site);
        } catch (error) {
          // Skip sites that don't exist
          logger.warn('Site not found during bulk export', {
            siteId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Bulk export sites completed', {
        totalSites: sites.length,
        requestedSites: bulkData.siteIds.length,
        executedBy: req.user?.sub,
        ipAddress: getClientIP(req),
      });

      res.status(200).json({
        message: 'Bulk export completed',
        sites,
        summary: {
          exported: sites.length,
          requested: bulkData.siteIds.length,
        },
      });
    }
  }, 'Failed to perform bulk operation')
);

export default router;
