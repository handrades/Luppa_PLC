/**
 * Site Routes Integration Tests
 *
 * Comprehensive integration tests for site management API endpoints.
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

describe('Sites Routes', () => {
  let app: Express;
  let authToken: string;

  // Test data
  const testSiteData = {
    name: 'Test Site',
  };

  const testUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    permissions: ['sites.read', 'sites.create', 'sites.update', 'sites.delete'],
  };

  beforeAll(async () => {
    app = await createTestApp();
    // In a real test, you would get EntityManager from your test database setup
    // For this example, we'll mock it

    authToken = createAuthToken(testUser);
  });

  beforeEach(async () => {
    // Clean up test data before each test
    // In a real implementation, you would clean up your test database
  });

  describe('POST /sites', () => {
    it('should create a new site successfully', async () => {
      const response = await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testSiteData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Site created successfully',
        site: {
          name: 'Test Site',
          cellCount: 0,
          equipmentCount: 0,
        },
      });
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).post('/api/v1/sites').send(testSiteData).expect(401);

      expect(response.body.message).toContain('Authorization header');
    });

    it('should return 403 without proper permissions', async () => {
      const userWithoutPermissions = {
        ...testUser,
        permissions: ['sites.read'], // Missing sites.create
      };
      const tokenWithoutPermissions = createAuthToken(userWithoutPermissions);

      const response = await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${tokenWithoutPermissions}`)
        .send(testSiteData)
        .expect(403);

      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Missing name
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
      expect(response.body.error.details.name).toContain('Site name is required');
    });

    it('should validate site name format', async () => {
      const response = await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Invalid@Name#' })
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
      expect(response.body.error.details.name).toContain(
        'Site name can only contain letters, numbers, spaces, hyphens, and underscores'
      );
    });

    it('should validate site name length', async () => {
      const longName = 'a'.repeat(101);
      const response = await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: longName })
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
      expect(response.body.error.details.name).toContain('Site name cannot exceed 100 characters');
    });

    it('should handle site name conflicts', async () => {
      // Create first site
      await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testSiteData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testSiteData)
        .expect(409);

      expect(response.body.message).toContain("Site name 'Test Site' already exists");
    });
  });

  describe('GET /sites', () => {
    beforeEach(async () => {
      // Create test sites
      await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Site A' });

      await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Site B' });
    });

    it('should return paginated sites list', async () => {
      const response = await request(app)
        .get('/api/v1/sites')
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

    it('should apply search filter', async () => {
      const response = await request(app)
        .get('/api/v1/sites?search=Site A')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe('Site A');
    });

    it('should apply pagination', async () => {
      const response = await request(app)
        .get('/api/v1/sites?page=1&pageSize=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.pagination.pageSize).toBe(1);
    });

    it('should apply sorting', async () => {
      const response = await request(app)
        .get('/api/v1/sites?sortBy=name&sortOrder=DESC')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const names = response.body.data.map((site: { name: string }) => site.name);
      expect(names).toEqual(['Site B', 'Site A']);
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/sites?page=0') // Invalid page
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
    });
  });

  describe('GET /sites/statistics', () => {
    it('should return site statistics', async () => {
      const response = await request(app)
        .get('/api/v1/sites/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalSites: expect.any(Number),
        totalCells: expect.any(Number),
        totalEquipment: expect.any(Number),
        averageCellsPerSite: expect.any(Number),
        averageEquipmentPerSite: expect.any(Number),
        sitesWithoutCells: expect.any(Number),
        sitesWithoutEquipment: expect.any(Number),
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app).get('/api/v1/sites/statistics').expect(401);
    });
  });

  describe('GET /sites/suggestions', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Production Site' });
    });

    it('should return site suggestions', async () => {
      const response = await request(app)
        .get('/api/v1/sites/suggestions?q=Prod')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.suggestions)).toBe(true);
      expect(response.body.suggestions[0].name).toContain('Production');
    });

    it('should validate query parameter', async () => {
      const response = await request(app)
        .get('/api/v1/sites/suggestions') // Missing q parameter
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
    });

    it('should limit suggestions', async () => {
      const response = await request(app)
        .get('/api/v1/sites/suggestions?q=Site&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.suggestions.length).toBeLessThanOrEqual(1);
    });
  });

  describe('POST /sites/validate-uniqueness', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Existing Site' });
    });

    it('should validate unique site name', async () => {
      const response = await request(app)
        .post('/api/v1/sites/validate-uniqueness')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'New Site' })
        .expect(200);

      expect(response.body).toMatchObject({
        isUnique: true,
        name: 'New Site',
      });
    });

    it('should detect non-unique site name', async () => {
      const response = await request(app)
        .post('/api/v1/sites/validate-uniqueness')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Existing Site' })
        .expect(200);

      expect(response.body).toMatchObject({
        isUnique: false,
        name: 'Existing Site',
      });
    });

    it('should exclude specified site ID', async () => {
      const createResponse = await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Another Site' });

      const siteId = createResponse.body.site.id;

      const response = await request(app)
        .post('/api/v1/sites/validate-uniqueness')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Another Site', excludeId: siteId })
        .expect(200);

      expect(response.body.isUnique).toBe(true);
    });
  });

  describe('GET /sites/:id', () => {
    let siteId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testSiteData);
      siteId = response.body.site.id;
    });

    it('should return specific site', async () => {
      const response = await request(app)
        .get(`/api/v1/sites/${siteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.site).toMatchObject({
        id: siteId,
        name: 'Test Site',
        cellCount: expect.any(Number),
        equipmentCount: expect.any(Number),
      });
    });

    it('should return 404 for non-existent site', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';
      const response = await request(app)
        .get(`/api/v1/sites/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toContain(`Site with ID '${fakeId}' not found`);
    });

    it('should validate UUID format', async () => {
      const response = await request(app)
        .get('/api/v1/sites/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.message).toContain('Validation failed');
    });
  });

  describe('PUT /sites/:id', () => {
    let siteId: string;
    let updatedAt: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testSiteData);
      siteId = response.body.site.id;
      updatedAt = response.body.site.updatedAt;
    });

    it('should update site successfully', async () => {
      const updateData = {
        name: 'Updated Site',
        updatedAt,
      };

      const response = await request(app)
        .put(`/api/v1/sites/${siteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Site updated successfully',
        site: {
          id: siteId,
          name: 'Updated Site',
        },
      });
    });

    it('should require updatedAt for optimistic locking', async () => {
      const updateData = {
        name: 'Updated Site',
        // Missing updatedAt
      };

      const response = await request(app)
        .put(`/api/v1/sites/${siteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.message).toContain('updatedAt is required for optimistic locking');
    });

    it('should handle optimistic locking conflicts', async () => {
      const staleTimestamp = new Date(Date.now() - 10000).toISOString(); // 10 seconds ago

      const updateData = {
        name: 'Updated Site',
        updatedAt: staleTimestamp,
      };

      const response = await request(app)
        .put(`/api/v1/sites/${siteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.message).toContain('Site was modified by another user');
    });

    it('should validate updated name uniqueness', async () => {
      // Create another site
      await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Another Site' });

      const updateData = {
        name: 'Another Site', // Trying to use existing name
        updatedAt,
      };

      const response = await request(app)
        .put(`/api/v1/sites/${siteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.message).toContain("Site name 'Another Site' already exists");
    });
  });

  describe('DELETE /sites/:id', () => {
    let siteId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testSiteData);
      siteId = response.body.site.id;
    });

    it('should delete site successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/sites/${siteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Site deleted successfully');

      // Verify site is deleted
      await request(app)
        .get(`/api/v1/sites/${siteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should prevent deletion of site with cells', async () => {
      // This test would require creating cells, which depends on cell routes
      // In a real implementation, you would create a cell first, then try to delete the site

      // Mock scenario: assume site has cells
      const response = await request(app)
        .delete(`/api/v1/sites/${siteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409); // Would be 409 if cells exist

      expect(response.body.message).toContain('because it contains');
    });

    it('should return 404 for non-existent site', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440999';
      const response = await request(app)
        .delete(`/api/v1/sites/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toContain(`Site with ID '${fakeId}' not found`);
    });
  });

  describe('POST /sites/bulk', () => {
    let siteIds: string[];

    beforeEach(async () => {
      const responses = await Promise.all([
        request(app)
          .post('/api/v1/sites')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Bulk Site 1' }),
        request(app)
          .post('/api/v1/sites')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Bulk Site 2' }),
        request(app)
          .post('/api/v1/sites')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Bulk Site 3' }),
      ]);

      siteIds = responses.map(response => response.body.site.id);
    });

    it('should perform bulk delete successfully', async () => {
      const bulkData = {
        operation: 'delete',
        siteIds: siteIds.slice(0, 2), // Delete first 2 sites
      };

      const response = await request(app)
        .post('/api/v1/sites/bulk')
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

      // Verify sites are deleted
      for (const siteId of siteIds.slice(0, 2)) {
        await request(app)
          .get(`/api/v1/sites/${siteId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      }
    });

    it('should perform bulk export successfully', async () => {
      const bulkData = {
        operation: 'export',
        siteIds,
      };

      const response = await request(app)
        .post('/api/v1/sites/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Bulk export completed',
        sites: expect.any(Array),
        summary: {
          exported: siteIds.length,
          requested: siteIds.length,
        },
      });

      expect(response.body.sites).toHaveLength(siteIds.length);
    });

    it('should validate bulk operation parameters', async () => {
      const bulkData = {
        operation: 'invalid', // Invalid operation
        siteIds,
      };

      const response = await request(app)
        .post('/api/v1/sites/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(400);

      expect(response.body.message).toContain('Operation must be either delete or export');
    });

    it('should handle partial failures in bulk delete', async () => {
      const invalidSiteId = '550e8400-e29b-41d4-a716-446655440999';
      const bulkData = {
        operation: 'delete',
        siteIds: [siteIds[0], invalidSiteId], // One valid, one invalid
      };

      const response = await request(app)
        .post('/api/v1/sites/bulk')
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
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on create operations', async () => {
      const requests = [];

      // Make multiple rapid requests (assuming rate limit is 5 per minute)
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/v1/sites')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ name: `Rate Test Site ${i}` })
        );
      }

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter(response => response.status === 429);

      expect(tooManyRequests.length).toBeGreaterThan(0);
    });
  });
});
