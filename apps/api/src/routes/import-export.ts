/**
 * Import/Export Routes
 *
 * RESTful API endpoints for bulk data operations including CSV import/export,
 * template generation, and import history management.
 */

import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";
import Joi from "joi";
import {
  ExportOptions,
  ImportExportService,
  ImportOptions,
  PLCFilters,
} from "../services/ImportExportService";
import { SiteService } from "../services/SiteService";
import { CellService } from "../services/CellService";
import { EquipmentService } from "../services/EquipmentService";
import { AuditService } from "../services/AuditService";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validationMiddleware";
import { logger } from "../config/logger";
import { AppDataSource } from "../config/database";
import { ImportHistory } from "../entities/ImportHistory";
import { EquipmentType } from "../entities/Equipment";

const router: Router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// Multer error handler middleware
const handleMulterError = (error: any, _req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field'
      });
    }
  }
  
  if (error.message === 'Only CSV files are allowed') {
    return res.status(400).json({
      success: false,
      error: 'Only CSV files are allowed'
    });
  }
  
  next(error);
};

// Validation schemas
const importOptionsSchema = Joi.object({
  createMissing: Joi.boolean().default(false),
  duplicateHandling: Joi.string()
    .valid("skip", "overwrite", "merge")
    .default("skip"),
  backgroundThreshold: Joi.number().integer().min(100).max(10000).default(1000),
  validateOnly: Joi.boolean().default(false),
});

const exportFiltersSchema = Joi.object({
  sites: Joi.array().items(Joi.string()).optional(),
  cells: Joi.array().items(Joi.string()).optional(),
  equipmentTypes: Joi.array()
    .items(Joi.string().valid(...Object.values(EquipmentType)))
    .optional(),
  makes: Joi.array().items(Joi.string()).optional(),
  models: Joi.array().items(Joi.string()).optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  search: Joi.string().optional(),
});

const exportOptionsSchema = Joi.object({
  includeHierarchy: Joi.boolean().default(true),
  includeTags: Joi.boolean().default(false),
  format: Joi.string().valid("csv").default("csv"),
});

// Service factory function to avoid circular dependencies
const createImportExportService = () => {
  const entityManager = AppDataSource.manager;
  const siteService = new SiteService(entityManager);
  const cellService = new CellService(entityManager);
  const equipmentService = new EquipmentService(entityManager);
  const auditService = new AuditService(entityManager);

  return new ImportExportService(
    AppDataSource,
    siteService,
    cellService,
    equipmentService,
    auditService,
  );
};

/**
 * GET /api/v1/import/template
 * Download CSV template with all required fields
 */
router.get(
  "/import/template",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const service = createImportExportService();
      const template = await service.generateTemplate();

      res.set({
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="plc-import-template.csv"',
        "Content-Length": template.length.toString(),
      });

      res.send(template);

      logger.info("CSV template downloaded", {
        userId: req.user?.sub,
        userEmail: req.user?.email,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/import/plcs
 * Import PLCs from CSV file with options
 */
router.post(
  "/import/plcs",
  authenticate,
  upload.single("file"),
  handleMulterError,
  validate({ body: importOptionsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No CSV file provided",
        });
      }

      const options: ImportOptions = req.body;
      const userId = req.user!.sub;

      logger.info("Starting CSV import", {
        userId,
        filename: req.file.originalname,
        fileSize: req.file.size,
        options,
      });

      const service = createImportExportService();
      const result = await service.importPLCs(req.file.buffer, options, userId);

      // Store import history
      if (!options.validateOnly) {
        const importHistoryRepo = AppDataSource.getRepository(ImportHistory);
        const importHistory = importHistoryRepo.create({
          userId,
          filename: req.file.originalname,
          totalRows: result.totalRows,
          successfulRows: result.successfulRows,
          failedRows: result.failedRows,
          options,
          errors: result.errors,
          createdEntities: result.createdEntities,
          status: result.success ? "completed" : "failed",
          startedAt: new Date(),
          completedAt: new Date(),
        });

        await importHistoryRepo.save(importHistory);
      }

      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);

      logger.info("CSV import completed", {
        userId,
        importId: result.importId,
        success: result.success,
        totalRows: result.totalRows,
        successfulRows: result.successfulRows,
        failedRows: result.failedRows,
      });
    } catch (error) {
      logger.error("CSV import failed", {
        userId: req.user?.sub,
        filename: req.file?.originalname,
        error: error instanceof Error ? error.message : error,
      });
      next(error);
    }
  },
);

