/**
 * Audit Log Routes
 *
 * Provides endpoints for accessing audit logs with proper authorization and validation
 */

import { Request, Response, Router } from 'express';
import Joi from 'joi';
import { AuditService } from '../services/AuditService';
import { AuditAction, RiskLevel } from '../entities/AuditLog';
import { authenticate, authorize } from '../middleware/auth';
import { logger } from '../config/logger';
import { getClientIP } from '../utils/ip';

const router: Router = Router();

// Memoized AuditService instance with proper singleton pattern
class AuditServiceSingleton {
  private static instance: AuditService;

  public static getInstance(): AuditService {
    if (!AuditServiceSingleton.instance) {
      AuditServiceSingleton.instance = new AuditService();
    }
    return AuditServiceSingleton.instance;
  }
}

const getAuditService = (): AuditService => AuditServiceSingleton.getInstance();

/**
 * Helper function to log access and check performance
 */
const logAuditAccess = (
  req: Request,
  action: string,
  metadata: Record<string, unknown> = {},
  startTime?: number
): void => {
  const duration = startTime ? Date.now() - startTime : undefined;

  logger.info(`Audit ${action} accessed`, {
    userId: req.user?.sub,
    userEmail: req.user?.email,
    ipAddress: getClientIP(req),
    timestamp: new Date().toISOString(),
    duration,
    ...metadata,
  });

  // Check performance thresholds
  if (duration && duration > 100) {
    logger.warn(`Audit ${action} exceeded 100ms threshold`, {
      duration,
      userId: req.user?.sub,
      metadata,
    });
  }
};

/**
 * Validation schemas
 */
const auditQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(50),
  userId: Joi.string().uuid().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  action: Joi.string()
    .valid(...Object.values(AuditAction))
    .optional(),
  tableName: Joi.string().max(50).optional(),
  riskLevel: Joi.string()
    .valid(...Object.values(RiskLevel))
    .optional(),
  search: Joi.string().max(500).optional().allow(''),
}).unknown(false);

const complianceReportSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  userId: Joi.string().uuid().optional(),
}).unknown(false);

const auditIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
}).unknown(false);

/**
 * GET /audit-logs
 * Get paginated audit logs with filtering
 * Requires 'audit.read' permission
 */
router.get(
  '/audit-logs',
  authenticate,
  authorize('audit.read'),
  async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      // Validate query parameters
      const { error, value } = auditQuerySchema.validate(req.query, {
        abortEarly: false,
        convert: true,
      });

      if (error) {
        res.status(400).json({
          error: 'Validation error',
          message: error.details.map(detail => detail.message).join('; '),
        });
        return;
      }

      const queryOptions = value;

      // Convert date strings to Date objects if provided
      if (queryOptions.startDate) {
        queryOptions.startDate = new Date(queryOptions.startDate);
      }
      if (queryOptions.endDate) {
        queryOptions.endDate = new Date(queryOptions.endDate);
      }

      // Get audit logs
      const result = await getAuditService().getAuditLogs(queryOptions);

      // Log access with performance monitoring
      logAuditAccess(
        req,
        'logs query',
        {
          queryOptions,
          resultCount: result.data.length,
        },
        startTime
      );

      res.status(200).json({
        message: 'Audit logs retrieved successfully',
        ...result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to retrieve audit logs';

      logger.error('Get audit logs failed', {
        userId: req.user?.sub,
        error: message,
        queryParams: req.query,
        ipAddress: getClientIP(req),
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve audit logs',
      });
    }
  }
);

/**
 * GET /audit-logs/high-risk
 * Get recent high-risk audit events for security monitoring
 * Requires 'audit.read' permission
 * NOTE: Must be defined before /audit-logs/:id to avoid route conflicts
 */
