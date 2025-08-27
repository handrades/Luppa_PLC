import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { ImportExportService } from '../services/ImportExportService';
import { AuditService } from '../services/AuditService';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validationMiddleware';
import { writeOpsRateLimit } from '../middleware/rateLimiter';
import {
  exportFiltersSchema,
  importOptionsSchemaForRoutes,
  // exportOptionsSchema, // TODO: Enable when needed
  // importHistoryQuerySchema, // TODO: Enable when needed
} from '../validation/import-schemas';
import { AppDataSource } from '../config/database';

const router: Router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Only allow CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Initialize service lazily
let importExportService: ImportExportService | null = null;

// Helper function to get or create the service
const getImportExportService = (): ImportExportService => {
  if (!importExportService) {
    if (!AppDataSource || !AppDataSource.isInitialized) {
      throw new Error('Database not initialized');
    }
    const auditService = new AuditService(AppDataSource.manager);
    importExportService = new ImportExportService(AppDataSource, auditService);
  }
  return importExportService;
};

/**
 * @route   GET /api/v1/import/template
 * @desc    Download CSV template for PLC import
 * @access  Private - Requires authentication
 */
router.get(
  '/import/template',
  authenticate,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await getImportExportService().generateTemplate();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="plc_import_template.csv"');
      res.send(template);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/import/preview
 * @desc    Preview CSV file and validate data
 * @access  Private - Requires data_admin role
 */
router.post(
  '/import/preview',
  authenticate,
  authorize(['admin', 'data_admin']),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const preview = await getImportExportService().validateCSV(req.file.buffer);

      res.json({
        success: true,
        data: preview,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/import/plcs
 * @desc    Import PLCs from CSV file
 * @access  Private - Requires data_admin role
 */
router.post(
  '/import/plcs',
  authenticate,
  authorize(['admin', 'data_admin']),
  writeOpsRateLimit, // Rate limiting for write operations
  upload.single('file'),
  validateBody(importOptionsSchemaForRoutes),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const options = {
        ...req.body,
        userId: req.user?.sub || '',
      };

      const result = await getImportExportService().importPLCs(req.file.buffer, options);

      if (result.totalRows > 1000) {
        // For large files, return immediate response
        res.status(202).json({
          success: true,
          message: 'Import queued for background processing',
          importId: result.importId,
          totalRows: result.totalRows,
        });
      } else {
        res.json({
          success: result.success,
          data: result,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/export/plcs
 * @desc    Export PLCs to CSV or JSON
 * @access  Private - Requires authentication
 */
router.post(
  '/export/plcs',
  authenticate,
  validateBody(exportFiltersSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = req.body;
      const options = {
        format: (req.query.format as 'csv' | 'json') || 'csv',
        includeHierarchy: req.query.includeHierarchy === 'true',
        includeTags: req.query.includeTags === 'true',
        includeAuditInfo: req.query.includeAuditInfo === 'true',
      };

      const data = await getImportExportService().exportPLCs(filters, options);

      if (options.format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="plc_export.json"');
      } else {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="plc_export.csv"');
      }

      res.send(data);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/import/history
 * @desc    Get import history for current user
 * @access  Private - Requires authentication
 */
router.get(
  '/import/history',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.sub || '';
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const history = await getImportExportService().getImportHistory(userId, page, pageSize);

      res.json({
        success: true,
        data: history.data,
        pagination: {
          total: history.total,
          page: history.page,
          pageSize: history.pageSize,
          totalPages: Math.ceil(history.total / history.pageSize),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/import/:id
 * @desc    Get specific import log details
 * @access  Private - Requires authentication
 */
router.get('/import/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const importLog = await getImportExportService().getImportLog(req.params.id);

    if (!importLog) {
      return res.status(404).json({ error: 'Import log not found' });
    }

    // Check if user has access to this import log
    const permissions = req.user?.permissions;
    const isAdmin = Array.isArray(permissions)
      ? permissions.some((p: string | { name?: string; role?: string }) =>
          typeof p === 'string' ? p === 'admin' : p?.name === 'admin' || p?.role === 'admin'
        )
      : false;

    if (importLog.userId !== req.user?.sub && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      data: importLog,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/import/:id/rollback
 * @desc    Rollback a completed import
 * @access  Private - Requires data_admin role
 */
router.post(
  '/import/:id/rollback',
  authenticate,
  authorize(['admin', 'data_admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.sub || '';
      const rollback = await getImportExportService().rollbackImport(req.params.id, userId);

      res.json({
        success: true,
        message: 'Import rolled back successfully',
        data: rollback,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
