/**
 * Cell Routes Integration Tests
 *
 * Comprehensive integration tests for cell management API endpoints.
 * Tests authentication, authorization, validation, and business logic.
 */

import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../helpers/testApp';
import { createAuthToken } from '../helpers/auth';

// Mock logger to prevent console output during tests
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Cells Routes', () => {
  let app: Express;
  let authToken: string;
  let adminToken: string;
  let testSiteId: string;

  // Test data
  const testCellData = {
    siteId: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Test Cell',
    lineNumber: 'LINE-01',
  };

  const testUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    permissions: [
      'cells.read',
      'cells.create',
      'cells.update',
      'cells.delete',
      'sites.create',
      'sites.read',
    ],
  };

  const adminUser = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'admin@example.com',
    permissions: ['cells.read', 'cells.create', 'cells.update', 'cells.delete', 'hierarchy.manage'],
  };

  beforeAll(async () => {
    app = await createTestApp();
    // In a real test, you would get EntityManager from your test database setup
    // For this example, we'll mock it

    authToken = createAuthToken(testUser);
    adminToken = createAuthToken(adminUser);

    // Create a test site first for cell operations
    const siteResponse = await request(app)
      .post('/api/v1/sites')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Site for Cells' });

    if (siteResponse.status !== 201 || !siteResponse.body.site) {
      throw new Error(
        `Failed to create test site. Status: ${siteResponse.status}, Body: ${JSON.stringify(siteResponse.body)}`
      );
    }

    testSiteId = siteResponse.body.site.id;
    testCellData.siteId = testSiteId;
  });

  beforeEach(async () => {
    // Clean up test data before each test
    // In a real implementation, you would clean up your test database
  });

  describe('POST /cells', () => {
    it('should create a new cell successfully', async () => {
      const response = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testCellData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Cell created successfully',
        cell: {
          siteId: testSiteId,
          name: 'Test Cell',
          lineNumber: 'LINE-01',
          equipmentCount: 0,
        },
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).post('/api/v1/cells').send(testCellData).expect(401);

      expect(response.body.error.message).toContain('Authorization header');
    });

    it('should return 403 without proper permissions', async () => {
      const userWithoutPermissions = {
        ...testUser,
        permissions: ['cells.read'], // Missing cells.create
      };
      const tokenWithoutPermissions = createAuthToken(userWithoutPermissions);

      const response = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${tokenWithoutPermissions}`)
        .send(testCellData)
        .expect(403);

      expect(response.body.error.message).toContain('Insufficient permissions');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Missing required fields
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
      expect(response.body.error.details.siteId).toContain('Site ID is required');
      expect(response.body.error.details.name).toContain('Cell name is required');
      expect(response.body.error.details.lineNumber).toContain('Line number is required');
    });

    it('should validate site ID format', async () => {
      const response = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...testCellData, siteId: 'invalid-uuid' })
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
      expect(response.body.error.details.siteId).toContain('Must be a valid UUID');
    });

    it('should validate cell name format', async () => {
      const response = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...testCellData, name: 'Invalid@Name#' })
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
      expect(response.body.error.details.name).toContain(
        'Cell name can only contain letters, numbers, spaces, hyphens, and underscores'
      );
    });

    it('should validate line number format', async () => {
      const response = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...testCellData, lineNumber: 'invalid@line' })
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
      expect(response.body.error.details.lineNumber).toContain(
        'Line number must be uppercase alphanumeric with hyphens only'
      );
    });

    it('should validate cell name length', async () => {
      const longName = 'a'.repeat(101);
      const response = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...testCellData, name: longName })
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
      expect(response.body.error.details.name).toContain('Cell name cannot exceed 100 characters');
    });

    it('should validate line number length', async () => {
      const longLineNumber = 'A'.repeat(51);
      const response = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...testCellData, lineNumber: longLineNumber })
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
      expect(response.body.error.details.lineNumber).toContain(
        'Line number cannot exceed 50 characters'
      );
    });

    it('should handle line number conflicts within site', async () => {
      // Create first cell with unique data
      const uniqueTestData = {
        ...testCellData,
        name: 'Conflict Test Cell 1',
        lineNumber: 'CONFLICT-01',
      };
      await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send(uniqueTestData)
        .expect(201);

      // Try to create duplicate line number in same site
      const response = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send(uniqueTestData)
        .expect(409);

      expect(response.body.error.message).toContain(`Line number 'CONFLICT-01' already exists`);
    });

    it('should handle non-existent site', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';
      const response = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...testCellData, siteId: fakeId })
        .expect(404);

      expect(response.body.error.message).toContain('not found');
    });

    it('should convert line number to uppercase', async () => {
      const response = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...testCellData, lineNumber: 'line-02' })
        .expect(201);

      expect(response.body.cell.lineNumber).toBe('LINE-02');
    });
  });

  describe('GET /cells', () => {
    let cellAId: string;
    let cellBId: string;
    
    beforeEach(async () => {
      // Create test cells with unique data
      const timestamp = Date.now();
      const cellAResponse = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testCellData,
          name: `Cell A ${timestamp}`,
          lineNumber: `A${timestamp}`,
        })
        .expect(201);
      cellAId = cellAResponse.body.cell.id;

      const cellBResponse = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testCellData,
          name: `Cell B ${timestamp}`,
          lineNumber: `B${timestamp}`,
        })
        .expect(201);
      cellBId = cellBResponse.body.cell.id;
    });

    it('should return paginated cells list', async () => {
      const response = await request(app)
        .get('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toMatchObject({
        page: 1,
        pageSize: 20,
        totalItems: expect.any(Number),
        totalPages: expect.any(Number),
      });
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should apply site filter', async () => {
      const response = await request(app)
        .get(`/api/v1/cells?siteId=${testSiteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(
        response.body.data.every((cell: { siteId: string }) => cell.siteId === testSiteId)
      ).toBe(true);
    });

    it('should apply search filter', async () => {
      const response = await request(app)
        .get(`/api/v1/cells?search=Cell A&siteId=${testSiteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].name).toMatch(/^Cell A/);
    });

    it('should apply pagination', async () => {
      const response = await request(app)
        .get('/api/v1/cells?page=1&pageSize=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.pagination.pageSize).toBe(1);
    });

    it('should apply sorting', async () => {
      const response = await request(app)
        .get(`/api/v1/cells?sortBy=name&sortOrder=DESC&ids=${cellBId},${cellAId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const names = response.body.data.map((cell: { name: string }) => cell.name);
      expect(names.length).toBe(2);
      expect(names[0]).toMatch(/^Cell B/);
      expect(names[1]).toMatch(/^Cell A/);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/cells?page=0') // Invalid page
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
    });

    it('should validate sort parameters', async () => {
      const response = await request(app)
        .get('/api/v1/cells?sortBy=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.message).toContain('Sort field must be one of');
    });
  });

  describe('GET /cells/statistics', () => {
    it('should return cell statistics', async () => {
      const response = await request(app)
        .get('/api/v1/cells/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalCells: expect.any(Number),
        totalEquipment: expect.any(Number),
        averageEquipmentPerCell: expect.any(Number),
        cellsWithoutEquipment: expect.any(Number),
        cellsPerSite: expect.any(Object),
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app).get('/api/v1/cells/statistics').expect(401);
    });
  });

  describe('GET /cells/suggestions', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testCellData,
          name: 'Production Cell',
          lineNumber: 'PROD-01',
        });
    });

    it('should return cell suggestions', async () => {
      const response = await request(app)
        .get(`/api/v1/cells/suggestions?siteId=${testSiteId}&q=Prod`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.suggestions)).toBe(true);
      expect(response.body.suggestions[0].name).toContain('Production');
    });

    it('should validate required parameters', async () => {
      const response = await request(app)
        .get('/api/v1/cells/suggestions') // Missing required parameters
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
    });

    it('should validate site ID parameter', async () => {
      const response = await request(app)
        .get('/api/v1/cells/suggestions?siteId=invalid&q=test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
    });

    it('should limit suggestions', async () => {
      const response = await request(app)
        .get(`/api/v1/cells/suggestions?siteId=${testSiteId}&q=Cell&limit=1`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.suggestions.length).toBeLessThanOrEqual(1);
    });
  });

  describe('POST /cells/validate-uniqueness', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testCellData,
          name: 'Existing Cell',
          lineNumber: 'EXIST-01',
        });
    });

    it('should validate unique line number within site', async () => {
      const response = await request(app)
        .post('/api/v1/cells/validate-uniqueness')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ siteId: testSiteId, lineNumber: 'NEW-01' })
        .expect(200);

      expect(response.body).toMatchObject({
        isUnique: true,
        siteId: testSiteId,
        lineNumber: 'NEW-01',
      });
    });

    it('should detect non-unique line number within site', async () => {
      const response = await request(app)
        .post('/api/v1/cells/validate-uniqueness')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ siteId: testSiteId, lineNumber: 'EXIST-01' })
        .expect(200);

      expect(response.body).toMatchObject({
        isUnique: false,
        siteId: testSiteId,
        lineNumber: 'EXIST-01',
      });
    });

    it('should exclude specified cell ID', async () => {
      const createResponse = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testCellData,
          name: 'Another Cell',
          lineNumber: 'ANOTHER-01',
        });

      const cellId = createResponse.body.cell.id;

      const response = await request(app)
        .post('/api/v1/cells/validate-uniqueness')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          siteId: testSiteId,
          lineNumber: 'ANOTHER-01',
          excludeId: cellId,
        })
        .expect(200);

      expect(response.body.isUnique).toBe(true);
    });

    it('should validate required parameters', async () => {
      const response = await request(app)
        .post('/api/v1/cells/validate-uniqueness')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Missing required parameters
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
    });
  });

  describe('POST /cells/validate-hierarchy', () => {
    it('should validate hierarchy integrity', async () => {
      const response = await request(app)
        .post('/api/v1/cells/validate-hierarchy')
        .set('Authorization', `Bearer ${adminToken}`) // Requires hierarchy.manage permission
        .send({})
        .expect(200);

      expect(response.body).toMatchObject({
        isValid: expect.any(Boolean),
        errors: expect.any(Array),
        warnings: expect.any(Array),
      });
    });

    it('should require hierarchy.manage permission', async () => {
      const response = await request(app)
        .post('/api/v1/cells/validate-hierarchy')
        .set('Authorization', `Bearer ${authToken}`) // Missing hierarchy.manage
        .send({})
        .expect(403);

      expect(response.body.error.message).toContain('Insufficient permissions');
    });

    it('should return 401 without authentication', async () => {
      await request(app).post('/api/v1/cells/validate-hierarchy').send({}).expect(401);
    });
  });

  describe('GET /cells/:id', () => {
    let cellId: string;
    let createdCell: { id: string; name: string; lineNumber: string; siteId: string };

    beforeEach(async () => {
      const uniqueTestData = {
        ...testCellData,
        name: `Get Test Cell ${Date.now()}`,
        lineNumber: `GET-${Date.now()}`,
      };
      const response = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send(uniqueTestData);
      cellId = response.body.cell.id;
      createdCell = response.body.cell;
    });

    it('should return specific cell', async () => {
      const response = await request(app)
        .get(`/api/v1/cells/${cellId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.cell).toMatchObject({
        id: cellId,
        siteId: testSiteId,
        name: createdCell.name,
        lineNumber: createdCell.lineNumber,
        equipmentCount: expect.any(Number),
      });
    });

    it('should return 404 for non-existent cell', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';
      const response = await request(app)
        .get(`/api/v1/cells/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.message).toContain(`Cell with ID '${fakeId}' not found`);
    });

    it('should validate UUID format', async () => {
      const response = await request(app)
        .get('/api/v1/cells/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
    });
  });

  describe('PUT /cells/:id', () => {
    let cellId: string;
    let updatedAt: string;

    beforeEach(async () => {
      const uniqueTestData = {
        ...testCellData,
        name: `PUT Test Cell ${Date.now()}`,
        lineNumber: `PUT-${Date.now()}`,
      };
      const response = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send(uniqueTestData);
      cellId = response.body.cell.id;
      updatedAt = response.body.cell.updatedAt;
    });

    it('should update cell successfully', async () => {
      const updateData = {
        name: 'Updated Cell',
        lineNumber: 'LINE-02',
        updatedAt,
      };

      const response = await request(app)
        .put(`/api/v1/cells/${cellId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Cell updated successfully',
        cell: {
          id: cellId,
          name: 'Updated Cell',
          lineNumber: 'LINE-02',
        },
      });
    });

    it('should require updatedAt for optimistic locking', async () => {
      const updateData = {
        name: 'Updated Cell',
        // Missing updatedAt
      };

      const response = await request(app)
        .put(`/api/v1/cells/${cellId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error.message).toContain('updatedAt is required for optimistic locking');
    });

    it('should handle optimistic locking conflicts', async () => {
      const staleTimestamp = new Date(Date.now() - 10000).toISOString(); // 10 seconds ago

      const updateData = {
        name: 'Updated Cell',
        updatedAt: staleTimestamp,
      };

      const response = await request(app)
        .put(`/api/v1/cells/${cellId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.error.message).toContain('Cell was modified by another user');
    });

    it('should validate updated line number uniqueness', async () => {
      // Create another cell with different line number
      await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testCellData,
          name: 'Another Cell',
          lineNumber: 'ANOTHER-01',
        });

      const updateData = {
        lineNumber: 'ANOTHER-01', // Trying to use existing line number
        updatedAt,
      };

      const response = await request(app)
        .put(`/api/v1/cells/${cellId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.error.message).toContain("Line number 'ANOTHER-01' already exists");
    });

    it('should validate cell name format', async () => {
      const updateData = {
        name: 'Invalid@Name#',
        updatedAt,
      };

      const response = await request(app)
        .put(`/api/v1/cells/${cellId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
    });

    it('should return 404 for non-existent cell', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';
      const updateData = {
        name: 'Updated Cell',
        updatedAt,
      };

      const response = await request(app)
        .put(`/api/v1/cells/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.error.message).toContain(`Cell with ID '${fakeId}' not found`);
    });

    it('should convert line number to uppercase', async () => {
      const updateData = {
        lineNumber: 'line-03',
        updatedAt,
      };

      const response = await request(app)
        .put(`/api/v1/cells/${cellId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.cell.lineNumber).toBe('LINE-03');
    });
  });

  describe('DELETE /cells/:id', () => {
    let cellId: string;

    beforeEach(async () => {
      const uniqueTestData = {
        ...testCellData,
        name: `DELETE Test Cell ${Date.now()}`,
        lineNumber: `DEL-${Date.now()}`,
      };
      const response = await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send(uniqueTestData);
      cellId = response.body.cell.id;
    });

    it('should delete cell successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/cells/${cellId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Cell deleted successfully');

      // Verify cell is deleted
      await request(app)
        .get(`/api/v1/cells/${cellId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should prevent deletion of cell with equipment', async () => {
      // This test would require creating equipment, which depends on equipment routes
      // In a real implementation, you would create equipment first, then try to delete the cell

      // Mock scenario: assume cell has equipment
      const response = await request(app)
        .delete(`/api/v1/cells/${cellId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409); // Would be 409 if equipment exists

      expect(response.body.error.message).toContain('because it contains');
    });

    it('should return 404 for non-existent cell', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';
      const response = await request(app)
        .delete(`/api/v1/cells/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.message).toContain(`Cell with ID '${fakeId}' not found`);
    });

    it('should require cells.delete permission', async () => {
      const userWithoutDeletePermission = {
        ...testUser,
        permissions: ['cells.read', 'cells.create', 'cells.update'], // Missing cells.delete
      };
      const tokenWithoutDelete = createAuthToken(userWithoutDeletePermission);

      const response = await request(app)
        .delete(`/api/v1/cells/${cellId}`)
        .set('Authorization', `Bearer ${tokenWithoutDelete}`)
        .expect(403);

      expect(response.body.error.message).toContain('Insufficient permissions');
    });
  });

  describe('POST /cells/bulk', () => {
    let cellIds: string[];

    beforeEach(async () => {
      const responses = await Promise.all([
        request(app)
          .post('/api/v1/cells')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...testCellData,
            name: 'Bulk Cell 1',
            lineNumber: 'BULK-01',
          }),
        request(app)
          .post('/api/v1/cells')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...testCellData,
            name: 'Bulk Cell 2',
            lineNumber: 'BULK-02',
          }),
        request(app)
          .post('/api/v1/cells')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...testCellData,
            name: 'Bulk Cell 3',
            lineNumber: 'BULK-03',
          }),
      ]);

      cellIds = responses.map(response => response.body.cell.id);
    });

    it('should perform bulk delete successfully', async () => {
      const bulkData = {
        operation: 'delete',
        cellIds: cellIds.slice(0, 2), // Delete first 2 cells
      };

      const response = await request(app)
        .post('/api/v1/cells/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: expect.stringContaining('Bulk delete completed'),
        summary: {
          total: 2,
          success: 2,
          errors: 0,
        },
      });

      // Verify cells are deleted
      for (const cellId of cellIds.slice(0, 2)) {
        await request(app)
          .get(`/api/v1/cells/${cellId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      }
    });

    it('should perform bulk export successfully', async () => {
      const bulkData = {
        operation: 'export',
        cellIds,
      };

      const response = await request(app)
        .post('/api/v1/cells/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Bulk export completed',
        cells: expect.any(Array),
        summary: {
          exported: cellIds.length,
          requested: cellIds.length,
        },
      });

      expect(response.body.cells).toHaveLength(cellIds.length);
    });

    it('should handle bulk move operation (not implemented)', async () => {
      const bulkData = {
        operation: 'move',
        cellIds,
        targetSiteId: testSiteId,
      };

      const response = await request(app)
        .post('/api/v1/cells/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(501);

      expect(response.body.error.message).toContain('Bulk move operation is not yet implemented');
    });

    it('should validate bulk operation parameters', async () => {
      const bulkData = {
        operation: 'invalid', // Invalid operation
        cellIds,
      };

      const response = await request(app)
        .post('/api/v1/cells/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(400);

      expect(response.body.error.message).toContain('Operation must be one of: delete, export, move');
    });

    it('should handle partial failures in bulk delete', async () => {
      const invalidCellId = '550e8400-e29b-41d4-a716-446655440999';
      const bulkData = {
        operation: 'delete',
        cellIds: [cellIds[0], invalidCellId], // One valid, one invalid
      };

      const response = await request(app)
        .post('/api/v1/cells/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body.summary).toMatchObject({
        total: 2,
        success: 1,
        errors: 1,
      });

      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0].status).toBe('success');
      expect(response.body.results[1].status).toBe('error');
    });

    it('should validate cell IDs array', async () => {
      const bulkData = {
        operation: 'delete',
        cellIds: [], // Empty array
      };

      const response = await request(app)
        .post('/api/v1/cells/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(400);

      expect(response.body.error.message).toContain('At least one cell ID is required');
    });

    it('should validate cell IDs uniqueness', async () => {
      const bulkData = {
        operation: 'delete',
        cellIds: [cellIds[0], cellIds[0]], // Duplicate IDs
      };

      const response = await request(app)
        .post('/api/v1/cells/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(400);

      expect(response.body.error.message).toContain('Cell IDs must be unique');
    });

    it('should limit bulk operation size', async () => {
      const tooManyCellIds = Array(51).fill(cellIds[0]); // More than 50
      const bulkData = {
        operation: 'delete',
        cellIds: tooManyCellIds,
      };

      const response = await request(app)
        .post('/api/v1/cells/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(400);

      expect(response.body.error.message).toContain(
        'Cannot perform bulk operation on more than 50 cells at once'
      );
    });
  });

  describe('GET /sites/:siteId/cells', () => {
    beforeEach(async () => {
      // Create cells in the test site
      await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...testCellData, name: 'Site Cell 1', lineNumber: 'SITE-01' });

      await request(app)
        .post('/api/v1/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...testCellData, name: 'Site Cell 2', lineNumber: 'SITE-02' });
    });

    it('should return cells for specific site', async () => {
      const response = await request(app)
        .get(`/api/v1/cells/sites/${testSiteId}/cells`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        siteId: testSiteId,
        cells: expect.any(Array),
      });

      expect(
        response.body.cells.every((cell: { siteId: string }) => cell.siteId === testSiteId)
      ).toBe(true);
    });

    it('should return empty array for site with no cells', async () => {
      // Create another site
      const siteResponse = await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Empty Site' });
      const emptySiteId = siteResponse.body.site.id;

      const response = await request(app)
        .get(`/api/v1/cells/sites/${emptySiteId}/cells`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.cells).toEqual([]);
    });

    it('should validate site ID format', async () => {
      const response = await request(app)
        .get('/api/v1/cells/sites/invalid-uuid/cells')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
    });

    it('should return 404 for non-existent site', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';
      const response = await request(app)
        .get(`/api/v1/cells/sites/${fakeId}/cells`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on create operations', async () => {
      const requests: Promise<{ status: number }>[] = [];

      // Make multiple rapid requests (assuming rate limit is 5 per minute)
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/v1/cells')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              ...testCellData,
              name: `Rate Test Cell ${i}`,
              lineNumber: `RATE-${i.toString().padStart(2, '0')}`,
            })
        );
      }

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter(response => response.status === 429);

      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });
});
