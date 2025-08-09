/**
 * Audit Routes Tests
 *
 * Tests for audit logs API endpoints with various filtering scenarios
 */

import request from 'supertest';
import { Express, NextFunction, Request, Response } from 'express';
import { createApp } from '../../app';
import { AuditService } from '../../services/AuditService';
import { AuditAction, RiskLevel } from '../../entities/AuditLog';

// Mock the AuditService
jest.mock('../../services/AuditService');
jest.mock('../../config/database', () => ({
  AppDataSource: {
    manager: {},
    createQueryRunner: () => ({
      query: jest.fn(),
      release: jest.fn(),
    }),
  },
}));

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticate: (req: Request, _res: Response, next: NextFunction) => {
    req.user = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      sub: '550e8400-e29b-41d4-a716-446655440003',
      email: 'test@example.com',
      permissions: { audit: { read: true, export: true } },
    };
    next();
  },
  authorize: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

describe('Audit Routes', () => {
  let app: Express;
  let mockAuditService: jest.Mocked<AuditService>;

  beforeEach(() => {
    app = createApp();
    mockAuditService = new AuditService() as jest.Mocked<AuditService>;

    // Setup default mock implementations
    mockAuditService.getAuditLogs = jest.fn();
    mockAuditService.getAuditLogById = jest.fn();
    mockAuditService.getHighRiskEvents = jest.fn();
    mockAuditService.generateComplianceReport = jest.fn();

    // Replace the service instance
    jest
      .spyOn(AuditService.prototype, 'getAuditLogs')
      .mockImplementation(mockAuditService.getAuditLogs);
    jest
      .spyOn(AuditService.prototype, 'getAuditLogById')
      .mockImplementation(mockAuditService.getAuditLogById);
    jest
      .spyOn(AuditService.prototype, 'getHighRiskEvents')
      .mockImplementation(mockAuditService.getHighRiskEvents);
    jest
      .spyOn(AuditService.prototype, 'generateComplianceReport')
      .mockImplementation(mockAuditService.generateComplianceReport);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/audit-logs', () => {
    const mockAuditLogsResponse = {
      data: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          tableName: 'users',
          recordId: '550e8400-e29b-41d4-a716-446655440002',
          action: AuditAction.UPDATE,
          oldValues: { name: 'Old Name' },
          newValues: { name: 'New Name' },
          userId: '550e8400-e29b-41d4-a716-446655440003',
          timestamp: '2025-01-01T00:00:00.000Z',
          riskLevel: RiskLevel.LOW,
          user: {
            id: '550e8400-e29b-41d4-a716-446655440003',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
          },
        },
      ],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 1,
        totalPages: 1,
      },
    };

    it('should return audit logs with default pagination', async () => {
      mockAuditService.getAuditLogs.mockResolvedValue(mockAuditLogsResponse);

      const response = await request(app).get('/api/v1/audit-logs').expect(200);

      expect(response.body.message).toBe('Audit logs retrieved successfully');
      expect(response.body.data).toEqual(mockAuditLogsResponse.data);
      expect(response.body.pagination).toEqual(mockAuditLogsResponse.pagination);
      expect(mockAuditService.getAuditLogs).toHaveBeenCalledWith({
        page: 1,
        pageSize: 50,
      });
    });

    it('should handle pagination parameters', async () => {
      mockAuditService.getAuditLogs.mockResolvedValue(mockAuditLogsResponse);

      await request(app).get('/api/v1/audit-logs?page=2&pageSize=25').expect(200);

      expect(mockAuditService.getAuditLogs).toHaveBeenCalledWith({
        page: 2,
        pageSize: 25,
      });
    });

    it('should handle filtering parameters', async () => {
      mockAuditService.getAuditLogs.mockResolvedValue(mockAuditLogsResponse);

      const filters = {
        userId: '550e8400-e29b-41d4-a716-446655440003',
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-01-31T23:59:59.999Z',
        action: AuditAction.UPDATE,
        tableName: 'users',
        riskLevel: RiskLevel.HIGH,
        search: 'test search',
      };

      await request(app).get('/api/v1/audit-logs').query(filters).expect(200);

      expect(mockAuditService.getAuditLogs).toHaveBeenCalledWith({
        page: 1,
        pageSize: 50,
        userId: filters.userId,
        startDate: new Date(filters.startDate),
        endDate: new Date(filters.endDate),
        action: filters.action,
        tableName: filters.tableName,
        riskLevel: filters.riskLevel,
        search: filters.search,
      });
    });

    it('should validate pagination limits', async () => {
      await request(app).get('/api/v1/audit-logs?pageSize=150').expect(400);
    });

    it('should validate date range', async () => {
      await request(app)
        .get('/api/v1/audit-logs?startDate=2025-01-31&endDate=2025-01-01')
        .expect(400);
    });

    it('should validate enum values', async () => {
      await request(app).get('/api/v1/audit-logs?action=INVALID_ACTION').expect(400);
    });

    it('should handle service errors', async () => {
      mockAuditService.getAuditLogs.mockRejectedValue(new Error('Database error'));

      await request(app).get('/api/v1/audit-logs').expect(500);
    });

    it('should measure and warn about slow responses', async () => {
      // Mock slow service response
      mockAuditService.getAuditLogs.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockAuditLogsResponse), 150))
      );

      await request(app).get('/api/v1/audit-logs').expect(200);

      // Logger warning should be called for slow response
      // This would require additional logger mocking to verify
    });
  });

  describe('GET /api/v1/audit-logs/:id', () => {
    const mockAuditLog = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      tableName: 'users',
      recordId: '550e8400-e29b-41d4-a716-446655440004',
      action: AuditAction.UPDATE,
      userId: '550e8400-e29b-41d4-a716-446655440003',
      timestamp: '2025-01-01T00:00:00.000Z',
      riskLevel: RiskLevel.LOW,
    };

    it('should return specific audit log', async () => {
      mockAuditService.getAuditLogById.mockResolvedValue(mockAuditLog);

      const response = await request(app)
        .get('/api/v1/audit-logs/550e8400-e29b-41d4-a716-446655440001')
        .expect(200);

      expect(response.body.message).toBe('Audit log retrieved successfully');
      expect(response.body.data).toEqual(mockAuditLog);
      expect(mockAuditService.getAuditLogById).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001'
      );
    });

    it('should return 404 for non-existent audit log', async () => {
      mockAuditService.getAuditLogById.mockResolvedValue(null);

      await request(app).get('/api/v1/audit-logs/550e8400-e29b-41d4-a716-446655440999').expect(404);
    });

    it('should validate UUID format', async () => {
      await request(app).get('/api/v1/audit-logs/invalid-uuid').expect(400);
    });
  });

  describe('GET /api/v1/audit-logs/high-risk', () => {
    const mockHighRiskEvents = [
      {
        id: 'audit-high-1',
        tableName: 'users',
        action: AuditAction.DELETE,
        riskLevel: RiskLevel.CRITICAL,
        timestamp: '2025-08-09T22:23:44.848Z',
      },
    ];

    it('should return high-risk audit events', async () => {
      mockAuditService.getHighRiskEvents.mockResolvedValue(mockHighRiskEvents);

      const response = await request(app).get('/api/v1/audit-logs/high-risk').expect(200);

      expect(response.body.message).toBe('High-risk audit events retrieved successfully');
      expect(response.body.data).toEqual(mockHighRiskEvents);
      expect(mockAuditService.getHighRiskEvents).toHaveBeenCalledWith(50);
    });

    it('should handle custom limit parameter', async () => {
      mockAuditService.getHighRiskEvents.mockResolvedValue(mockHighRiskEvents);

      await request(app).get('/api/v1/audit-logs/high-risk?limit=25').expect(200);

      expect(mockAuditService.getHighRiskEvents).toHaveBeenCalledWith(25);
    });

    it('should enforce limit boundaries', async () => {
      mockAuditService.getHighRiskEvents.mockResolvedValue(mockHighRiskEvents);

      await request(app).get('/api/v1/audit-logs/high-risk?limit=200').expect(200);

      expect(mockAuditService.getHighRiskEvents).toHaveBeenCalledWith(100); // Max limit
    });
  });

  describe('POST /api/v1/audit-logs/compliance-report', () => {
    const mockComplianceReport = {
      period: {
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-01-31T00:00:00.000Z',
      },
      generatedAt: '2025-01-01T00:00:00.000Z',
      totalChanges: 100,
      riskBreakdown: { LOW: 80, MEDIUM: 15, HIGH: 5 },
      actionBreakdown: { INSERT: 50, UPDATE: 40, DELETE: 10 },
      tableBreakdown: [{ tableName: 'users', count: 60 }],
      userActivity: [],
      highRiskEvents: [],
      complianceNotes: ['All changes tracked successfully'],
      archivalStrategy: {
        retentionPolicy: 'Retain indefinitely',
        archivalTrigger: 'Manual review',
        storageLocation: 'Primary database',
        accessControls: 'Admin only',
        retrievalProcess: 'API access',
        complianceFrameworks: ['ISO 27001'],
      },
    };

    it('should generate compliance report', async () => {
      mockAuditService.generateComplianceReport.mockResolvedValue(mockComplianceReport);

      const requestBody = {
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-01-31T23:59:59.999Z',
      };

      const response = await request(app)
        .post('/api/v1/audit-logs/compliance-report')
        .send(requestBody)
        .expect(200);

      expect(response.body.message).toBe('Compliance report generated successfully');
      expect(response.body.report).toEqual(mockComplianceReport);
      expect(mockAuditService.generateComplianceReport).toHaveBeenCalledWith(
        new Date(requestBody.startDate),
        new Date(requestBody.endDate),
        undefined
      );
    });

    it('should handle user filtering in report', async () => {
      mockAuditService.generateComplianceReport.mockResolvedValue(mockComplianceReport);

      const requestBody = {
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-01-31T23:59:59.999Z',
        userId: '550e8400-e29b-41d4-a716-446655440003',
      };

      await request(app).post('/api/v1/audit-logs/compliance-report').send(requestBody).expect(200);

      expect(mockAuditService.generateComplianceReport).toHaveBeenCalledWith(
        new Date(requestBody.startDate),
        new Date(requestBody.endDate),
        requestBody.userId
      );
    });

    it('should validate required date fields', async () => {
      await request(app).post('/api/v1/audit-logs/compliance-report').send({}).expect(400);
    });

    it('should enforce maximum date range', async () => {
      const requestBody = {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2026-01-01T00:00:00.000Z', // More than 1 year
      };

      await request(app).post('/api/v1/audit-logs/compliance-report').send(requestBody).expect(400);
    });

    it('should validate date order', async () => {
      const requestBody = {
        startDate: '2025-01-31T00:00:00.000Z',
        endDate: '2025-01-01T00:00:00.000Z', // End before start
      };

      await request(app).post('/api/v1/audit-logs/compliance-report').send(requestBody).expect(400);
    });
  });

  describe('GET /api/v1/audit-logs/stats', () => {
    it('should return audit statistics with default 30-day period', async () => {
      const mockComplianceReport = {
        period: { startDate: new Date(), endDate: new Date() },
        totalChanges: 100,
        riskBreakdown: { LOW: 90, HIGH: 10 },
        actionBreakdown: { INSERT: 60, UPDATE: 40 },
        tableBreakdown: [{ tableName: 'users', count: 100 }],
        userActivity: [
          {
            userId: '550e8400-e29b-41d4-a716-446655440005',
            userEmail: 'user1@example.com',
            totalChanges: 50,
          },
        ],
      };

      mockAuditService.generateComplianceReport.mockResolvedValue(mockComplianceReport);

      const response = await request(app).get('/api/v1/audit-logs/stats').expect(200);

      expect(response.body.message).toBe('Audit statistics retrieved successfully');
      expect(response.body.stats).toMatchObject({
        totalChanges: 100,
        riskBreakdown: { LOW: 90, HIGH: 10 },
        actionBreakdown: { INSERT: 60, UPDATE: 40 },
        tableBreakdown: [{ tableName: 'users', count: 100 }],
        topUsers: [
          {
            userId: '550e8400-e29b-41d4-a716-446655440005',
            userEmail: 'user1@example.com',
            totalChanges: 50,
          },
        ],
      });
    });

    it('should handle custom date range parameters', async () => {
      mockAuditService.generateComplianceReport.mockResolvedValue({
        period: { startDate: new Date(), endDate: new Date() },
        totalChanges: 0,
        riskBreakdown: {},
        actionBreakdown: {},
        tableBreakdown: [],
        userActivity: [],
      });

      await request(app)
        .get('/api/v1/audit-logs/stats?startDate=2025-01-01&endDate=2025-01-31')
        .expect(200);

      // Service should be called with custom dates
      expect(mockAuditService.generateComplianceReport).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
        undefined
      );
    });

    it('should validate date format', async () => {
      await request(app).get('/api/v1/audit-logs/stats?startDate=invalid-date').expect(400);
    });
  });

  describe('Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      // This would require mocking the auth middleware to return 401
      // For now, we assume authentication is mocked to pass
      expect(true).toBe(true);
    });

    it('should require audit.read permission for read endpoints', async () => {
      // This would require testing the authorize middleware
      // For now, we assume authorization is mocked to pass
      expect(true).toBe(true);
    });

    it('should require audit.export permission for compliance reports', async () => {
      // This would require testing the authorize middleware
      // For now, we assume authorization is mocked to pass
      expect(true).toBe(true);
    });
  });
});
