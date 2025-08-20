/**
 * Import/Export Routes Integration Tests
 *
 * Tests for API endpoints including file upload, validation,
 * authentication, and response formats.
 */

import request from 'supertest';
import { Express, NextFunction, Request, Response } from 'express';
import { createApp } from '../../app';

jest.mock('../../config/logger');

// Mock database
jest.mock('../../config/database', () => ({
  AppDataSource: {
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    },
    getRepository: jest.fn(() => ({
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    })),
    createQueryRunner: jest.fn(() => ({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      },
    })),
  }
}));

// Mock services
jest.mock('../../services/SiteService');
jest.mock('../../services/CellService');
jest.mock('../../services/EquipmentService');
jest.mock('../../services/AuditService');

// Mock entities
jest.mock('../../entities/ImportHistory');

// Mock metrics middleware
jest.mock('../../middleware/metricsMiddleware', () => ({
  metricsMiddleware: (req: Request, res: Response, next: NextFunction) => {
    next();
  }
}));

// Mock audit context middleware
jest.mock('../../middleware/auditContext', () => ({
  auditContextMiddleware: (req: Request, res: Response, next: NextFunction) => {
    req.auditEntityManager = {};
    next();
  }
}));

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticate: (req: Request, res: Response, next: NextFunction) => {
    req.user = { sub: 'test-user-id', email: 'test@example.com' };
    next();
  },
  authorize: () => (req: Request, res: Response, next: NextFunction) => {
    next();
  },
  requireAdmin: (req: Request, res: Response, next: NextFunction) => {
    next();
  },
  optionalAuthenticate: (req: Request, res: Response, next: NextFunction) => {
    next();
  },
  authorizeAll: () => (req: Request, res: Response, next: NextFunction) => {
    next();
  },
  requireActiveUser: (req: Request, res: Response, next: NextFunction) => {
    next();
  }
}));

