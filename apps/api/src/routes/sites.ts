/**
 * Site Management Routes
 *
 * Provides comprehensive site CRUD operations with authentication, authorization,
 * statistics, and audit logging integration.
 */

import { Request, Response, Router } from 'express';
import { SiteService } from '../services/SiteService';
import { authenticate, authorize } from '../middleware/auth';
import { writeOpsRateLimit } from '../middleware/rateLimiter';
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
 * @swagger
 * /api/v1/sites:
 *   post:
 *     summary: Create a new site
 *     description: Creates a new site in the hierarchy system
 *     tags:
 *       - Sites
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 description: Unique site name
 *               description:
 *                 type: string
 *                 description: Site description
 *               location:
 *                 type: string
 *                 description: Physical location of the site
 *               metadata:
 *                 type: object
 *                 description: Additional site metadata
 *     responses:
 *       201:
 *         description: Site created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Site with same name already exists
 */
router.post(
  '/',
  authenticate,
  authorize(['sites.create']),
  writeOpsRateLimit,
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
 * @swagger
 * /api/v1/sites:
 *   get:
 *     summary: List all sites
 *     description: Returns a paginated list of sites with optional filtering and sorting
 *     tags:
 *       - Sites
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Page number (1-indexed)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: Items per page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - name: search
 *         in: query
 *         description: Search term for name or description
 *         schema:
 *           type: string
 *       - name: sortBy
 *         in: query
 *         description: Field to sort by
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt]
 *           default: createdAt
 *       - name: sortOrder
 *         in: query
 *         description: Sort order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: List of sites retrieved successfully
 *       401:
 *         description: Unauthorized
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
 * GET /sites/:siteId
 * Get specific site by ID
 */
router.get(
  '/:siteId',
  authenticate,
  authorize(['sites.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate path parameters
    const params = validateSchema(siteIdParamSchema)(req.params);

    const siteService = getSiteService(req);
    const site = await siteService.getSiteById(params.siteId);

    res.status(200).json({
      site,
    });
  }, 'Failed to fetch site')
);

/**
 * @swagger
 * /api/v1/sites/{siteId}:
 *   put:
 *     summary: Update a site
 *     description: Updates an existing site with optimistic locking
 *     tags:
 *       - Sites
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: siteId
 *         in: path
 *         required: true
 *         description: Site UUID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updatedAt
 *             properties:
 *               name:
 *                 type: string
 *                 description: Site name
 *               description:
 *                 type: string
 *                 description: Site description
 *               location:
 *                 type: string
 *                 description: Physical location
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *               updatedAt:
 *                 type: string
 *                 format: date-time
 *                 description: Last updated timestamp for optimistic locking
 *     responses:
 *       200:
 *         description: Site updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Site not found
 *       409:
 *         description: Optimistic locking conflict
 */
router.put(
  '/:siteId',
  authenticate,
  authorize(['sites.update']),
  writeOpsRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate path parameters
    const params = validateSchema(siteIdParamSchema)(req.params);

    // Validate request body
    const updateData = validateSchema(updateSiteSchema)(req.body);
    const { updatedAt, ...siteUpdateData } = updateData;

    const siteService = getSiteService(req);
    const site = await siteService.updateSite(params.siteId, siteUpdateData, new Date(updatedAt), {
      userId: req.user!.sub,
    });

    logger.info('Site updated successfully', {
      siteId: params.siteId,
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
 * DELETE /sites/:siteId
 * Delete specific site
 */
router.delete(
  '/:siteId',
  authenticate,
  authorize(['sites.delete']),
  writeOpsRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate path parameters
    const params = validateSchema(siteIdParamSchema)(req.params);

    const siteService = getSiteService(req);
    await siteService.deleteSite(params.siteId, {
      userId: req.user!.sub,
    });

    logger.info('Site deleted successfully', {
      siteId: params.siteId,
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
  writeOpsRateLimit,
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
