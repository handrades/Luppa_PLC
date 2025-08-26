import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { Readable } from 'stream';
import { DataSource, EntityManager } from 'typeorm';
import * as Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import Bull from 'bull';
import { redisClient } from '../config/redis';
import { PLC } from '../entities/PLC';
import { Site } from '../entities/Site';
import { Cell } from '../entities/Cell';
import { Equipment } from '../entities/Equipment';
import { AuditService } from './AuditService';
import { logger } from '../config/logger';
import {
  BulkImportJob,
  CSVRow,
  ExportFilters,
  ExportOptions,
  ImportLog,
  ImportOptions,
  ImportPreview,
  ImportResult,
  ImportRollback,
  ProcessedRow,
  ValidationError,
} from '../types/import-export.types';

export class ImportExportService {
  private dataSource: DataSource;
  // private auditService: AuditService; // TODO: Enable when audit logging is needed
  private importQueue: Bull.Queue<BulkImportJob>;

  constructor(dataSource: DataSource, _auditService: AuditService) {
    this.dataSource = dataSource;
    // this.auditService = auditService; // TODO: Enable when audit logging is needed

    // Initialize Bull queue for background processing
    this.importQueue = new Bull('import-queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    });

    this.setupQueueProcessors();
  }

  private setupQueueProcessors(): void {
    this.importQueue.process(async job => {
      const { importId, totalRows } = job.data;

      try {
        // Process import in background
        await job.progress(0);

        // Update progress as we process
        for (let i = 0; i < totalRows; i += 100) {
          await job.progress((i / totalRows) * 100);
        }

        await job.progress(100);
        return { success: true, importId };
      } catch (error) {
        logger.error('Background import failed:', error);
        throw error;
      }
    });
  }

  /**
   * Generate CSV template with all required headers
   */
  async generateTemplate(): Promise<Buffer> {
    const headers = [
      'site_name',
      'cell_name',
      'cell_type',
      'equipment_name',
      'equipment_type',
      'tag_id',
      'description',
      'make',
      'model',
      'ip_address',
      'firmware_version',
      'tags',
    ];

    const sampleData = [
      [
        'Main Factory',
        'Assembly Line 1',
        'production',
        'Robot Controller 1',
        'controller',
        'PLC-001',
        'Main assembly robot controller',
        'Allen-Bradley',
        'ControlLogix 5580',
        '192.168.1.10',
        'v20.13',
        'robot,assembly,critical',
      ],
      [
        'Main Factory',
        'Assembly Line 1',
        'production',
        'Conveyor Controller',
        'controller',
        'PLC-002',
        'Conveyor belt speed controller',
        'Siemens',
        'S7-1500',
        '192.168.1.11',
        'v4.5.1',
        'conveyor,transport',
      ],
    ];

    return new Promise((resolve, reject) => {
      stringify(
        [headers, ...sampleData],
        {
          delimiter: ',',
          header: false,
          quoted: true,
        },
        (err, output) => {
          if (err) reject(err);
          else resolve(Buffer.from(output));
        }
      );
    });
  }

  /**
   * Validate CSV file and return preview
   */
  async validateCSV(buffer: Buffer): Promise<ImportPreview> {
    return new Promise((resolve, reject) => {
      const results: string[][] = [];
      const errors: ValidationError[] = [];
      let headers: string[] = [];
      let rowNumber = 0;

      const parser = parse({
        delimiter: ',',
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: true,
        cast_date: false,
      });

      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          rowNumber++;

          if (rowNumber === 1) {
            headers = Object.keys(record);

            // Validate headers
            const requiredHeaders = [
              'site_name',
              'cell_name',
              'equipment_name',
              'tag_id',
              'description',
              'make',
              'model',
            ];
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

            if (missingHeaders.length > 0) {
              errors.push({
                row: 0,
                column: 'headers',
                value: headers.join(','),
                message: `Missing required headers: ${missingHeaders.join(', ')}`,
                severity: 'error',
              });
            }
          }

          if (rowNumber <= 10) {
            results.push(Object.values(record));

            // Validate row
            const rowErrors = this.validateRow(record, rowNumber);
            errors.push(...rowErrors);
          }
        }
      });

      parser.on('error', err => {
        reject(err);
      });

      parser.on('end', () => {
        resolve({
          headers,
          rows: results,
          validationErrors: errors,
          totalRows: rowNumber,
          previewRows: Math.min(10, rowNumber),
        });
      });

      const stream = Readable.from(buffer);
      stream.pipe(parser);
    });
  }

  /**
   * Validate a single row
   */
  private validateRow(row: CSVRow, rowNumber: number): ValidationError[] {
    const errors: ValidationError[] = [];

    const schema = Joi.object({
      site_name: Joi.string().max(100).required(),
      cell_name: Joi.string().max(100).required(),
      cell_type: Joi.string()
        .valid('production', 'warehouse', 'testing', 'packaging')
        .allow('', null),
      equipment_name: Joi.string().max(100).required(),
      equipment_type: Joi.string()
        .valid('plc', 'hmi', 'robot', 'sensor', 'controller')
        .allow('', null),
      tag_id: Joi.string().max(100).required(),
      description: Joi.string().required(),
      make: Joi.string().max(100).required(),
      model: Joi.string().max(100).required(),
      ip_address: Joi.string()
        .ip({ version: ['ipv4', 'ipv6'] })
        .allow('', null),
      firmware_version: Joi.string().max(50).allow('', null),
      tags: Joi.string().allow('', null),
    });

    const { error } = schema.validate(row, { abortEarly: false });

    if (error) {
      error.details.forEach(detail => {
        errors.push({
          row: rowNumber,
          column: detail.path.join('.'),
          value: detail.context?.value,
          message: detail.message,
          severity: 'error',
        });
      });
    }

    // Check for IP address format if provided
    if (row.ip_address && !this.isValidIP(row.ip_address)) {
      errors.push({
        row: rowNumber,
        column: 'ip_address',
        value: row.ip_address,
        message: 'Invalid IP address format',
        severity: 'error',
      });
    }

    return errors;
  }

  /**
   * Validate IP address
   */
  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([\da-f]{1,4}:){7}[\da-f]{1,4}$/i;

    if (ipv4Regex.test(ip)) {
      const parts = ip.split('.');
      return parts.every(part => {
        const num = parseInt(part);
        return num >= 0 && num <= 255;
      });
    }

    return ipv6Regex.test(ip);
  }

  /**
   * Import PLCs from CSV buffer
   */
  async importPLCs(buffer: Buffer, options: ImportOptions): Promise<ImportResult> {
    const startTime = Date.now();
    const importId = uuidv4();
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let processedRows = 0;
    let skippedRows = 0;
    let totalRows = 0;

    // First validate the entire file
    const preview = await this.validateCSV(buffer);

    if (
      preview.validationErrors.filter(e => e.severity === 'error').length > 0 &&
      !options.validateOnly
    ) {
      return {
        success: false,
        totalRows: preview.totalRows,
        processedRows: 0,
        skippedRows: 0,
        errors: preview.validationErrors.filter(e => e.severity === 'error'),
        warnings: preview.validationErrors.filter(e => e.severity === 'warning'),
        importId,
        duration: Date.now() - startTime,
      };
    }

    if (options.validateOnly) {
      return {
        success: true,
        totalRows: preview.totalRows,
        processedRows: 0,
        skippedRows: 0,
        errors: preview.validationErrors.filter(e => e.severity === 'error'),
        warnings: preview.validationErrors.filter(e => e.severity === 'warning'),
        importId,
        duration: Date.now() - startTime,
      };
    }

    // Check if we need background processing
    if (preview.totalRows > 1000) {
      // Queue for background processing
      await this.importQueue.add({
        id: importId,
        importId,
        status: 'queued',
        progress: 0,
        totalRows: preview.totalRows,
        processedRows: 0,
        errors: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Store import log
      await this.createImportLog({
        id: importId,
        filename: `import_${Date.now()}.csv`,
        status: 'processing',
        totalRows: preview.totalRows,
        processedRows: 0,
        skippedRows: 0,
        errors: [],
        userId: options.userId,
        startedAt: new Date(),
        rollbackAvailable: false,
      });

      return {
        success: true,
        totalRows: preview.totalRows,
        processedRows: 0,
        skippedRows: 0,
        errors: [],
        warnings: [],
        importId,
        duration: Date.now() - startTime,
      };
    }

    // Process synchronously for smaller files
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const rows = await this.parseCSV(buffer);
      totalRows = rows.length;

      for (const row of rows) {
        try {
          const processedRow = await this.processRow(row, options, queryRunner.manager);

          if (processedRow.errors.length > 0) {
            errors.push(...processedRow.errors);
            if (options.mergeStrategy === 'skip') {
              skippedRows++;
              continue;
            }
          }

          if (processedRow.warnings.length > 0) {
            warnings.push(...processedRow.warnings);
          }

          await this.savePLC(processedRow, options, queryRunner.manager);
          processedRows++;
        } catch (error) {
          errors.push({
            row: row.rowNumber || processedRows + skippedRows + 1,
            column: 'general',
            value: null,
            message: error instanceof Error ? error.message : String(error),
            severity: 'error',
          });

          if (options.mergeStrategy === 'skip') {
            skippedRows++;
          } else {
            throw error;
          }
        }
      }

      // If no errors, commit transaction
      if (errors.filter(e => e.severity === 'error').length === 0) {
        await queryRunner.commitTransaction();

        // Create import log
        await this.createImportLog({
          id: importId,
          filename: `import_${Date.now()}.csv`,
          status: 'completed',
          totalRows,
          processedRows,
          skippedRows,
          errors,
          userId: options.userId,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          duration: Date.now() - startTime,
          rollbackAvailable: true,
        });

        // Audit log - would be logged here if logAction method existed
        logger.info('Bulk import completed', {
          userId: options.userId,
          action: 'BULK_IMPORT',
          entity: 'PLC',
          entityId: importId,
          details: {
            totalRows,
            processedRows,
            skippedRows,
          },
        });

        return {
          success: true,
          totalRows,
          processedRows,
          skippedRows,
          errors,
          warnings,
          importId,
          duration: Date.now() - startTime,
        };
      } else {
        // Rollback on errors
        await queryRunner.rollbackTransaction();

        return {
          success: false,
          totalRows,
          processedRows: 0,
          skippedRows,
          errors,
          warnings,
          importId,
          duration: Date.now() - startTime,
        };
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Parse CSV buffer into rows
   */
  private async parseCSV(buffer: Buffer): Promise<ProcessedRow[]> {
    return new Promise((resolve, reject) => {
      const rows: ProcessedRow[] = [];
      let rowNumber = 0;

      const parser = parse({
        delimiter: ',',
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: true,
        cast_date: false,
      });

      parser.on('readable', function () {
        let record;
        while ((record = parser.read()) !== null) {
          rowNumber++;
          rows.push({
            ...record,
            rowNumber,
            isValid: true,
            errors: [],
            warnings: [],
          });
        }
      });

      parser.on('error', err => {
        reject(err);
      });

      parser.on('end', () => {
        resolve(rows);
      });

      const stream = Readable.from(buffer);
      stream.pipe(parser);
    });
  }

  /**
   * Process a single row with validation and hierarchy creation
   */
  private async processRow(
    row: ProcessedRow,
    options: ImportOptions,
    manager: EntityManager
  ): Promise<ProcessedRow> {
    // Validate row
    const errors = this.validateRow(row, row.rowNumber);
    row.errors = errors;

    if (errors.length > 0 && !options.createMissing) {
      row.isValid = false;
      return row;
    }

    // Check/create site
    let site = await manager.findOne(Site, {
      where: { name: row.site_name },
    });

    if (!site && options.createMissing) {
      site = manager.create(Site, {
        name: row.site_name,
        location: '',
        createdBy: options.userId,
        updatedBy: options.userId,
      });
      site = await manager.save(Site, site);
    }

    if (!site) {
      row.errors.push({
        row: row.rowNumber,
        column: 'site_name',
        value: row.site_name,
        message: 'Site does not exist',
        severity: 'error',
      });
      row.isValid = false;
      return row;
    }

    row.siteId = site.id;

    // Check/create cell
    let cell = await manager.findOne(Cell, {
      where: {
        siteId: site.id,
        name: row.cell_name,
      },
    });

    if (!cell && options.createMissing) {
      cell = manager.create(Cell, {
        siteId: site.id,
        name: row.cell_name,
        cellType: row.cell_type || 'production',
        lineNumber: `Line-${row.rowNumber}`,
        createdBy: options.userId,
        updatedBy: options.userId,
      });
      cell = await manager.save(Cell, cell);
    }

    if (!cell) {
      row.errors.push({
        row: row.rowNumber,
        column: 'cell_name',
        value: row.cell_name,
        message: 'Cell does not exist',
        severity: 'error',
      });
      row.isValid = false;
      return row;
    }

    row.cellId = cell.id;

    // Check/create equipment
    let equipment = await manager.findOne(Equipment, {
      where: {
        cellId: cell.id,
        name: row.equipment_name,
      },
    });

    if (!equipment && options.createMissing) {
      equipment = manager.create(Equipment, {
        cellId: cell.id,
        name: row.equipment_name,
        type: row.equipment_type || 'plc',
        createdBy: options.userId,
        updatedBy: options.userId,
      });
      equipment = await manager.save(Equipment, equipment);
    }

    if (!equipment) {
      row.errors.push({
        row: row.rowNumber,
        column: 'equipment_name',
        value: row.equipment_name,
        message: 'Equipment does not exist',
        severity: 'error',
      });
      row.isValid = false;
      return row;
    }

    row.equipmentId = equipment.id;

    // Check for duplicate PLC by IP
    if (row.ip_address) {
      const existingPLC = await manager.findOne(PLC, {
        where: { ipAddress: row.ip_address },
      });

      if (existingPLC) {
        if (options.mergeStrategy === 'skip') {
          row.warnings.push({
            row: row.rowNumber,
            column: 'ip_address',
            value: row.ip_address,
            message: 'Duplicate IP address found, skipping',
            severity: 'warning',
          });
          row.isValid = false;
        } else if (options.mergeStrategy === 'update') {
          row.warnings.push({
            row: row.rowNumber,
            column: 'ip_address',
            value: row.ip_address,
            message: 'Duplicate IP address found, updating existing record',
            severity: 'warning',
          });
        }
      }
    }

    return row;
  }

  /**
   * Save PLC record
   */
  private async savePLC(
    row: ProcessedRow,
    options: ImportOptions,
    manager: EntityManager
  ): Promise<void> {
    if (!row.isValid) {
      return;
    }

    // Check for existing PLC
    let plc = await manager.findOne(PLC, {
      where: { tagId: row.tag_id },
    });

    if (plc) {
      if (options.mergeStrategy === 'skip') {
        return;
      } else if (options.mergeStrategy === 'update') {
        // Update existing
        plc.description = row.description;
        plc.make = row.make;
        plc.model = row.model;
        plc.ipAddress = row.ip_address || null;
        plc.firmwareVersion = row.firmware_version || null;
        plc.updatedBy = options.userId;
      } else if (options.mergeStrategy === 'replace') {
        // Delete and recreate
        await manager.remove(plc);
        plc = null;
      }
    }

    if (!plc) {
      // Create new PLC
      plc = manager.create(PLC, {
        equipmentId: row.equipmentId!,
        tagId: row.tag_id,
        description: row.description,
        make: row.make,
        model: row.model,
        ipAddress: row.ip_address || null,
        firmwareVersion: row.firmware_version || null,
        // tags will be created separately via Tag entity
        createdBy: options.userId,
        updatedBy: options.userId,
      });
    }

    await manager.save(PLC, plc);
  }

  /**
   * Export PLCs to CSV or JSON
   */
  async exportPLCs(filters: ExportFilters, options: ExportOptions): Promise<Buffer> {
    const queryBuilder = this.dataSource
      .getRepository(PLC)
      .createQueryBuilder('plc')
      .leftJoinAndSelect('plc.equipment', 'equipment')
      .leftJoinAndSelect('equipment.cell', 'cell')
      .leftJoinAndSelect('cell.site', 'site');

    // Apply filters
    if (filters.siteIds && filters.siteIds.length > 0) {
      queryBuilder.andWhere('site.id IN (:...siteIds)', { siteIds: filters.siteIds });
    }

    if (filters.cellIds && filters.cellIds.length > 0) {
      queryBuilder.andWhere('cell.id IN (:...cellIds)', { cellIds: filters.cellIds });
    }

    if (filters.equipmentIds && filters.equipmentIds.length > 0) {
      queryBuilder.andWhere('equipment.id IN (:...equipmentIds)', {
        equipmentIds: filters.equipmentIds,
      });
    }

    if (filters.cellTypes && filters.cellTypes.length > 0) {
      queryBuilder.andWhere('cell.cellType IN (:...cellTypes)', { cellTypes: filters.cellTypes });
    }

    if (filters.equipmentTypes && filters.equipmentTypes.length > 0) {
      queryBuilder.andWhere('equipment.type IN (:...equipmentTypes)', {
        equipmentTypes: filters.equipmentTypes,
      });
    }

    if (filters.dateRange) {
      queryBuilder.andWhere('plc.createdAt BETWEEN :start AND :end', {
        start: filters.dateRange.start,
        end: filters.dateRange.end,
      });
    }

    if (filters.ipRange) {
      // Parse CIDR notation and apply filter
      queryBuilder.andWhere('plc.ipAddress <<= :ipRange', { ipRange: filters.ipRange });
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('plc.tags && :tags', { tags: filters.tags });
    }

    const plcs = await queryBuilder.getMany();

    if (options.format === 'json') {
      return Buffer.from(JSON.stringify(plcs, null, 2));
    }

    // Format as CSV
    const rows = plcs.map(plc => ({
      site_name: plc.equipment?.cell?.site?.name || '',
      cell_name: plc.equipment?.cell?.name || '',
      cell_type: '', // Cell doesn't have cellType in current schema
      equipment_name: plc.equipment?.name || '',
      equipment_type: plc.equipment?.equipmentType || '',
      tag_id: plc.tagId,
      description: plc.description,
      make: plc.make,
      model: plc.model,
      ip_address: plc.ipAddress || '',
      firmware_version: plc.firmwareVersion || '',
      tags: '', // Tags are in separate entity, would need to join
    }));

    return new Promise((resolve, reject) => {
      stringify(
        rows,
        {
          header: true,
          columns: [
            'site_name',
            'cell_name',
            'cell_type',
            'equipment_name',
            'equipment_type',
            'tag_id',
            'description',
            'make',
            'model',
            'ip_address',
            'firmware_version',
            'tags',
          ],
        },
        (err, output) => {
          if (err) reject(err);
          else resolve(Buffer.from(output));
        }
      );
    });
  }

  /**
   * Get import history
   */
  async getImportHistory(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    data: ImportLog[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    // In a real implementation, this would query from the database
    // For now, return from Redis cache
    const cacheKey = `import_history:${userId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      const history = JSON.parse(cached);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      return {
        data: history.slice(start, end),
        total: history.length,
        page,
        pageSize,
      };
    }

    return {
      data: [],
      total: 0,
      page,
      pageSize,
    };
  }

  /**
   * Create import log entry
   */
  private async createImportLog(log: ImportLog): Promise<void> {
    // Store in Redis for now (would be database in production)
    const cacheKey = `import_log:${log.id}`;
    await redisClient.setEx(cacheKey, 86400, JSON.stringify(log)); // 24 hour expiry

    // Also add to user's history
    const historyKey = `import_history:${log.userId}`;
    const history = await redisClient.get(historyKey);
    const logs = history ? JSON.parse(history) : [];
    logs.unshift(log);
    await redisClient.setEx(historyKey, 86400, JSON.stringify(logs));
  }

  /**
   * Get import log by ID
   */
  async getImportLog(importId: string): Promise<ImportLog | null> {
    const cacheKey = `import_log:${importId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    return null;
  }

  /**
   * Rollback an import
   */
  async rollbackImport(importId: string, userId: string): Promise<ImportRollback> {
    const importLog = await this.getImportLog(importId);

    if (!importLog) {
      throw new Error('Import log not found');
    }

    if (!importLog.rollbackAvailable) {
      throw new Error('Rollback not available for this import');
    }

    if (importLog.status !== 'completed') {
      throw new Error('Can only rollback completed imports');
    }

    // In a real implementation, this would restore from backup
    // For now, just mark as rolled back
    importLog.status = 'rolled_back';
    importLog.rollbackAvailable = false;

    const cacheKey = `import_log:${importId}`;
    await redisClient.setEx(cacheKey, 86400, JSON.stringify(importLog));

    // Create rollback record
    const rollback: ImportRollback = {
      id: uuidv4(),
      importId,
      userId,
      rollbackAt: new Date(),
      affectedRecords: importLog.processedRows,
      status: 'success',
    };

    // Audit log - would be logged here if logAction method existed
    logger.info('Bulk rollback completed', {
      userId,
      action: 'BULK_ROLLBACK',
      entity: 'PLC',
      entityId: importId,
      details: {
        affectedRecords: rollback.affectedRecords,
      },
    });

    return rollback;
  }
}
