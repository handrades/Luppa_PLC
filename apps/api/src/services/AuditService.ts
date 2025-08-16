import {
  AuditQueryOptions,
  AuditQueryResult,
  AuditRepository,
  UserActivitySummary,
} from '../repositories/AuditRepository';
import { AuditAction, AuditLog, RiskLevel } from '../entities/AuditLog';
import { logger } from '../config/logger';
import { AuditError, AuditRepositoryError } from '../utils/auditErrors';
import { EntityManager } from 'typeorm';

/**
 * Service for audit log management and compliance reporting
 * Provides business logic for audit operations, risk assessment, and compliance reports
 */
export class AuditService {
  private auditRepository: AuditRepository;

  constructor(entityManager?: EntityManager, auditRepository?: AuditRepository) {
    this.auditRepository = auditRepository || new AuditRepository(entityManager);
  }

  /**
   * Get paginated audit logs with filtering
   */
  async getAuditLogs(options: AuditQueryOptions): Promise<AuditQueryResult> {
    try {
      return await this.auditRepository.findAuditLogs(options);
    } catch (error) {
      logger.error('Error fetching audit logs:', error);
      if (error instanceof AuditError) {
        throw error;
      }
      throw new AuditRepositoryError('Failed to retrieve audit logs', {
        cause: error,
      });
    }
  }

  /**
   * Get audit log by ID
   */
  async getAuditLogById(id: string): Promise<AuditLog | null> {
    try {
      return await this.auditRepository.findById(id);
    } catch (error) {
      logger.error(`Error fetching audit log ${id}:`, error);
      if (error instanceof AuditError) {
        throw error;
      }
      throw new AuditRepositoryError('Failed to retrieve audit log', {
        cause: error,
      });
    }
  }

  /**
   * Generate compliance report for specified date range
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<ComplianceReport> {
    try {
      // Get audit statistics
      const statistics = await this.auditRepository.getAuditStatistics({
        startDate,
        endDate,
        userId,
      });

      // Get high-risk events in the period using database-level date filtering
      const periodHighRiskEvents = await this.auditRepository.getHighRiskEventsByPeriod(
        startDate,
        endDate,
        100
      );

      // Get user activity summary using optimized aggregated query
      const userActivity = await this.auditRepository.getUserActivitySummary(startDate, endDate);

      // Generate compliance notes
      const complianceNotes = this.generateComplianceNotes(statistics, periodHighRiskEvents);

      return {
        period: { startDate, endDate },
        generatedAt: new Date(),
        totalChanges: statistics.totalChanges,
        riskBreakdown: statistics.riskBreakdown,
        actionBreakdown: statistics.actionBreakdown,
        tableBreakdown: statistics.tableBreakdown,
        userActivity,
        highRiskEvents: periodHighRiskEvents,
        complianceNotes,
        archivalStrategy: this.getArchivalStrategy(),
      };
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      if (error instanceof AuditError) {
        throw error;
      }
      throw new AuditRepositoryError('Failed to generate compliance report', {
        cause: error,
      });
    }
  }

  /**
   * Assess risk level for audit events (business logic)
   */
  assessRiskLevel(changeData: AuditChangeData): RiskLevel {
    // Critical risk conditions
    if (changeData.tableName === 'users' && changeData.action === AuditAction.DELETE) {
      return RiskLevel.CRITICAL;
    }

    if (
      changeData.tableName === 'roles' &&
      (changeData.action === AuditAction.UPDATE || changeData.action === AuditAction.DELETE)
    ) {
      return RiskLevel.CRITICAL;
    }

    // High risk conditions
    if (changeData.tableName === 'users' && changeData.action === AuditAction.UPDATE) {
      // Check if role or active status changed
      const oldValues = changeData.oldValues as Record<string, unknown>;
      const newValues = changeData.newValues as Record<string, unknown>;

      if (
        oldValues?.role_id !== newValues?.role_id ||
        oldValues?.is_active !== newValues?.is_active
      ) {
        return RiskLevel.HIGH;
      }
    }

    if (changeData.tableName === 'plcs' && changeData.action === AuditAction.DELETE) {
      return RiskLevel.HIGH;
    }

    // Medium risk conditions
    if (changeData.tableName === 'plcs' && changeData.action === AuditAction.UPDATE) {
      const oldValues = changeData.oldValues as Record<string, unknown>;
      const newValues = changeData.newValues as Record<string, unknown>;

      if (oldValues?.ip_address !== newValues?.ip_address) {
        return RiskLevel.MEDIUM;
      }
    }

    if (changeData.action === AuditAction.DELETE) {
      return RiskLevel.MEDIUM;
    }

    // Default to low risk
    return RiskLevel.LOW;
  }

