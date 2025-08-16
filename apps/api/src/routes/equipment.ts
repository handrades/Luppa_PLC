/**
 * Equipment Management Routes
 *
 * Provides comprehensive equipment CRUD operations with authentication, authorization,
 * PLC management, and audit logging integration.
 */

import { Request, Response, Router } from 'express';
import Joi from 'joi';
import { EquipmentService } from '../services/EquipmentService';
import { authenticate, authorize } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimiter';
import {
  bulkOperationSchema,
  createEquipmentSchema,
  equipmentIdParamSchema,
  equipmentSearchSchema,
  statisticsRequestSchema,
  updateEquipmentSchema,
  validateSchema,
} from '../validation/equipmentSchemas';
import { logger } from '../config/logger';
import { getClientIP } from '../utils/ip';
import { asyncHandler } from '../utils/errorHandler';

const router: Router = Router();

/**
 * Get EquipmentService with request-scoped EntityManager for audit context
 */
const getEquipmentService = (req: Request): EquipmentService => {
  if (!req.auditEntityManager) {
    throw new Error(
      'auditEntityManager is not available on request. Ensure auditContext middleware is registered before equipment routes.'
    );
  }
  return new EquipmentService(req.auditEntityManager);
};

/**
 * POST /equipment
 * Create new equipment with associated PLC
 */
router.post(
  '/',
  authenticate,
  authorize(['equipment.create']),
  authRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const equipmentData = validateSchema(createEquipmentSchema)(req.body);

    const equipmentService = getEquipmentService(req);
    const equipment = await equipmentService.createEquipment(equipmentData, {
      userId: req.user!.sub,
    });

    logger.info('Equipment created successfully', {
      equipmentId: equipment.id,
      name: equipment.name,
      equipmentType: equipment.equipmentType,
      cellId: equipment.cellId,
      createdBy: req.user?.sub,
      ipAddress: getClientIP(req),
    });

    res.status(201).json({
      message: 'Equipment created successfully',
      equipment,
    });
  }, 'Failed to create equipment')
);

/**
 * GET /equipment
 * List equipment with filtering and pagination
 */
router.get(
  '/',
  authenticate,
  authorize(['equipment.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const filters = validateSchema(equipmentSearchSchema)(req.query);

    const equipmentService = getEquipmentService(req);
    const result = await equipmentService.searchEquipment(filters);

    res.status(200).json({
      data: result.data,
      pagination: result.pagination,
    });
  }, 'Failed to fetch equipment')
);

/**
 * GET /equipment/statistics
 * Get equipment statistics
 */
router.get(
  '/statistics',
  authenticate,
  authorize(['equipment.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    validateSchema(statisticsRequestSchema)(req.query);

    const equipmentService = getEquipmentService(req);
    const statistics = await equipmentService.getEquipmentStatistics();

    res.status(200).json({
      message: 'Equipment statistics retrieved successfully',
      statistics,
    });
  }, 'Failed to fetch equipment statistics')
);

/**
 * GET /equipment/site/:siteId
 * Get equipment by site
 */
router.get(
  '/site/:siteId',
  authenticate,
  authorize(['equipment.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate site ID parameter
    const { siteId } = validateSchema(Joi.object({ siteId: Joi.string().uuid().required() }))(
      req.params
    );

    const equipmentService = getEquipmentService(req);
    const equipment = await equipmentService.getEquipmentBySite(siteId);

    res.status(200).json({
      data: equipment,
    });
  }, 'Failed to fetch equipment by site')
);

/**
 * GET /equipment/cell/:cellId
 * Get equipment by cell
 */
router.get(
  '/cell/:cellId',
  authenticate,
  authorize(['equipment.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate cell ID parameter
    const { cellId } = validateSchema(Joi.object({ cellId: Joi.string().uuid().required() }))(
      req.params
    );

    const equipmentService = getEquipmentService(req);
    const equipment = await equipmentService.getEquipmentByCell(cellId);

    res.status(200).json({
      data: equipment,
    });
  }, 'Failed to fetch equipment by cell')
);