router.get(
  '/audit-logs/high-risk',
  authenticate,
  authorize('audit.read'),
  async (req: Request, res: Response) => {
    try {
      // Optional limit parameter
      const limitStr = req.query.limit as string;
      const limit = limitStr ? Math.min(Math.max(parseInt(limitStr, 10), 1), 100) : 50;

      // Get high-risk events
      const highRiskEvents = await getAuditService().getHighRiskEvents(limit);

      // Log access for security monitoring
      logger.info('High-risk audit events accessed', {
        userId: req.user?.sub,
        userEmail: req.user?.email,
        limit,
        eventCount: highRiskEvents.length,
        ipAddress: getClientIP(req),
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        message: 'High-risk audit events retrieved successfully',
        data: highRiskEvents,
        count: highRiskEvents.length,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to retrieve high-risk events';

      logger.error('Get high-risk audit events failed', {
        userId: req.user?.sub,
        error: message,
        ipAddress: getClientIP(req),
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve high-risk audit events',
      });
    }
  }
);

/**
 * GET /audit-logs/stats
 * Get audit statistics for dashboard
 * Requires 'audit.read' permission
 * NOTE: Must be defined before /audit-logs/:id to avoid route conflicts
 */
router.get(
  '/audit-logs/stats',
  authenticate,
  authorize('audit.read'),
  async (req: Request, res: Response) => {
    try {
      // Optional date range parameters
      const startDateStr = req.query.startDate as string;
      const endDateStr = req.query.endDate as string;
      const userIdStr = req.query.userId as string;

      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (startDateStr) {
        startDate = new Date(startDateStr);
        if (isNaN(startDate.getTime())) {
          res.status(400).json({
            error: 'Invalid start date',
            message: 'Start date must be a valid ISO date string',
          });
          return;
        }
      }

      if (endDateStr) {
        endDate = new Date(endDateStr);
        if (isNaN(endDate.getTime())) {
          res.status(400).json({
            error: 'Invalid end date',
            message: 'End date must be a valid ISO date string',
          });
          return;
        }
      }

      // Generate basic statistics (could reuse compliance report logic)
      const defaultEndDate = endDate || new Date();
      const defaultStartDate =
        startDate || new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const complianceReport = await getAuditService().generateComplianceReport(
        defaultStartDate,
        defaultEndDate,
        userIdStr
      );

      // Extract statistics from report
      const stats = {
        period: complianceReport.period,
        totalChanges: complianceReport.totalChanges,
        riskBreakdown: complianceReport.riskBreakdown,
        actionBreakdown: complianceReport.actionBreakdown,
        tableBreakdown: complianceReport.tableBreakdown,
        topUsers: complianceReport.userActivity.slice(0, 10), // Top 10 active users
      };

      logger.info('Audit statistics accessed', {
        userId: req.user?.sub,
        period: stats.period,
        totalChanges: stats.totalChanges,
        ipAddress: getClientIP(req),
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        message: 'Audit statistics retrieved successfully',
        stats,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to retrieve audit statistics';

      logger.error('Get audit statistics failed', {
        userId: req.user?.sub,
        error: message,
        queryParams: req.query,
        ipAddress: getClientIP(req),
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve audit statistics',
      });
    }
  }
);

/**
 * GET /audit-logs/:id
 * Get specific audit log by ID
 * Requires 'audit.read' permission
 * NOTE: Must be defined after specific routes to avoid conflicts
 */
router.get(
  '/audit-logs/:id',
  authenticate,
  authorize('audit.read'),
  async (req: Request, res: Response) => {
    try {
      // Validate audit log ID parameter
      const { error, value } = auditIdSchema.validate(req.params, { abortEarly: false });

      if (error) {
        res.status(400).json({
          error: 'Validation error',
          message: error.details.map(detail => detail.message).join('; '),
        });
        return;
      }

      const { id } = value;

      // Get audit log
      const auditLog = await getAuditService().getAuditLogById(id);

      if (!auditLog) {
        res.status(404).json({
          error: 'Not found',
          message: 'Audit log not found',
        });
        return;
      }

      // Log access for security monitoring
      logger.info('Specific audit log accessed', {
        auditLogId: id,
        userId: req.user?.sub,
        userEmail: req.user?.email,
        ipAddress: getClientIP(req),
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        message: 'Audit log retrieved successfully',
        data: auditLog,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to retrieve audit log';

      logger.error('Get audit log by ID failed', {
        auditLogId: req.params.id,
        userId: req.user?.sub,
        error: message,
        ipAddress: getClientIP(req),
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve audit log',
      });
    }
  }
);

/**
 * POST /audit-logs/compliance-report
 * Generate compliance report for specified date range
 * Requires 'audit.export' permission
 */
router.post(
  '/audit-logs/compliance-report',
  authenticate,
  authorize('audit.export'),
  async (req: Request, res: Response) => {
    try {
      // Validate request body
      const { error, value } = complianceReportSchema.validate(req.body, {
        abortEarly: false,
        convert: true,
      });

      if (error) {
        res.status(400).json({
          error: 'Validation error',
          message: error.details.map(detail => detail.message).join('; '),
        });
        return;
      }

      const { startDate, endDate, userId } = value;

      // Convert to Date objects
      const reportStartDate = new Date(startDate);
      const reportEndDate = new Date(endDate);

      // Validate date range (max 1 year)
      const maxRangeMs = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      if (reportEndDate.getTime() - reportStartDate.getTime() > maxRangeMs) {
        res.status(400).json({
          error: 'Invalid date range',
          message: 'Date range cannot exceed 1 year',
        });
        return;
      }

      // Generate compliance report
      const complianceReport = await getAuditService().generateComplianceReport(
        reportStartDate,
        reportEndDate,
        userId
      );

      // Log report generation for compliance tracking
      logger.info('Compliance report generated', {
        userId: req.user?.sub,
        userEmail: req.user?.email,
        reportPeriod: { startDate: reportStartDate, endDate: reportEndDate },
        filterUserId: userId,
        totalChanges: complianceReport.totalChanges,
        ipAddress: getClientIP(req),
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        message: 'Compliance report generated successfully',
        report: complianceReport,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate compliance report';

      logger.error('Compliance report generation failed', {
        userId: req.user?.sub,
        error: message,
        requestBody: req.body,
        ipAddress: getClientIP(req),
        timestamp: new Date().toISOString(),
      });

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate compliance report',
      });
    }
  }
);

export default router;