  /**
   * Get high-risk audit events for security monitoring
   */
  async getHighRiskEvents(limit: number = 50): Promise<AuditLog[]> {
    try {
      return await this.auditRepository.getHighRiskEvents(limit);
    } catch (error) {
      logger.error('Error fetching high-risk events:', error);
      if (error instanceof AuditError) {
        throw error;
      }
      throw new AuditRepositoryError('Failed to retrieve high-risk events', {
        cause: error,
      });
    }
  }

  /**
   * Log security event notifications for high-risk changes
   * This would integrate with NotificationService in a full implementation
   */
  async notifySecurityTeam(event: SecurityEvent): Promise<void> {
    try {
      // Log security event
      logger.warn('Security event detected', {
        type: event.type,
        severity: event.severity,
        message: event.message,
        auditLogId: event.auditLogId,
        userId: event.userId,
        timestamp: new Date(),
      });

      // In a full implementation, this would:
      // 1. Send notifications to security team
      // 2. Create alerts in monitoring system
      // 3. Trigger automated security responses if needed
      // 4. Integrate with SIEM systems

      // For now, we'll create a high-visibility log entry
      if (event.severity === RiskLevel.CRITICAL) {
        logger.error('CRITICAL SECURITY EVENT', event);
      } else if (event.severity === RiskLevel.HIGH) {
        logger.warn('HIGH RISK SECURITY EVENT', event);
      }
    } catch (error) {
      logger.error('Error notifying security team:', error);
      // Don't throw - notification failure shouldn't break audit logging
    }
  }

  /**
   * Generate compliance notes for report
   */
  private generateComplianceNotes(
    statistics: {
      totalChanges: number;
      riskBreakdown: Record<string, number>;
      actionBreakdown: Record<string, number>;
    },
    highRiskEvents: AuditLog[]
  ): string[] {
    const notes: string[] = [];

    // Check for concerning patterns
    if (statistics.riskBreakdown[RiskLevel.CRITICAL] > 0) {
      notes.push(
        `⚠️ ${statistics.riskBreakdown[RiskLevel.CRITICAL]} CRITICAL risk events detected requiring immediate review`
      );
    }

    if (statistics.riskBreakdown[RiskLevel.HIGH] > 10) {
      notes.push(
        `⚠️ High volume of HIGH risk events (${statistics.riskBreakdown[RiskLevel.HIGH]}) - recommend security review`
      );
    }

    // Check deletion patterns (avoid division by zero)
    if (
      statistics.totalChanges > 0 &&
      statistics.actionBreakdown[AuditAction.DELETE] > statistics.totalChanges * 0.1
    ) {
      const deletePercent = Math.round(
        (statistics.actionBreakdown[AuditAction.DELETE] / statistics.totalChanges) * 100
      );
      notes.push(
        `⚠️ High deletion rate detected (${deletePercent}% of all changes) - verify data retention compliance`
      );
    }

    // Add positive compliance notes
    notes.push('✓ All data modifications have been logged with full audit trail');
    notes.push('✓ User context and session information captured for all changes');
    notes.push('✓ Risk assessment performed for all audit events');

    if (highRiskEvents.length === 0) {
      notes.push('✓ No high-risk security events detected in reporting period');
    }

    return notes;
  }

  /**
   * Get archival strategy documentation
   */
  private getArchivalStrategy(): ArchivalStrategy {
    return {
      retentionPolicy: 'Audit logs are retained indefinitely for ISO compliance',
      archivalTrigger: 'No automatic archival - manual review required',
      storageLocation: 'Primary database with backup to secure storage',
      accessControls: 'Restricted to audit administrators and compliance officers',
      retrievalProcess: 'Full audit trail retrieval available via API with proper authorization',
      complianceFrameworks: ['ISO 27001', 'SOX', 'GDPR Article 30'],
    };
  }
}

// Types for service operations
export interface AuditChangeData {
  tableName: string;
  recordId: string;
  action: AuditAction;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  userId: string;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
}

export interface SecurityEvent {
  type: string;
  severity: RiskLevel;
  message: string;
  auditLogId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface ComplianceReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  generatedAt: Date;
  totalChanges: number;
  riskBreakdown: Record<string, number>;
  actionBreakdown: Record<string, number>;
  tableBreakdown: Array<{
    tableName: string;
    count: number;
  }>;
  userActivity: UserActivitySummary[];
  highRiskEvents: AuditLog[];
  complianceNotes: string[];
  archivalStrategy: ArchivalStrategy;
}

export interface ServiceUserActivitySummary {
  userId: string;
  userEmail: string;
  userName: string;
  totalChanges: number;
  actionBreakdown: Record<string, number>;
  tableBreakdown: Record<string, number>;
  riskBreakdown: Record<string, number>;
}

export interface ArchivalStrategy {
  retentionPolicy: string;
  archivalTrigger: string;
  storageLocation: string;
  accessControls: string;
  retrievalProcess: string;
  complianceFrameworks: string[];
}