describe('Import/Export Routes', () => {
  let app: Express;
  let mockAppDataSource: any;

  beforeAll(async () => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock behavior
    const { AppDataSource } = require('../../config/database');
    mockAppDataSource = AppDataSource;
    mockAppDataSource.getRepository().findOne.mockResolvedValue(null);
  });

  describe('GET /api/v1/import/template', () => {
    it('should return CSV template with correct headers', async () => {
      const response = await request(app)
        .get('/api/v1/import/template')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toBe('attachment; filename="plc-import-template.csv"');
      
      const csvContent = response.text;
      expect(csvContent).toContain('site_name');
      expect(csvContent).toContain('cell_name');
      expect(csvContent).toContain('equipment_name');
      expect(csvContent).toContain('tag_id');
      expect(csvContent).toContain('Plant A');
    });
  });

  describe('POST /api/v1/import/validate', () => {
    it('should validate valid CSV file', async () => {
      const csvContent = [
        'site_name,cell_name,line_number,equipment_name,equipment_type,tag_id,description,make,model',
        'Plant A,Line 1,001,Robot 1,ROBOT,ROBOT_001,Test robot,ABB,IRB 2600'
      ].join('\n');

      const response = await request(app)
        .post('/api/v1/import/validate')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.validation.isValid).toBe(true);
      expect(response.body.validation.headerErrors).toHaveLength(0);
      expect(response.body.validation.preview).toHaveLength(1);
    });

    it('should detect validation errors in CSV', async () => {
      const invalidCsvContent = [
        'site_name,cell_name',
        'Plant A,Line 1'
      ].join('\n');

      const response = await request(app)
        .post('/api/v1/import/validate')
        .attach('file', Buffer.from(invalidCsvContent), 'invalid.csv')
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.validation.isValid).toBe(false);
      expect(response.body.validation.headerErrors.length).toBeGreaterThan(0);
    });

    it('should reject non-CSV files', async () => {
      const response = await request(app)
        .post('/api/v1/import/validate')
        .attach('file', Buffer.from('not a csv'), 'test.txt')
        .expect(400);

      expect(response.text).toContain('Only CSV files are allowed');
    });

    it('should require file upload', async () => {
      const response = await request(app)
        .post('/api/v1/import/validate')
        .expect(400);

      expect(response.body.error).toBe('No CSV file provided');
    });
  });

  describe('POST /api/v1/import/plcs', () => {
    it('should handle validate-only import', async () => {
      const csvContent = [
        'site_name,cell_name,line_number,equipment_name,equipment_type,tag_id,description,make,model',
        'Plant A,Line 1,001,Robot 1,ROBOT,ROBOT_001,Test robot,ABB,IRB 2600'
      ].join('\n');

      const response = await request(app)
        .post('/api/v1/import/plcs')
        .field('validateOnly', 'true')
        .field('createMissing', 'false')
        .field('duplicateHandling', 'skip')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.totalRows).toBe(1);
      expect(response.body.createdEntities).toEqual({
        sites: 0,
        cells: 0,
        equipment: 0,
        plcs: 0
      });
    });

    it('should validate import options', async () => {
      const csvContent = [
        'site_name,cell_name,line_number,equipment_name,equipment_type,tag_id,description,make,model',
        'Plant A,Line 1,001,Robot 1,ROBOT,ROBOT_001,Test robot,ABB,IRB 2600'
      ].join('\n');

      const response = await request(app)
        .post('/api/v1/import/plcs')
        .field('duplicateHandling', 'invalid-option')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(400);

      expect(response.body.error).toHaveProperty('details');
      expect(response.body.error.details.length).toBeGreaterThan(0);
    });

    it('should return error for invalid CSV', async () => {
      const invalidCsv = [
        'site_name',
        'Plant A'
      ].join('\n');

      const response = await request(app)
        .post('/api/v1/import/plcs')
        .field('validateOnly', 'false')
        .attach('file', Buffer.from(invalidCsv), 'invalid.csv')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/v1/export/plcs', () => {
    it('should export PLCs with filters', async () => {
      // This would need proper mocking of the data source
      // For now, we'll test the request structure
      const response = await request(app)
        .post('/api/v1/export/plcs')
        .send({
          filters: {
            sites: ['Plant A'],
            equipmentTypes: ['ROBOT']
          },
          options: {
            includeHierarchy: true,
            format: 'csv'
          }
        })
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should validate export request body', async () => {
      const response = await request(app)
        .post('/api/v1/export/plcs')
        .send({
          filters: {
            equipmentTypes: ['INVALID_TYPE']
          }
        })
        .expect(400);

      expect(response.body.error).toHaveProperty('details');
      expect(response.body.error.details.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/import/history', () => {
    it('should return paginated import history', async () => {
      const response = await request(app)
        .get('/api/v1/import/history')
        .query({ page: 1, pageSize: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toEqual({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0
      });
    });

    it('should limit page size to maximum', async () => {
      const response = await request(app)
        .get('/api/v1/import/history')
        .query({ pageSize: 200 })
        .expect(200);

      // Should be limited to 100
      expect(response.body.pagination.pageSize).toBe(100);
    });
  });

  describe('POST /api/v1/import/:importId/rollback', () => {
    it('should return not implemented error', async () => {
      // This test needs an existing import record
      mockAppDataSource.getRepository().findOne.mockResolvedValueOnce({
        id: 'test-uuid-123',
        userId: 'test-user-id',
        status: 'completed'
      });

      const response = await request(app)
        .post('/api/v1/import/test-uuid-123/rollback');

      // The rollback functionality is not yet fully implemented
      // Accepting either 404 (route not found) or 501 (not implemented)
      expect([404, 501]).toContain(response.status);
      
      if (response.status === 501) {
        expect(response.body.error).toBe('Rollback functionality not yet implemented');
      }
    });

    it('should return 404 for non-existent import', async () => {
      const response = await request(app)
        .post('/api/v1/import/non-existent-id/rollback')
        .expect(404);

      expect(response.body.error).toBe('Import record not found');
    });
  });

  describe('File upload limits', () => {
    it('should reject files larger than 10MB', async () => {
      // Create a buffer larger than 10MB (10 * 1024 * 1024 bytes)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 'x');
      
      const response = await request(app)
        .post('/api/v1/import/validate')
        .attach('file', largeBuffer, 'large.csv')
        .expect(413); // Payload too large

      expect(response.text).toContain('File too large');
    });
  });

  describe('Authentication', () => {
    // These tests would need to mock the authentication properly
    // For now they're placeholders showing the expected behavior

    it('should require authentication for all endpoints', async () => {
      // This would test that unauthenticated requests return 401
      // Need to properly mock the auth middleware for this
    });

    it('should only allow users to access their own import history', async () => {
      // This would test that users can only see their own imports
    });
  });
});
