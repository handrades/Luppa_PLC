import { Request, Response, Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import analyticsService from '../services/AnalyticsService';
import { asyncHandler } from '../utils/errorHandler';
import { logger } from '../config/logger';
import { JwtPayload } from '../config/jwt';
import Joi from 'joi';

// Extend Request type for authenticated routes
interface AuthRequest extends Request {
  user?: JwtPayload;
}

const router: Router = Router();

// Apply authentication to all analytics routes
router.use(authenticate);

// Validation schemas
const topModelsQuerySchema = Joi.object({
  limit: Joi.number().min(5).max(50).default(10),
});

const recentActivityQuerySchema = Joi.object({
  limit: Joi.number().min(10).max(100).default(20),
  page: Joi.number().min(1).default(1),
});

const hierarchyQuerySchema = Joi.object({
  depth: Joi.number().min(1).max(3).default(3),
});

const exportBodySchema = Joi.object({
  format: Joi.string().valid('pdf').required(),
  sections: Joi.array()
    .items(Joi.string().valid('overview', 'distribution', 'topModels', 'hierarchy', 'activity'))
    .min(1)
    .required(),
  includeTimestamp: Joi.boolean().default(true),
});

/**
 * @swagger
 * /api/v1/analytics/overview:
 *   get:
 *     summary: Get dashboard overview statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardOverview'
 */
router.get(
  '/overview',
  authorize(['analytics_viewer', 'admin']),
  asyncHandler(async (_req: Request, res: Response) => {
    const overview = await analyticsService.getEquipmentOverview();

    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      success: true,
      data: overview,
    });
  })
);

/**
 * @swagger
 * /api/v1/analytics/distribution/{type}:
 *   get:
 *     summary: Get equipment distribution by type
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [site, make, equipment_type]
 *         description: Distribution type
 *     responses:
 *       200:
 *         description: Distribution data
 */
router.get(
  '/distribution/:type',
  authorize(['analytics_viewer', 'admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params;

    let data;
    switch (type) {
      case 'site':
        data = await analyticsService.getDistributionBySite();
        break;
      case 'make':
        data = await analyticsService.getDistributionByMake();
        break;
      case 'equipment_type':
        data = await analyticsService.getDistributionByType();
        break;
      default:
        res.status(400).json({
          success: false,
          error: 'Invalid distribution type. Valid types: site, make, equipment_type',
        });
        return;
    }

    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      success: true,
      data,
    });
  })
);

/**
 * @swagger
 * /api/v1/analytics/top-models:
 *   get:
 *     summary: Get top equipment models
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 5
 *           maximum: 50
 *           default: 10
 *         description: Number of top models to return
 *     responses:
 *       200:
 *         description: Top models data
 */
router.get(
  '/top-models',
  authorize(['analytics_viewer', 'admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = topModelsQuerySchema.validate(req.query);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
      return;
    }

    const topModels = await analyticsService.getTopModels(value.limit);

    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      success: true,
      data: topModels,
    });
  })
);

/**
 * @swagger
 * /api/v1/analytics/hierarchy:
 *   get:
 *     summary: Get equipment hierarchy statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: depth
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 3
 *           default: 3
 *         description: Hierarchy depth level
 *     responses:
 *       200:
 *         description: Hierarchy statistics
 */
router.get(
  '/hierarchy',
  authorize(['analytics_viewer', 'admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = hierarchyQuerySchema.validate(req.query);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
      return;
    }

    const hierarchy = await analyticsService.getHierarchyStatistics(value.depth);

    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      success: true,
      data: hierarchy,
    });
  })
);

/**
 * @swagger
 * /api/v1/analytics/recent-activity:
 *   get:
 *     summary: Get recent equipment activity
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 10
 *           maximum: 100
 *           default: 20
 *         description: Number of activities to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: Recent activity list
 */
router.get(
  '/recent-activity',
  authorize(['analytics_viewer', 'admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = recentActivityQuerySchema.validate(req.query);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
      return;
    }

    // Calculate offset for pagination
    const offset = (value.page - 1) * value.limit;
    const activities = await analyticsService.getRecentActivity(value.limit, offset);

    res.set('Cache-Control', 'public, max-age=30');
    res.json({
      success: true,
      data: activities,
      pagination: {
        page: value.page,
        limit: value.limit,
        hasMore: activities.length === value.limit,
      },
    });
  })
);

/**
 * @swagger
 * /api/v1/analytics/export:
 *   post:
 *     summary: Export analytics dashboard as PDF
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - format
 *               - sections
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [pdf]
 *               sections:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [overview, distribution, topModels, hierarchy, activity]
 *               includeTimestamp:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Export initiated successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/export',
  authorize(['analytics_export', 'admin']),
  asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = exportBodySchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
      return;
    }

    // Log the export request
    const authReq = req as AuthRequest;
    logger.info('Analytics export requested', {
      userId: authReq.user?.sub,
      format: value.format,
      sections: value.sections,
    });

    // Gather data for requested sections
    const exportData: Record<string, unknown> = {};

    if (value.sections.includes('overview')) {
      exportData.overview = await analyticsService.getEquipmentOverview();
    }

    if (value.sections.includes('distribution')) {
      exportData.distribution = {
        site: await analyticsService.getDistributionBySite(),
        make: await analyticsService.getDistributionByMake(),
        type: await analyticsService.getDistributionByType(),
      };
    }

    if (value.sections.includes('topModels')) {
      exportData.topModels = await analyticsService.getTopModels(10);
    }

    if (value.sections.includes('hierarchy')) {
      exportData.hierarchy = await analyticsService.getHierarchyStatistics();
    }

    if (value.sections.includes('activity')) {
      exportData.activity = await analyticsService.getRecentActivity(50);
    }

    // Add metadata
    exportData.metadata = {
      generatedAt: new Date(),
      generatedBy: authReq.user?.email || 'Unknown',
      format: value.format,
    };

    // Note: Actual PDF generation will be handled on the frontend
    // This endpoint prepares and returns the data
    res.json({
      success: true,
      data: exportData,
      message: 'Export data prepared successfully',
    });
  })
);

/**
 * @swagger
 * /api/v1/analytics/cache/clear:
 *   post:
 *     summary: Clear analytics cache (admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *       403:
 *         description: Admin access required
 */
router.post(
  '/cache/clear',
  authorize(['admin']),
  asyncHandler(async (req: Request, res: Response) => {
    await analyticsService.clearCache();

    const authReq = req as AuthRequest;
    logger.info('Analytics cache cleared', {
      userId: authReq.user?.sub,
    });

    res.json({
      success: true,
      message: 'Analytics cache cleared successfully',
    });
  })
);

export default router;
