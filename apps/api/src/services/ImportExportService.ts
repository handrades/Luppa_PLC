/**
 * Import/Export Service
 *
 * Business logic layer for bulk data operations, CSV parsing/generation,
 * hierarchy validation during import, and auto-creation of missing entities.
 */

import { DataSource, QueryRunner } from 'typeorm';
import { parse as csvParse } from 'csv-parse';
import { stringify as csvStringify } from 'csv-stringify';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';
import { Site } from '../entities/Site';
import { Cell } from '../entities/Cell';
import { Equipment, EquipmentType } from '../entities/Equipment';
import { PLC } from '../entities/PLC';
import { ImportHistory } from '../entities/ImportHistory';
import { SiteService } from './SiteService';
import { CellService } from './CellService';
import { EquipmentService } from './EquipmentService';
import { AuditService } from './AuditService';
import { DatabaseError } from '../errors/DatabaseError';

// Types and Interfaces
export interface ImportOptions {
  createMissing: boolean;
  duplicateHandling: 'skip' | 'overwrite' | 'merge';
  backgroundThreshold: number;
  validateOnly: boolean;
}

export interface ValidationError {
  row: number;
  field: string;
  value: unknown;
  error: string;
  severity: 'error' | 'warning';
}

export interface RowValidationError {
  row: number;
  errors: ValidationError[];
}

export interface ValidationResult {
  isValid: boolean;
  headerErrors: string[];
  rowErrors: RowValidationError[];
  preview: Record<string, string>[];
}

export interface CreatedEntitySummary {
  sites: number;
  cells: number;
  equipment: number;
  plcs: number;
}

export interface ImportResult {
  success: boolean;
  importId: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: ValidationError[];
  createdEntities: CreatedEntitySummary;
  isBackground: boolean;
}

export interface ImportHistoryItem {
  id: string;
  userId: string;
  filename: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  options: ImportOptions;
  errors: ValidationError[];
  createdEntities: CreatedEntitySummary;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
}

export interface PLCFilters {
  sites?: string[];
  cells?: string[];
  equipmentTypes?: EquipmentType[];
  makes?: string[];
  models?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface ExportOptions {
  includeHierarchy: boolean;
  includeTags: boolean;
  format: 'csv';
}

// CSV Schema Definition
export interface CSVRow {
  site_name: string;
  cell_name: string;
  line_number: string;
  equipment_name: string;
  equipment_type: string;
  tag_id: string;
  description: string;
  make: string;
  model: string;
  ip_address?: string;
  firmware_version?: string;
}

const REQUIRED_HEADERS = [
  'site_name',
  'cell_name',
  'line_number',
  'equipment_name',
  'equipment_type',
  'tag_id',
  'description',
  'make',
  'model',
];

const OPTIONAL_HEADERS = ['ip_address', 'firmware_version'];

const ALL_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];

export class ImportExportService {
  private dataSource: DataSource;

  constructor(
    dataSource: DataSource,
    _siteService: SiteService,
    _cellService: CellService,
    _equipmentService: EquipmentService,
    _auditService: AuditService
  ) {
    this.dataSource = dataSource;
    // Services stored as parameters for future extensibility
  }

  /**
   * Generate CSV template with all required and optional fields
   */
  async generateTemplate(): Promise<Buffer> {
    const headers = ALL_HEADERS;
    const sampleData: CSVRow = {
      site_name: 'Plant A',
      cell_name: 'Line 1',
      line_number: '001',
      equipment_name: 'Robot Arm 1',
      equipment_type: 'ROBOT',
      tag_id: 'ROBOT_001',
      description: 'Primary assembly robot',
      make: 'ABB',
      model: 'IRB 2600',
      ip_address: '192.168.1.100',
      firmware_version: '7.10.1',
    };

    return new Promise((resolve, reject) => {
      const records = [headers, Object.values(sampleData)];

      csvStringify(records, { header: false }, (err, output) => {
        if (err) {
          logger.error('Error generating CSV template', { error: err });
          reject(new Error('Failed to generate CSV template'));
        } else {
          resolve(Buffer.from(output));
        }
      });
    });
  }

