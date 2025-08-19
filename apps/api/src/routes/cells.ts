/**
 * Cell Management Routes
 *
 * Provides comprehensive cell CRUD operations with authentication, authorization,
 * statistics, hierarchy management, and audit logging integration.
 */

import { Request, Response, Router } from 'express';
import { CellService } from '../services/CellService';
import { authenticate, authorize, authorizeAll } from '../middleware/auth';
import { writeOpsRateLimit } from '../middleware/rateLimiter';
import {
  cellBulkOperationSchema,
  cellIdParamSchema,
  cellSearchSchema,
  cellStatisticsSchema,
  cellSuggestionsSchema,
  cellUniquenessSchema,
  createCellSchema,
  hierarchyIntegritySchema,
  sitesCellsParamSchema,
  updateCellSchema,
  validateSchema,
} from '../validation/cellSchemas';
import { logger } from '../config/logger';
import { getClientIP } from '../utils/ip';
import { asyncHandler } from '../utils/errorHandler';

const router: Router = Router();

/**
 * Get CellService with request-scoped EntityManager for audit context
 */
const getCellService = (req: Request): CellService => {
  if (!req.auditEntityManager) {
    throw new Error(
      'auditEntityManager is not available on request. Ensure auditContext middleware is registered before cell routes.'
    );
  }
  return new CellService(req.auditEntityManager);
};

/**
 * POST /cells
 * Create new cell
 */
router.post(
  '/',
  authenticate,
  authorize(['cells.create']),
  writeOpsRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const cellData = validateSchema(createCellSchema)(req.body);

    const cellService = getCellService(req);
    const cell = await cellService.createCell(cellData, {
      userId: req.user!.sub,
    });

    logger.info('Cell created successfully', {
      cellId: cell.id,
      siteId: cell.siteId,
      siteName: cell.siteName,
      name: cell.name,
      lineNumber: cell.lineNumber,
      createdBy: req.user?.sub,
      ipAddress: getClientIP(req),
    });

    res.status(201).json({
      message: 'Cell created successfully',
      cell,
    });
  }, 'Failed to create cell')
);

/**
 * GET /cells
 * List cells with filtering and pagination
 */
router.get(
  '/',
  authenticate,
  authorize(['cells.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const filters = validateSchema(cellSearchSchema)(req.query);

    const cellService = getCellService(req);
    const result = await cellService.searchCells(filters);

    res.status(200).json({
      data: result.data,
      pagination: result.pagination,
    });
  }, 'Failed to fetch cells')
);

/**
 * GET /cells/statistics
 * Get cell statistics for dashboard
 */
router.get(
  '/statistics',
  authenticate,
  authorize(['cells.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    validateSchema(cellStatisticsSchema)(req.query);

    const cellService = getCellService(req);
    const statistics = await cellService.getCellStatistics();

    res.status(200).json(statistics);
  }, 'Failed to fetch cell statistics')
);

/**
 * GET /cells/suggestions
 * Get cell suggestions for autocomplete
 */
router.get(
  '/suggestions',
  authenticate,
  authorize(['cells.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const params = validateSchema(cellSuggestionsSchema)(req.query);

    const cellService = getCellService(req);
    const suggestions = await cellService.getCellSuggestions(params.siteId, params.q, params.limit);

    res.status(200).json({
      suggestions,
    });
  }, 'Failed to fetch cell suggestions')
);

/**
 * POST /cells/validate-uniqueness
 * Validate cell line number uniqueness within site
 */
router.post(
  '/validate-uniqueness',
  authenticate,
  authorize(['cells.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const params = validateSchema(cellUniquenessSchema)(req.body);

    const cellService = getCellService(req);
    const isUnique = await cellService.validateCellUniqueness(
      params.siteId,
      params.lineNumber,
      params.excludeId
    );

    res.status(200).json({
      isUnique,
      siteId: params.siteId,
      lineNumber: params.lineNumber,
    });
  }, 'Failed to validate cell uniqueness')
);

/**
 * POST /cells/validate-hierarchy
 * Validate hierarchy integrity
 */
router.post(
  '/validate-hierarchy',
  authenticate,
  authorizeAll(['cells.read', 'hierarchy.manage']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    validateSchema(hierarchyIntegritySchema)(req.body);

    const cellService = getCellService(req);
    const result = await cellService.validateHierarchyIntegrity();

    logger.info('Hierarchy integrity check completed', {
      isValid: result.isValid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      executedBy: req.user?.sub,
      ipAddress: getClientIP(req),
    });

    res.status(200).json(result);
  }, 'Failed to validate hierarchy integrity')
);

/**
 * GET /cells/:id
 * Get specific cell by ID
 */