/**
 * GET /equipment/:id
 * Get single equipment record with full details
 */
router.get(
  '/:id',
  authenticate,
  authorize(['equipment.read']),
  asyncHandler(async (req: Request, res: Response) => {
    // Validate equipment ID parameter
    const { id } = validateSchema(equipmentIdParamSchema)(req.params);

    const equipmentService = getEquipmentService(req);
    const equipment = await equipmentService.getEquipmentById(id);

    res.status(200).json({
      equipment,
    });
  }, 'Failed to fetch equipment')
);

/**
 * PUT /equipment/:id
 * Update equipment with optimistic locking
 */
router.put(
  '/:id',
  authenticate,
  authorize(['equipment.update']),
  authRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate equipment ID parameter
    const { id } = validateSchema(equipmentIdParamSchema)(req.params);

    // Validate request body
    const updateData = validateSchema(updateEquipmentSchema)(req.body);

    // Extract updatedAt for optimistic locking
    const { updatedAt, ...equipmentUpdateData } = updateData;

    const equipmentService = getEquipmentService(req);
    const equipment = await equipmentService.updateEquipment(
      id,
      equipmentUpdateData,
      new Date(updatedAt),
      {
        userId: req.user!.sub,
      }
    );

    logger.info('Equipment updated successfully', {
      equipmentId: id,
      updatedFields: Object.keys(equipmentUpdateData),
      updatedBy: req.user?.sub,
      ipAddress: getClientIP(req),
    });

    res.status(200).json({
      message: 'Equipment updated successfully',
      equipment,
    });
  }, 'Failed to update equipment')
);

/**
 * DELETE /equipment/:id
 * Soft delete equipment (preserves audit trail)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['equipment.delete']),
  authRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate equipment ID parameter
    const { id } = validateSchema(equipmentIdParamSchema)(req.params);

    const equipmentService = getEquipmentService(req);
    await equipmentService.deleteEquipment(id, {
      userId: req.user!.sub,
    });

    logger.info('Equipment deleted successfully', {
      equipmentId: id,
      deletedBy: req.user?.sub,
      ipAddress: getClientIP(req),
    });

    res.status(200).json({
      message: 'Equipment deleted successfully',
    });
  }, 'Failed to delete equipment')
);

/**
 * POST /equipment/bulk
 * Perform bulk operations on multiple equipment items
 */
router.post(
  '/bulk',
  authenticate,
  authorize(['equipment.delete', 'equipment.read']), // Requires appropriate permissions based on operation
  authRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const { equipmentIds, operation } = validateSchema(bulkOperationSchema)(req.body);

    const equipmentService = getEquipmentService(req);

    let result;
    switch (operation) {
      case 'delete': {
        // Perform bulk delete
        const deletePromises = equipmentIds.map((id: string) =>
          equipmentService.deleteEquipment(id, { userId: req.user!.sub })
        );
        await Promise.all(deletePromises);

        result = {
          message: `Successfully deleted ${equipmentIds.length} equipment items`,
          deletedCount: equipmentIds.length,
        };
        break;
      }

      case 'export': {
        // Get equipment details for export
        const equipmentPromises = equipmentIds.map((id: string) =>
          equipmentService.getEquipmentById(id)
        );
        const equipmentList = await Promise.all(equipmentPromises);

        result = {
          message: `Successfully exported ${equipmentList.length} equipment items`,
          equipment: equipmentList,
        };
        break;
      }

      default:
        res.status(400).json({
          error: {
            code: 'INVALID_OPERATION',
            message: 'Unsupported bulk operation',
          },
        });
        return;
    }

    logger.info('Bulk equipment operation completed', {
      operation,
      equipmentIds,
      performedBy: req.user?.sub,
      ipAddress: getClientIP(req),
    });

    res.status(200).json(result);
  }, 'Failed to perform bulk equipment operation')
);

export default router;