/**
 * POST /api/v1/export/plcs
 * Export PLCs to CSV with filters
 */
router.post(
  "/export/plcs",
  authenticate,
  validate({
    body: Joi.object({
      filters: exportFiltersSchema.default({}),
      options: exportOptionsSchema.default({}),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        filters,
        options,
      }: { filters: PLCFilters; options: ExportOptions } = req.body;

      logger.info("Starting CSV export", {
        userId: req.user!.sub,
        filters,
        options,
      });

      const service = createImportExportService();
      const csvBuffer = await service.exportPLCs(filters, options);

      // Generate filename with timestamp and filters
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:.]/g, "-");
      const sitesFilter =
        filters.sites && filters.sites.length > 0 ? `-${filters.sites[0]}` : "";
      const filename = `plc-export${sitesFilter}-${timestamp}.csv`;

      res.set({
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": csvBuffer.length.toString(),
      });

      res.send(csvBuffer);

      logger.info("CSV export completed", {
        userId: req.user!.sub,
        filename,
        size: csvBuffer.length,
        filters,
      });
    } catch (error) {
      logger.error("CSV export failed", {
        userId: req.user?.sub,
        error: error instanceof Error ? error.message : error,
      });
      next(error);
    }
  },
);

/**
 * POST /api/v1/import/:importId/rollback
 * Rollback a specific import (placeholder for future implementation)
 */
router.post(
  "/import/:importId/rollback",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { importId } = req.params;
      const userId = req.user!.sub;

      // Validate import exists and belongs to user
      const importHistoryRepo = AppDataSource.getRepository(ImportHistory);
      const importRecord = await importHistoryRepo.findOne({
        where: { id: importId, userId },
      });

      if (!importRecord) {
        return res.status(404).json({
          success: false,
          error: "Import record not found",
        });
      }

      if (importRecord.status !== "completed") {
        return res.status(400).json({
          success: false,
          error: "Only completed imports can be rolled back",
        });
      }

      // TODO: Implement actual rollback logic
      // This would require tracking which records were created during import
      // and removing them in reverse order while respecting foreign key constraints

      res.status(501).json({
        success: false,
        error: "Rollback functionality not yet implemented",
      });

      logger.info("Rollback requested (not implemented)", {
        userId,
        importId,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/import/history
 * Get import history for the authenticated user
 */
router.get(
  "/import/history",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(
        parseInt(req.query.pageSize as string) || 20,
        100,
      );
      const skip = (page - 1) * pageSize;

      const importHistoryRepo = AppDataSource.getRepository(ImportHistory);

      const [imports, total] = await importHistoryRepo.findAndCount({
        where: { userId },
        order: { startedAt: "DESC" },
        skip,
        take: pageSize,
      });

      res.json({
        data: imports,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });

      logger.info("Import history retrieved", {
        userId,
        page,
        pageSize,
        total,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/import/validate
 * Validate CSV file without importing
 */
router.post(
  "/import/validate",
  authenticate,
  upload.single("file"),
  handleMulterError,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No CSV file provided",
        });
      }

      const service = createImportExportService();
      const validation = await service.validateCSV(req.file.buffer);

      res.json({
        success: validation.isValid,
        validation,
      });

      logger.info("CSV validation completed", {
        userId: req.user!.sub,
        filename: req.file.originalname,
        isValid: validation.isValid,
        headerErrors: validation.headerErrors.length,
        rowErrors: validation.rowErrors.length,
      });
    } catch (error) {
      logger.error("CSV validation failed", {
        userId: req.user?.sub,
        filename: req.file?.originalname,
        error: error instanceof Error ? error.message : error,
      });
      next(error);
    }
  },
);

export default router;