router.get(
  '/:id',
  authenticate,
  authorize(['cells.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate path parameters
    const params = validateSchema(cellIdParamSchema)(req.params);

    const cellService = getCellService(req);
    const cell = await cellService.getCellById(params.id);

    res.status(200).json({
      cell,
    });
  }, 'Failed to fetch cell')
);

/**
 * PUT /cells/:id
 * Update specific cell
 */
router.put(
  '/:id',
  authenticate,
  authorize(['cells.update']),
  writeOpsRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate path parameters
    const params = validateSchema(cellIdParamSchema)(req.params);

    // Validate request body
    const updateData = validateSchema(updateCellSchema)(req.body);
    const { updatedAt, ...cellUpdateData } = updateData;

    const cellService = getCellService(req);
    const cell = await cellService.updateCell(params.id, cellUpdateData, new Date(updatedAt), {
      userId: req.user!.sub,
    });

    logger.info('Cell updated successfully', {
      cellId: params.id,
      siteId: cell.siteId,
      siteName: cell.siteName,
      updatedFields: Object.keys(cellUpdateData),
      updatedBy: req.user?.sub,
      ipAddress: getClientIP(req),
    });

    res.status(200).json({
      message: 'Cell updated successfully',
      cell,
    });
  }, 'Failed to update cell')
);

/**
 * DELETE /cells/:id
 * Delete specific cell
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['cells.delete']),
  writeOpsRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate path parameters
    const params = validateSchema(cellIdParamSchema)(req.params);

    const cellService = getCellService(req);
    await cellService.deleteCell(params.id, {
      userId: req.user!.sub,
    });

    logger.info('Cell deleted successfully', {
      cellId: params.id,
      deletedBy: req.user?.sub,
      ipAddress: getClientIP(req),
    });

    res.status(200).json({
      message: 'Cell deleted successfully',
    });
  }, 'Failed to delete cell')
);

/**
 * POST /cells/bulk
 * Perform bulk operations on cells
 */
router.post(
  '/bulk',
  authenticate,
  authorize(['cells.delete', 'cells.read', 'cells.update']),
  writeOpsRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const bulkData = validateSchema(cellBulkOperationSchema)(req.body);

    const cellService = getCellService(req);

    if (bulkData.operation === 'delete') {
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const cellId of bulkData.cellIds) {
        try {
          await cellService.deleteCell(cellId, {
            userId: req.user!.sub,
          });
          results.push({ cellId, status: 'success' });
          successCount++;
        } catch (error) {
          results.push({
            cellId,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          errorCount++;
        }
      }

      logger.info('Bulk delete cells completed', {
        totalCells: bulkData.cellIds.length,
        successCount,
        errorCount,
        executedBy: req.user?.sub,
        ipAddress: getClientIP(req),
      });

      res.status(200).json({
        message: `Bulk delete completed: ${successCount} succeeded, ${errorCount} failed`,
        results,
        summary: {
          total: bulkData.cellIds.length,
          success: successCount,
          errors: errorCount,
        },
      });
    } else if (bulkData.operation === 'export') {
      // Get all requested cells
      const cells = [];
      for (const cellId of bulkData.cellIds) {
        try {
          const cell = await cellService.getCellById(cellId);
          cells.push(cell);
        } catch (error) {
          // Skip cells that don't exist
          logger.warn('Cell not found during bulk export', {
            cellId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Bulk export cells completed', {
        totalCells: cells.length,
        requestedCells: bulkData.cellIds.length,
        executedBy: req.user?.sub,
        ipAddress: getClientIP(req),
      });

      res.status(200).json({
        message: 'Bulk export completed',
        cells,
        summary: {
          exported: cells.length,
          requested: bulkData.cellIds.length,
        },
      });
    } else if (bulkData.operation === 'move' && bulkData.targetSiteId) {
      // Note: Moving cells between sites is complex and would require updating
      // line number uniqueness constraints. For now, we'll return a not implemented response.
      res.status(501).json({
        message: 'Bulk move operation is not yet implemented',
        details: 'Moving cells between sites requires careful handling of line number constraints',
      });
    }
  }, 'Failed to perform bulk operation')
);

/**
 * Nested route: GET /sites/:siteId/cells
 * Get cells for a specific site
 */
router.get(
  '/sites/:siteId/cells',
  authenticate,
  authorize(['cells.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate path parameters
    const params = validateSchema(sitesCellsParamSchema)(req.params);

    const cellService = getCellService(req);
    const cells = await cellService.getCellsBySite(params.siteId);

    res.status(200).json({
      siteId: params.siteId,
      cells,
    });
  }, 'Failed to fetch cells for site')
);

export default router;