  /**
   * Validate CSV file structure and data
   */
  async validateCSV(file: Buffer): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      headerErrors: [],
      rowErrors: [],
      preview: [],
    };

    return new Promise((resolve, reject) => {
      const records: string[][] = [];
      let headerRow: string[] = [];
      let isFirstRow = true;

      const stream = Readable.from(file);
      const parser = stream.pipe(
        csvParse({
          skip_empty_lines: true,
          trim: true,
          // Note: max_limit_on_data_read may not be a valid option in current csv-parse version
        })
      );

      parser.on('data', (row: string[]) => {
        if (isFirstRow) {
          headerRow = row;
          isFirstRow = false;

          // Validate headers
          const missingRequired = REQUIRED_HEADERS.filter(h => !headerRow.includes(h));
          if (missingRequired.length > 0) {
            result.headerErrors.push(`Missing required headers: ${missingRequired.join(', ')}`);
            result.isValid = false;
          }

          const unknownHeaders = headerRow.filter(h => !ALL_HEADERS.includes(h));
          if (unknownHeaders.length > 0) {
            result.headerErrors.push(`Unknown headers: ${unknownHeaders.join(', ')}`);
          }
        } else {
          records.push(row);

          // Store preview (first 10 rows)
          if (result.preview.length < 10) {
            const rowObj: Record<string, string> = {};
            headerRow.forEach((header, index) => {
              rowObj[header] = row[index] || '';
            });
            result.preview.push(rowObj);
          }
        }
      });

      parser.on('error', err => {
        logger.error('CSV parsing error during validation', { error: err });
        reject(new Error('Invalid CSV format'));
      });

      parser.on('end', () => {
        // Validate data rows (up to first 100 for performance)
        const rowsToValidate = records.slice(0, 100);

        rowsToValidate.forEach((row, index) => {
          const rowErrors = this.validateRow(row, headerRow, index + 2); // +2 for header and 1-based indexing
          if (rowErrors.length > 0) {
            result.rowErrors.push({
              row: index + 2,
              errors: rowErrors,
            });
            result.isValid = false;
          }
        });

        resolve(result);
      });
    });
  }

  /**
   * Validate individual row data
   */
  private validateRow(row: string[], headers: string[], rowNumber: number): ValidationError[] {
    const errors: ValidationError[] = [];

    headers.forEach((header, index) => {
      const value = row[index] || '';

      // Check required fields
      if (REQUIRED_HEADERS.includes(header) && !value.trim()) {
        errors.push({
          row: rowNumber,
          field: header,
          value,
          error: 'Required field is empty',
          severity: 'error',
        });
      }

      // Validate specific field types
      switch (header) {
        case 'equipment_type':
          if (value && !Object.values(EquipmentType).includes(value as EquipmentType)) {
            errors.push({
              row: rowNumber,
              field: header,
              value,
              error: `Invalid equipment type. Valid types: ${Object.values(EquipmentType).join(', ')}`,
              severity: 'error',
            });
          }
          break;

        case 'ip_address':
          if (value && !this.isValidIPAddress(value)) {
            errors.push({
              row: rowNumber,
              field: header,
              value,
              error: 'Invalid IP address format',
              severity: 'error',
            });
          }
          break;

        case 'tag_id':
          if (value && (value.length < 3 || value.length > 100)) {
            errors.push({
              row: rowNumber,
              field: header,
              value,
              error: 'Tag ID must be between 3 and 100 characters',
              severity: 'error',
            });
          }
          break;
      }
    });

    return errors;
  }

  /**
   * Validate IP address format (IPv4/IPv6)
   */
  private isValidIPAddress(ip: string): boolean {
    // IPv4 pattern
    const ipv4Pattern =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    if (ipv4Pattern.test(ip)) {
      return true;
    }

    // IPv6 validation - handle different formats
    // Remove any zone ID (e.g., %eth0)
    const cleanIp = ip.split('%')[0];

    // Full IPv6 format: 8 groups of 4 hex digits
    if (/^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(cleanIp)) {
      return true;
    }

    // IPv6 with :: compression
    if (cleanIp === '::' || cleanIp === '::1') {
      return true;
    }

    // Check for :: compression in the middle
    if (cleanIp.includes('::')) {
      const parts = cleanIp.split('::');
      if (parts.length !== 2) return false;

      const leftParts = parts[0] ? parts[0].split(':') : [];
      const rightParts = parts[1] ? parts[1].split(':') : [];

      // Must have less than 8 total groups for :: to be valid
      if (leftParts.length + rightParts.length >= 8) return false;

      // Validate each part
      const allParts = [...leftParts, ...rightParts];
      return allParts.every(part => /^[0-9a-fA-F]{1,4}$/.test(part));
    }

    return false;
  }

  /**
   * Import PLCs from CSV file
   */
  async importPLCs(file: Buffer, options: ImportOptions, userId: string): Promise<ImportResult> {
    const importId = uuidv4();

    logger.info('Starting PLC import', {
      importId,
      options,
      userId,
      fileSize: file.length,
    });

    // First validate the CSV
    const validation = await this.validateCSV(file);
    if (!validation.isValid) {
      logger.error('CSV validation failed', {
        importId,
        errors: validation.headerErrors,
      });
      return {
        success: false,
        importId,
        totalRows: 0,
        successfulRows: 0,
        failedRows: 0,
        errors: validation.headerErrors.map(error => ({
          row: 0,
          field: 'header',
          value: null,
          error,
          severity: 'error' as const,
        })),
        createdEntities: { sites: 0, cells: 0, equipment: 0, plcs: 0 },
        isBackground: false,
      };
    }

    if (options.validateOnly) {
      const totalRows = await this.countCSVRows(file);
      const successfulRows = totalRows - validation.rowErrors.length;
      const failedRows = validation.rowErrors.length;

      return {
        success: true,
        importId,
        totalRows,
        successfulRows,
        failedRows,
        errors: validation.rowErrors.flatMap(re => re.errors),
        createdEntities: { sites: 0, cells: 0, equipment: 0, plcs: 0 },
        isBackground: false,
      };
    }

    // Parse CSV and process rows
    return await this.processImport(file, options, userId, importId);
  }

  /**
   * Sanitize value to prevent CSV injection attacks
   */
  private sanitizeForCSV(value: unknown): string {
    if (value === null || value === undefined) return '';

    const strValue = String(value);

    // Check if the value starts with dangerous characters
    if (strValue.length > 0 && ['=', '+', '-', '@'].includes(strValue.charAt(0))) {
      return `'${strValue}`;
    }

    return strValue;
  }

  /**
   * Count total rows in CSV file (excluding header)
   */
  private async countCSVRows(file: Buffer): Promise<number> {
    let rowCount = 0;
    return new Promise<number>((resolve, reject) => {
      const stream = Readable.from(file);
      let isFirstRow = true;

      const parser = stream.pipe(
        csvParse({
          skip_empty_lines: true,
          trim: true,
        })
      );

      parser.on('data', () => {
        if (isFirstRow) {
          isFirstRow = false;
        } else {
          rowCount++;
        }
      });

      parser.on('error', reject);
      parser.on('end', () => resolve(rowCount));
    });
  }

  /**
   * Process the actual import with transaction support
   */
  private async processImport(
    file: Buffer,
    options: ImportOptions,
    userId: string,
    importId: string
  ): Promise<ImportResult> {
    let totalRows = 0;
    let successfulRows = 0;
    let failedRows = 0;
    const errors: ValidationError[] = [];
    const createdEntities: CreatedEntitySummary = {
      sites: 0,
      cells: 0,
      equipment: 0,
      plcs: 0,
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Update ImportHistory status to "processing"
    const importHistoryRepo = this.dataSource.getRepository(ImportHistory);
    const importHistoryRecord = await importHistoryRepo.findOne({ where: { id: importId } });
    if (importHistoryRecord) {
      importHistoryRecord.status = 'processing';
      await importHistoryRepo.save(importHistoryRecord);
    }

    try {
      const records: CSVRow[] = [];

      // Parse CSV
      await new Promise<void>((resolve, reject) => {
        const stream = Readable.from(file);
        let headerRow: string[] = [];
        let isFirstRow = true;

        const parser = stream.pipe(
          csvParse({
            skip_empty_lines: true,
            trim: true,
            // Note: Additional options may be available depending on csv-parse version
          })
        );

        parser.on('data', (row: string[]) => {
          if (isFirstRow) {
            headerRow = row;
            isFirstRow = false;
          } else {
            totalRows++;
            const rowObj: Record<string, string> = {};
            headerRow.forEach((header, index) => {
              rowObj[header] = row[index] || '';
            });
            records.push(rowObj as unknown as CSVRow);
          }
        });

        parser.on('error', reject);
        parser.on('end', resolve);
      });

      // Process each row
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNumber = i + 2; // +2 for header and 1-based indexing

        try {
          await this.processRow(row, options, userId, queryRunner, createdEntities, rowNumber);
          successfulRows++;
        } catch (error) {
          failedRows++;
          logger.error('Row processing failed', {
            importId,
            rowNumber,
            row,
            error: error instanceof Error ? error.message : error,
          });

          errors.push({
            row: rowNumber,
            field: 'general',
            value: null,
            error: error instanceof Error ? error.message : 'Unknown error',
            severity: 'error',
          });
        }
      }

      await queryRunner.commitTransaction();

      // Update ImportHistory status to "completed"
      if (importHistoryRecord) {
        importHistoryRecord.status = 'completed';
        importHistoryRecord.completedAt = new Date();
        await importHistoryRepo.save(importHistoryRecord);
      }

      logger.info('Import completed successfully', {
        importId,
        totalRows,
        successfulRows,
        failedRows,
        createdEntities,
      });

      return {
        success: true,
        importId,
        totalRows,
        successfulRows,
        failedRows,
        errors,
        createdEntities,
        isBackground: totalRows > options.backgroundThreshold,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Update ImportHistory status to "failed"
      if (importHistoryRecord) {
        importHistoryRecord.status = 'failed';
        importHistoryRecord.completedAt = new Date();
        // Store error information if needed
        await importHistoryRepo.save(importHistoryRecord);
      }

      logger.error('Import failed, transaction rolled back', {
        importId,
        error: error instanceof Error ? error.message : error,
      });

      throw new DatabaseError(
        'Import failed',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Process individual row during import
   */
  private async processRow(
    row: CSVRow,
    options: ImportOptions,
    userId: string,
    queryRunner: QueryRunner,
    createdEntities: CreatedEntitySummary,
    rowNumber: number
  ): Promise<void> {
    // Find or create site
    let site = await queryRunner.manager.findOne(Site, {
      where: { name: row.site_name },
    });

    if (!site) {
      if (options.createMissing) {
        site = queryRunner.manager.create(Site, {
          name: row.site_name,
          createdBy: userId,
          updatedBy: userId,
        });
        site = await queryRunner.manager.save(site);
        createdEntities.sites++;
        logger.debug('Created new site', {
          siteName: row.site_name,
          rowNumber,
        });
      } else {
        throw new Error(`Site '${row.site_name}' not found`);
      }
    }

    // Find or create cell
    let cell = await queryRunner.manager.findOne(Cell, {
      where: {
        siteId: site.id,
        lineNumber: row.line_number,
      },
    });

    if (!cell) {
      if (options.createMissing) {
        cell = queryRunner.manager.create(Cell, {
          siteId: site.id,
          name: row.cell_name,
          lineNumber: row.line_number,
          createdBy: userId,
          updatedBy: userId,
        });
        cell = await queryRunner.manager.save(cell);
        createdEntities.cells++;
        logger.debug('Created new cell', {
          cellName: row.cell_name,
          lineNumber: row.line_number,
          rowNumber,
        });
      } else {
        throw new Error(
          `Cell '${row.cell_name}' (Line ${row.line_number}) not found in site '${row.site_name}'`
        );
      }
    }

    // Find or create equipment
    let equipment = await queryRunner.manager.findOne(Equipment, {
      where: {
        cellId: cell.id,
        name: row.equipment_name,
      },
    });

    if (!equipment) {
      if (options.createMissing) {
        equipment = queryRunner.manager.create(Equipment, {
          cellId: cell.id,
          name: row.equipment_name,
          equipmentType: row.equipment_type as EquipmentType,
          createdBy: userId,
          updatedBy: userId,
        });
        equipment = await queryRunner.manager.save(equipment);
        createdEntities.equipment++;
        logger.debug('Created new equipment', {
          equipmentName: row.equipment_name,
          rowNumber,
        });
      } else {
        throw new Error(`Equipment '${row.equipment_name}' not found in cell '${row.cell_name}'`);
      }
    }

    // Handle PLC creation/update based on duplicate handling strategy
    const existingPLC = await this.findExistingPLC(queryRunner, row);

    if (existingPLC) {
      switch (options.duplicateHandling) {
        case 'skip':
          logger.debug('Skipping duplicate PLC', {
            tagId: row.tag_id,
            rowNumber,
          });
          return;

        case 'overwrite':
          await this.updatePLC(queryRunner, existingPLC, row, equipment.id, userId);
          logger.debug('Overwrote existing PLC', {
            tagId: row.tag_id,
            rowNumber,
          });
          return;

        case 'merge':
          await this.mergePLC(queryRunner, existingPLC, row, equipment.id, userId);
          logger.debug('Merged existing PLC', { tagId: row.tag_id, rowNumber });
          return;
      }
    }

    // Create new PLC
    const plc = queryRunner.manager.create(PLC, {
      equipmentId: equipment.id,
      tagId: row.tag_id,
      description: row.description,
      make: row.make,
      model: row.model,
      ipAddress: row.ip_address || null,
      firmwareVersion: row.firmware_version || null,
      createdBy: userId,
      updatedBy: userId,
    });

    await queryRunner.manager.save(plc);
    createdEntities.plcs++;
    logger.debug('Created new PLC', { tagId: row.tag_id, rowNumber });
  }

  /**
   * Find existing PLC by tag_id or ip_address
   */
  private async findExistingPLC(queryRunner: QueryRunner, row: CSVRow): Promise<PLC | null> {
    // Check by tag_id first (unique constraint)
    let plc = await queryRunner.manager.findOne(PLC, {
      where: { tagId: row.tag_id },
    });

    if (plc) return plc;

    // Check by IP address if provided (unique constraint)
    if (row.ip_address) {
      plc = await queryRunner.manager.findOne(PLC, {
        where: { ipAddress: row.ip_address },
      });
    }

    return plc;
  }

  /**
   * Update existing PLC with new data
   */
  private async updatePLC(
    queryRunner: QueryRunner,
    plc: PLC,
    row: CSVRow,
    equipmentId: string,
    userId: string
  ): Promise<void> {
    plc.equipmentId = equipmentId;
    plc.description = row.description;
    plc.make = row.make;
    plc.model = row.model;
    plc.ipAddress = row.ip_address || null;
    plc.firmwareVersion = row.firmware_version || null;
    plc.updatedBy = userId;

    await queryRunner.manager.save(plc);
  }

  /**
   * Merge new data with existing PLC (only update empty fields)
   */
  private async mergePLC(
    queryRunner: QueryRunner,
    plc: PLC,
    row: CSVRow,
    _equipmentId: string,
    userId: string
  ): Promise<void> {
    let hasChanges = false;

    if (!plc.description && row.description) {
      plc.description = row.description;
      hasChanges = true;
    }
    if (!plc.make && row.make) {
      plc.make = row.make;
      hasChanges = true;
    }
    if (!plc.model && row.model) {
      plc.model = row.model;
      hasChanges = true;
    }
    if (!plc.ipAddress && row.ip_address) {
      plc.ipAddress = row.ip_address;
      hasChanges = true;
    }
    if (!plc.firmwareVersion && row.firmware_version) {
      plc.firmwareVersion = row.firmware_version;
      hasChanges = true;
    }

    if (hasChanges) {
      plc.updatedBy = userId;
      await queryRunner.manager.save(plc);
    }
  }

  /**
   * Export PLCs to CSV based on filters
   */
  async exportPLCs(filters: PLCFilters, options: ExportOptions): Promise<Buffer> {
    logger.info('Starting PLC export', { filters, options });

    // Build query with filters
    const queryBuilder = this.dataSource
      .getRepository(PLC)
      .createQueryBuilder('plc')
      .leftJoinAndSelect('plc.equipment', 'equipment')
      .leftJoinAndSelect('equipment.cell', 'cell')
      .leftJoinAndSelect('cell.site', 'site');

    // Apply filters
    if (filters.sites && filters.sites.length > 0) {
      queryBuilder.andWhere('site.name IN (:...sites)', {
        sites: filters.sites,
      });
    }

    if (filters.cells && filters.cells.length > 0) {
      queryBuilder.andWhere('cell.name IN (:...cells)', {
        cells: filters.cells,
      });
    }

    if (filters.equipmentTypes && filters.equipmentTypes.length > 0) {
      queryBuilder.andWhere('equipment.equipmentType IN (:...equipmentTypes)', {
        equipmentTypes: filters.equipmentTypes,
      });
    }

    if (filters.makes && filters.makes.length > 0) {
      queryBuilder.andWhere('plc.make IN (:...makes)', {
        makes: filters.makes,
      });
    }

    if (filters.models && filters.models.length > 0) {
      queryBuilder.andWhere('plc.model IN (:...models)', {
        models: filters.models,
      });
    }

    if (filters.dateFrom) {
      queryBuilder.andWhere('plc.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      queryBuilder.andWhere('plc.createdAt <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(plc.description ILIKE :search OR plc.make ILIKE :search OR plc.model ILIKE :search OR plc.tagId ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    queryBuilder
      .orderBy('site.name', 'ASC')
      .addOrderBy('cell.name', 'ASC')
      .addOrderBy('equipment.name', 'ASC')
      .addOrderBy('plc.tagId', 'ASC');

    const plcs = await queryBuilder.getMany();

    logger.info('Export query completed', { recordCount: plcs.length });

    // Convert to CSV format
    const csvData = plcs.map(plc => ({
      site_name: this.sanitizeForCSV(plc.equipment?.cell?.site?.name || ''),
      cell_name: this.sanitizeForCSV(plc.equipment?.cell?.name || ''),
      line_number: this.sanitizeForCSV(plc.equipment?.cell?.lineNumber || ''),
      equipment_name: this.sanitizeForCSV(plc.equipment?.name || ''),
      equipment_type: this.sanitizeForCSV(plc.equipment?.equipmentType || ''),
      tag_id: this.sanitizeForCSV(plc.tagId),
      description: this.sanitizeForCSV(plc.description),
      make: this.sanitizeForCSV(plc.make),
      model: this.sanitizeForCSV(plc.model),
      ip_address: this.sanitizeForCSV(plc.ipAddress || ''),
      firmware_version: this.sanitizeForCSV(plc.firmwareVersion || ''),
    }));

    // Generate CSV
    return new Promise((resolve, reject) => {
      const records = [
        ALL_HEADERS,
        ...csvData.map(row => ALL_HEADERS.map(header => (row as Record<string, string>)[header])),
      ];

      csvStringify(
        records,
        {
          header: false,
          quoted_string: true,
          escape: '"',
        },
        (err, output) => {
          if (err) {
            logger.error('Error generating CSV export', { error: err });
            reject(new Error('Failed to generate CSV export'));
          } else {
            logger.info('CSV export generated successfully', {
              size: output.length,
            });
            resolve(Buffer.from(output));
          }
        }
      );
    });
  }
}
