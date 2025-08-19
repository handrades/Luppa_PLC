/**
 * Audit Service Tests
 *
 * Tests for AuditService business logic and compliance reporting
 */

import { AuditService } from "../../services/AuditService";
import { AuditRepository } from "../../repositories/AuditRepository";
import { AuditAction, RiskLevel } from "../../entities/AuditLog";
import { logger } from "../../config/logger";

// Mock the AuditRepository
jest.mock("../../repositories/AuditRepository");

// Mock logger
jest.mock("../../config/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe("AuditService", () => {
  let auditService: AuditService;
  let mockAuditRepository: jest.Mocked<AuditRepository>;

  beforeEach(() => {
    mockAuditRepository = new AuditRepository() as jest.Mocked<AuditRepository>;

    // Mock all the methods including the new ones
    mockAuditRepository.findAuditLogs = jest.fn();
    mockAuditRepository.findById = jest.fn();
    mockAuditRepository.getAuditStatistics = jest.fn();
    mockAuditRepository.getHighRiskEvents = jest.fn();
    mockAuditRepository.getHighRiskEventsByPeriod = jest.fn();
    mockAuditRepository.getUserActivitySummary = jest.fn();
    mockAuditRepository.getRepository = jest.fn();
    mockAuditRepository.update = jest.fn();
    mockAuditRepository.delete = jest.fn();
    mockAuditRepository.remove = jest.fn();

    auditService = new AuditService();

    // Replace the repository instance
    (auditService as { auditRepository: AuditRepository }).auditRepository =
      mockAuditRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getAuditLogs", () => {
    it("should return paginated audit logs", async () => {
      const mockResponse = {
        data: [
          {
            id: "audit-1",
            tableName: "users",
            action: AuditAction.UPDATE,
            riskLevel: RiskLevel.LOW,
          },
        ],
        pagination: {
          page: 1,
          pageSize: 50,
          total: 1,
          totalPages: 1,
        },
      };

      mockAuditRepository.findAuditLogs.mockResolvedValue(mockResponse);

      const options = { page: 1, pageSize: 50 };
      const result = await auditService.getAuditLogs(options);

      expect(result).toEqual(mockResponse);
      expect(mockAuditRepository.findAuditLogs).toHaveBeenCalledWith(options);
    });

    it("should handle repository errors", async () => {
      mockAuditRepository.findAuditLogs.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(auditService.getAuditLogs({})).rejects.toThrow(
        "Failed to retrieve audit logs",
      );
    });
  });

  describe("getAuditLogById", () => {
    it("should return specific audit log", async () => {
      const mockAuditLog = {
        id: "audit-1",
        tableName: "users",
        action: AuditAction.UPDATE,
      };

      mockAuditRepository.findById.mockResolvedValue(mockAuditLog);

      const result = await auditService.getAuditLogById("audit-1");

      expect(result).toEqual(mockAuditLog);
      expect(mockAuditRepository.findById).toHaveBeenCalledWith("audit-1");
    });

    it("should return null for non-existent audit log", async () => {
      mockAuditRepository.findById.mockResolvedValue(null);

      const result = await auditService.getAuditLogById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("generateComplianceReport", () => {
    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-01-31");

    const mockStatistics = {
      totalChanges: 100,
      riskBreakdown: { LOW: 80, MEDIUM: 15, HIGH: 5 },
      actionBreakdown: { INSERT: 50, UPDATE: 40, DELETE: 10 },
      tableBreakdown: [{ tableName: "users", count: 60 }],
    };

    const mockHighRiskEvents = [
      {
        id: "audit-high-1",
        tableName: "users",
        action: AuditAction.DELETE,
        riskLevel: RiskLevel.HIGH,
        timestamp: new Date("2025-01-15"),
      },
    ];

    const mockAuditLogs = [
      {
        id: "audit-1",
        userId: "user-1",
        tableName: "users",
        action: AuditAction.UPDATE,
        riskLevel: RiskLevel.LOW,
        user: {
          id: "user-1",
          email: "user1@example.com",
          firstName: "John",
          lastName: "Doe",
        },
      },
      {
        id: "audit-2",
        userId: "user-2",
        tableName: "plcs",
        action: AuditAction.INSERT,
        riskLevel: RiskLevel.LOW,
        user: {
          id: "user-2",
          email: "user2@example.com",
          firstName: "Jane",
          lastName: "Smith",
        },
      },
    ];

    beforeEach(() => {
      const mockUserActivity = [
        {
          userId: "user-1",
          userEmail: "user1@example.com",
          userName: "John Doe",
          totalChanges: 1,
          actionBreakdown: { UPDATE: 1 },
          tableBreakdown: { users: 1 },
          riskBreakdown: { LOW: 1 },
        },
        {
          userId: "user-2",
          userEmail: "user2@example.com",
          userName: "Jane Smith",
          totalChanges: 1,
          actionBreakdown: { INSERT: 1 },
          tableBreakdown: { plcs: 1 },
          riskBreakdown: { LOW: 1 },
        },
      ];

      mockAuditRepository.getAuditStatistics.mockResolvedValue(mockStatistics);
      mockAuditRepository.getHighRiskEvents.mockResolvedValue(
        mockHighRiskEvents,
      );
      mockAuditRepository.getHighRiskEventsByPeriod.mockResolvedValue(
        mockHighRiskEvents,
      );
      mockAuditRepository.getUserActivitySummary.mockResolvedValue(
        mockUserActivity,
      );
      mockAuditRepository.findAuditLogs.mockResolvedValue({
        data: mockAuditLogs,
        pagination: { page: 1, pageSize: 1000, total: 2, totalPages: 1 },
      });
    });

    it("should generate comprehensive compliance report", async () => {
      const report = await auditService.generateComplianceReport(
        startDate,
        endDate,
      );

      expect(report).toMatchObject({
        period: { startDate, endDate },
        generatedAt: expect.any(Date),
        totalChanges: 100,
        riskBreakdown: { LOW: 80, MEDIUM: 15, HIGH: 5 },
        actionBreakdown: { INSERT: 50, UPDATE: 40, DELETE: 10 },
        tableBreakdown: [{ tableName: "users", count: 60 }],
        userActivity: expect.arrayContaining([
          expect.objectContaining({
            userId: "user-1",
            userEmail: "user1@example.com",
            userName: "John Doe",
            totalChanges: 1,
          }),
        ]),
        highRiskEvents: expect.arrayContaining([
          expect.objectContaining({
            id: "audit-high-1",
            riskLevel: RiskLevel.HIGH,
          }),
        ]),
        complianceNotes: expect.arrayContaining([
          expect.stringMatching(/All data modifications have been logged/),
        ]),
        archivalStrategy: expect.objectContaining({
          retentionPolicy: expect.stringContaining("indefinitely"),
        }),
      });

      expect(mockAuditRepository.getAuditStatistics).toHaveBeenCalledWith({
        startDate,
        endDate,
        userId: undefined,
      });
    });

    it("should handle user-specific compliance reports", async () => {
      const userId = "specific-user-id";
      await auditService.generateComplianceReport(startDate, endDate, userId);

      expect(mockAuditRepository.getAuditStatistics).toHaveBeenCalledWith({
        startDate,
        endDate,
        userId,
      });
    });

    it("should calculate user activity metrics correctly", async () => {
      const report = await auditService.generateComplianceReport(
        startDate,
        endDate,
      );

      expect(report.userActivity).toHaveLength(2);
      expect(report.userActivity[0]).toMatchObject({
        userId: expect.any(String),
        userEmail: expect.any(String),
        userName: expect.any(String),
        totalChanges: expect.any(Number),
        actionBreakdown: expect.any(Object),
        tableBreakdown: expect.any(Object),
        riskBreakdown: expect.any(Object),
      });
    });

    it("should generate appropriate compliance notes", async () => {
      const report = await auditService.generateComplianceReport(
        startDate,
        endDate,
      );

      expect(report.complianceNotes).toContain(
        "✓ All data modifications have been logged with full audit trail",
      );
      expect(report.complianceNotes).toContain(
        "✓ User context and session information captured for all changes",
      );
      expect(report.complianceNotes).toContain(
        "✓ Risk assessment performed for all audit events",
      );
    });

    it("should identify concerning patterns in compliance notes", async () => {
      const criticalStats = {
        ...mockStatistics,
        riskBreakdown: { CRITICAL: 5, HIGH: 10, MEDIUM: 15, LOW: 70 },
        actionBreakdown: { DELETE: 50, UPDATE: 40, INSERT: 10 }, // High deletion rate
      };

      mockAuditRepository.getAuditStatistics.mockResolvedValue(criticalStats);
      mockAuditRepository.getHighRiskEventsByPeriod.mockResolvedValue(
        mockHighRiskEvents,
      );

      const report = await auditService.generateComplianceReport(
        startDate,
        endDate,
      );

      expect(
        report.complianceNotes.some((note) =>
          /5 CRITICAL risk events detected/.test(note),
        ),
      ).toBe(true);
      expect(
        report.complianceNotes.some((note) =>
          /High deletion rate detected/.test(note),
        ),
      ).toBe(true);
    });

    it("should handle errors in compliance report generation", async () => {
      mockAuditRepository.getAuditStatistics.mockRejectedValue(
        new Error("Statistics error"),
      );

      await expect(
        auditService.generateComplianceReport(startDate, endDate),
      ).rejects.toThrow("Failed to generate compliance report");
    });
  });

  describe("assessRiskLevel", () => {
    it("should assign CRITICAL risk for user deletion", () => {
      const changeData = {
        tableName: "users",
        recordId: "user-1",
        action: AuditAction.DELETE,
        oldValues: null,
        newValues: null,
        userId: "admin-user",
        ipAddress: "192.168.1.1",
        userAgent: "Test Agent",
        sessionId: "test-session",
      };

      const risk = auditService.assessRiskLevel(changeData);
      expect(risk).toBe(RiskLevel.CRITICAL);
    });

    it("should assign CRITICAL risk for role modifications", () => {
      const changeData = {
        tableName: "roles",
        recordId: "role-1",
        action: AuditAction.UPDATE,
        oldValues: { permissions: {} },
        newValues: { permissions: { admin: true } },
        userId: "admin-user",
        ipAddress: "192.168.1.1",
        userAgent: "Test Agent",
        sessionId: "test-session",
      };

      const risk = auditService.assessRiskLevel(changeData);
      expect(risk).toBe(RiskLevel.CRITICAL);
    });

    it("should assign HIGH risk for user role changes", () => {
      const changeData = {
        tableName: "users",
        recordId: "user-1",
        action: AuditAction.UPDATE,
        oldValues: { role_id: "viewer-role" },
        newValues: { role_id: "admin-role" },
        userId: "admin-user",
        ipAddress: "192.168.1.1",
        userAgent: "Test Agent",
        sessionId: "test-session",
      };

      const risk = auditService.assessRiskLevel(changeData);
      expect(risk).toBe(RiskLevel.HIGH);
    });

    it("should assign HIGH risk for PLC deletion", () => {
      const changeData = {
        tableName: "plcs",
        recordId: "plc-1",
        action: AuditAction.DELETE,
        oldValues: null,
        newValues: null,
        userId: "engineer-user",
        ipAddress: "192.168.1.1",
        userAgent: "Test Agent",
        sessionId: "test-session",
      };

      const risk = auditService.assessRiskLevel(changeData);
      expect(risk).toBe(RiskLevel.HIGH);
    });

    it("should assign MEDIUM risk for PLC IP address changes", () => {
      const changeData = {
        tableName: "plcs",
        recordId: "plc-1",
        action: AuditAction.UPDATE,
        oldValues: { ip_address: "192.168.1.100" },
        newValues: { ip_address: "192.168.1.200" },
        userId: "engineer-user",
        ipAddress: "192.168.1.1",
        userAgent: "Test Agent",
        sessionId: "test-session",
      };

      const risk = auditService.assessRiskLevel(changeData);
      expect(risk).toBe(RiskLevel.MEDIUM);
    });

    it("should assign MEDIUM risk for general deletions", () => {
      const changeData = {
        tableName: "equipment",
        recordId: "equipment-1",
        action: AuditAction.DELETE,
        oldValues: null,
        newValues: null,
        userId: "engineer-user",
        ipAddress: "192.168.1.1",
        userAgent: "Test Agent",
        sessionId: "test-session",
      };

      const risk = auditService.assessRiskLevel(changeData);
      expect(risk).toBe(RiskLevel.MEDIUM);
    });

    it("should assign LOW risk for routine operations", () => {
      const changeData = {
        tableName: "equipment",
        recordId: "equipment-1",
        action: AuditAction.UPDATE,
        oldValues: { name: "Old Name" },
        newValues: { name: "New Name" },
        userId: "engineer-user",
        ipAddress: "192.168.1.1",
        userAgent: "Test Agent",
        sessionId: "test-session",
      };

      const risk = auditService.assessRiskLevel(changeData);
      expect(risk).toBe(RiskLevel.LOW);
    });
  });

  describe("getHighRiskEvents", () => {
    it("should return high-risk audit events", async () => {
      const mockEvents = [
        {
          id: "audit-high-1",
          riskLevel: RiskLevel.HIGH,
          action: AuditAction.DELETE,
        },
      ];

      mockAuditRepository.getHighRiskEvents.mockResolvedValue(mockEvents);

      const result = await auditService.getHighRiskEvents(50);

      expect(result).toEqual(mockEvents);
      expect(mockAuditRepository.getHighRiskEvents).toHaveBeenCalledWith(50);
    });

    it("should handle repository errors", async () => {
      mockAuditRepository.getHighRiskEvents.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(auditService.getHighRiskEvents()).rejects.toThrow(
        "Failed to retrieve high-risk events",
      );
    });
  });

  describe("notifySecurityTeam", () => {
    const mockSecurityEvent = {
      type: "USER_DELETION",
      severity: RiskLevel.CRITICAL,
      message: "User account deleted",
      auditLogId: "audit-1",
      userId: "admin-user",
    };

    it("should log security events without throwing", async () => {
      await expect(
        auditService.notifySecurityTeam(mockSecurityEvent),
      ).resolves.not.toThrow();
    });

    it("should handle notification errors gracefully", async () => {
      // Mock logger to throw error
      // Logger is imported at the top
      logger.warn.mockImplementation(() => {
        throw new Error("Logging failed");
      });

      // Should not throw even if logging fails
      await expect(
        auditService.notifySecurityTeam(mockSecurityEvent),
      ).resolves.not.toThrow();
    });

    it("should log CRITICAL events with error level", async () => {
      // Reset the mocks to ensure clean state
      jest.clearAllMocks();

      // Reset the logger mock implementations
      // Logger is imported at the top
      logger.warn.mockImplementation(jest.fn());
      logger.error.mockImplementation(jest.fn());

      const criticalEvent = {
        ...mockSecurityEvent,
        severity: RiskLevel.CRITICAL,
      };

      await auditService.notifySecurityTeam(criticalEvent);

      // Should log the general security event first
      expect(logger.warn).toHaveBeenCalledWith(
        "Security event detected",
        expect.objectContaining({
          type: criticalEvent.type,
          severity: criticalEvent.severity,
          message: criticalEvent.message,
          auditLogId: criticalEvent.auditLogId,
          userId: criticalEvent.userId,
          timestamp: expect.any(Date),
        }),
      );
      // Then log the specific critical event
      expect(logger.error).toHaveBeenCalledWith(
        "CRITICAL SECURITY EVENT",
        criticalEvent,
      );
    });

    it("should log HIGH risk events with warn level", async () => {
      // Reset the mocks to ensure clean state
      jest.clearAllMocks();

      // Reset the logger mock implementations
      // Logger is imported at the top
      logger.warn.mockImplementation(jest.fn());
      logger.error.mockImplementation(jest.fn());

      const highRiskEvent = { ...mockSecurityEvent, severity: RiskLevel.HIGH };

      await auditService.notifySecurityTeam(highRiskEvent);

      // Should log the general security event first
      expect(logger.warn).toHaveBeenCalledWith(
        "Security event detected",
        expect.objectContaining({
          type: highRiskEvent.type,
          severity: highRiskEvent.severity,
          message: highRiskEvent.message,
          auditLogId: highRiskEvent.auditLogId,
          userId: highRiskEvent.userId,
          timestamp: expect.any(Date),
        }),
      );
      // Then log the specific high risk event
      expect(logger.warn).toHaveBeenCalledWith(
        "HIGH RISK SECURITY EVENT",
        highRiskEvent,
      );

      // Should have been called twice total
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });
  });
});
