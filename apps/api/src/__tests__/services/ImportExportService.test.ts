/**
 * ImportExportService Unit Tests
 *
 * Comprehensive tests for CSV processing, validation, import/export operations
 * with transaction support and error handling.
 */

import { DataSource } from 'typeorm';
import { ExportOptions, ImportExportService, ImportOptions, PLCFilters } from '../../services/ImportExportService';
import { SiteService } from '../../services/SiteService';
import { CellService } from '../../services/CellService';
import { EquipmentService } from '../../services/EquipmentService';
import { AuditService } from '../../services/AuditService';
import { EquipmentType } from '../../entities/Equipment';

// Mock services
jest.mock('../../services/SiteService');
jest.mock('../../services/CellService');
jest.mock('../../services/EquipmentService');
jest.mock('../../services/AuditService');
jest.mock('../../config/logger');

describe('ImportExportService', () => {
  let service: ImportExportService;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockSiteService: jest.Mocked<SiteService>;
  let mockCellService: jest.Mocked<CellService>;
  let mockEquipmentService: jest.Mocked<EquipmentService>;
  let mockAuditService: jest.Mocked<AuditService>;

  beforeEach(() => {
    // Setup mocked data source
    mockDataSource = {
      createQueryRunner: jest.fn(),
      getRepository: jest.fn(),
    } as jest.Mocked<DataSource>;

    // Setup mocked services
    mockSiteService = new SiteService({} as DataSource) as jest.Mocked<SiteService>;
    mockCellService = new CellService({} as DataSource) as jest.Mocked<CellService>;
    mockEquipmentService = new EquipmentService({} as DataSource) as jest.Mocked<EquipmentService>;
    mockAuditService = new AuditService({} as DataSource) as jest.Mocked<AuditService>;

    service = new ImportExportService(
      mockDataSource,
      mockSiteService,
      mockCellService,
      mockEquipmentService,
      mockAuditService
    );
  });

  describe('generateTemplate', () => {
    it('should generate a valid CSV template', async () => {
      const template = await service.generateTemplate();
      
      expect(template).toBeInstanceOf(Buffer);
      
      const csvContent = template.toString();
      expect(csvContent).toContain('site_name');
      expect(csvContent).toContain('cell_name');
      expect(csvContent).toContain('equipment_name');
      expect(csvContent).toContain('tag_id');
      expect(csvContent).toContain('Plant A');
      expect(csvContent).toContain('ROBOT_001');
    });
  });

  describe('validateCSV', () => {
    it('should validate CSV with all required headers', async () => {
      const validCsv = Buffer.from([
        'site_name,cell_name,line_number,equipment_name,equipment_type,tag_id,description,make,model',
        'Plant A,Line 1,001,Robot 1,ROBOT,ROBOT_001,Test robot,ABB,IRB 2600'
      ].join('\n'));

      const result = await service.validateCSV(validCsv);

      expect(result.isValid).toBe(true);
      expect(result.headerErrors).toHaveLength(0);
      expect(result.preview).toHaveLength(1);
      expect(result.preview[0]).toEqual({
        site_name: 'Plant A',
        cell_name: 'Line 1',
        line_number: '001',
        equipment_name: 'Robot 1',
        equipment_type: 'ROBOT',
        tag_id: 'ROBOT_001',
        description: 'Test robot',
        make: 'ABB',
        model: 'IRB 2600'
      });
    });

    it('should detect missing required headers', async () => {
      const invalidCsv = Buffer.from([
        'site_name,equipment_name,tag_id',
        'Plant A,Robot 1,ROBOT_001'
      ].join('\n'));

      const result = await service.validateCSV(invalidCsv);

      expect(result.isValid).toBe(false);
      expect(result.headerErrors).toContain(
        'Missing required headers: cell_name, line_number, equipment_type, description, make, model'
      );
    });

    it('should validate row data and detect errors', async () => {
      const csvWithErrors = Buffer.from([
        'site_name,cell_name,line_number,equipment_name,equipment_type,tag_id,description,make,model,ip_address',
        ',,001,Robot 1,INVALID_TYPE,,Test robot,ABB,IRB 2600,invalid.ip',
        'Plant B,Line 2,002,Robot 2,ROBOT,AB,Valid robot,ABB,IRB 1600,192.168.1.100'
      ].join('\n'));

      const result = await service.validateCSV(csvWithErrors);

      expect(result.isValid).toBe(false);
      expect(result.rowErrors).toHaveLength(2);
      
      // Check first row errors
      const firstRowErrors = result.rowErrors[0];
      expect(firstRowErrors.row).toBe(2);
      expect(firstRowErrors.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'site_name',
            error: 'Required field is empty'
          }),
          expect.objectContaining({
            field: 'cell_name', 
            error: 'Required field is empty'
          }),
          expect.objectContaining({
            field: 'equipment_type',
            error: expect.stringContaining('Invalid equipment type')
          }),
          expect.objectContaining({
            field: 'tag_id',
            error: 'Required field is empty'
          }),
          expect.objectContaining({
            field: 'ip_address',
            error: 'Invalid IP address format'
          })
        ])
      );

      // Check second row errors
      const secondRowErrors = result.rowErrors[1];
      expect(secondRowErrors.row).toBe(3);
      expect(secondRowErrors.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'tag_id',
            error: 'Tag ID must be between 3 and 100 characters'
          })
        ])
      );
    });

    it('should validate IP addresses correctly', async () => {
      const csvWithIPs = Buffer.from([
        'site_name,cell_name,line_number,equipment_name,equipment_type,tag_id,description,make,model,ip_address',
        'Plant A,Line 1,001,Robot 1,ROBOT,ROBOT_001,Test robot,ABB,IRB 2600,192.168.1.100',
        'Plant A,Line 1,002,Robot 2,ROBOT,ROBOT_002,Test robot,ABB,IRB 2600,2001:db8::1',
        'Plant A,Line 1,003,Robot 3,ROBOT,ROBOT_003,Test robot,ABB,IRB 2600,300.300.300.300'
      ].join('\n'));

      const result = await service.validateCSV(csvWithIPs);

      expect(result.rowErrors).toHaveLength(1);
      expect(result.rowErrors[0].row).toBe(4);
      expect(result.rowErrors[0].errors[0].field).toBe('ip_address');
      expect(result.rowErrors[0].errors[0].value).toBe('300.300.300.300');
    });
  });

  describe('importPLCs', () => {
    it('should validate CSV and return validation errors for invalid data', async () => {
      const invalidCsv = Buffer.from([
        'site_name,cell_name',
        'Plant A,Line 1'
      ].join('\n'));

      const options: ImportOptions = {
        createMissing: false,
        duplicateHandling: 'skip',
        backgroundThreshold: 1000,
        validateOnly: false
      };

      const result = await service.importPLCs(invalidCsv, options, 'user-id');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('header');
    });

    it('should return validation results when validateOnly is true', async () => {
      const validCsv = Buffer.from([
        'site_name,cell_name,line_number,equipment_name,equipment_type,tag_id,description,make,model',
        'Plant A,Line 1,001,Robot 1,ROBOT,ROBOT_001,Test robot,ABB,IRB 2600',
        'Plant A,Line 1,002,Robot 2,ROBOT,ROBOT_002,Test robot 2,ABB,IRB 2600'
      ].join('\n'));

      const options: ImportOptions = {
        createMissing: false,
        duplicateHandling: 'skip',
        backgroundThreshold: 1000,
        validateOnly: true
      };

      const result = await service.importPLCs(validCsv, options, 'user-id');

      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(2);
      expect(result.successfulRows).toBe(2);
      expect(result.failedRows).toBe(0);
      expect(result.createdEntities).toEqual({
        sites: 0,
        cells: 0,
        equipment: 0,
        plcs: 0
      });
    });
  });

  describe('exportPLCs', () => {
    it('should generate CSV export with hierarchy information', async () => {
      // Mock data source query builder
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn(() => mockQueryBuilder),
        leftJoinAndSelect: jest.fn(() => mockQueryBuilder),
        andWhere: jest.fn(() => mockQueryBuilder),
        orderBy: jest.fn(() => mockQueryBuilder),
        addOrderBy: jest.fn(() => mockQueryBuilder),
        getMany: jest.fn(() => Promise.resolve([
          {
            tagId: 'ROBOT_001',
            description: 'Test robot',
            make: 'ABB',
            model: 'IRB 2600',
            ipAddress: '192.168.1.100',
            firmwareVersion: '7.10.1',
            equipment: {
              name: 'Robot 1',
              equipmentType: EquipmentType.ROBOT,
              cell: {
                name: 'Line 1',
                lineNumber: '001',
                site: {
                  name: 'Plant A'
                }
              }
            }
          }
        ]))
      };

      mockDataSource.getRepository.mockReturnValue(mockQueryBuilder as unknown as ReturnType<DataSource['getRepository']>);

      const filters: PLCFilters = {
        sites: ['Plant A']
      };

      const options: ExportOptions = {
        includeHierarchy: true,
        includeTags: false,
        format: 'csv'
      };

      const result = await service.exportPLCs(filters, options);

      expect(result).toBeInstanceOf(Buffer);
      
      const csvContent = result.toString();
      expect(csvContent).toContain('Plant A');
      expect(csvContent).toContain('Line 1');
      expect(csvContent).toContain('Robot 1');
      expect(csvContent).toContain('ROBOT_001');
      expect(csvContent).toContain('192.168.1.100');
    });

    it('should apply filters correctly', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn(() => mockQueryBuilder),
        leftJoinAndSelect: jest.fn(() => mockQueryBuilder),
        andWhere: jest.fn(() => mockQueryBuilder),
        orderBy: jest.fn(() => mockQueryBuilder),
        addOrderBy: jest.fn(() => mockQueryBuilder),
        getMany: jest.fn(() => Promise.resolve([]))
      };

      mockDataSource.getRepository.mockReturnValue(mockQueryBuilder as unknown as ReturnType<DataSource['getRepository']>);

      const filters: PLCFilters = {
        sites: ['Plant A', 'Plant B'],
        equipmentTypes: [EquipmentType.ROBOT],
        makes: ['ABB'],
        search: 'test'
      };

      const options: ExportOptions = {
        includeHierarchy: true,
        includeTags: false,
        format: 'csv'
      };

      await service.exportPLCs(filters, options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'site.name IN (:...sites)',
        { sites: ['Plant A', 'Plant B'] }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'equipment.equipmentType IN (:...equipmentTypes)',
        { equipmentTypes: [EquipmentType.ROBOT] }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'plc.make IN (:...makes)',
        { makes: ['ABB'] }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(plc.description ILIKE :search OR plc.make ILIKE :search OR plc.model ILIKE :search OR plc.tagId ILIKE :search)',
        { search: '%test%' }
      );
    });
  });
});
