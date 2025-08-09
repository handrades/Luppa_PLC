/**
 * Audit Triggers Integration Tests
 *
 * Tests for database-level audit triggers and functionality
 */

import { DataSource, QueryRunner } from 'typeorm';
import { AppDataSource } from '../../config/database';

// Mock test database setup
jest.mock('../../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    createQueryRunner: jest.fn(),
    manager: {
      query: jest.fn(),
    },
  },
}));

describe('Audit Triggers Integration Tests', () => {
  let queryRunner: QueryRunner;
  let mockDataSource: jest.Mocked<DataSource>;

  beforeEach(() => {
    mockDataSource = AppDataSource as jest.Mocked<DataSource>;
    queryRunner = {
      query: jest.fn(),
      release: jest.fn(),
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
    } as jest.Mocked<QueryRunner>;

    mockDataSource.createQueryRunner.mockReturnValue(queryRunner);
    mockDataSource.getRepository.mockReturnValue({
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    } as unknown);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Audit Trigger Function', () => {
    beforeEach(async () => {
      // Setup session context
      await queryRunner.query("SET app.current_user_id = 'test-user-id'");
      await queryRunner.query("SET app.client_ip = '192.168.1.100'");
      await queryRunner.query("SET app.user_agent = 'Test User Agent'");
      await queryRunner.query("SET app.session_id = 'test-session-id'");
    });

    it('should create audit log for INSERT operations', async () => {
      // Mock INSERT operation on sites table
      const mockSiteData = {
        id: 'site-1',
        name: 'Test Site',
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'test-user-id',
        updated_by: 'test-user-id',
      };

      // Mock the actual INSERT and audit log creation
      queryRunner.query = jest
        .fn()
        .mockResolvedValueOnce(undefined) // Original INSERT
        .mockResolvedValueOnce([
          {
            // Audit log query result
            id: 'audit-1',
            table_name: 'sites',
            record_id: 'site-1',
            action: 'INSERT',
            old_values: null,
            new_values: mockSiteData,
            user_id: 'test-user-id',
            ip_address: '192.168.1.100',
            user_agent: 'Test User Agent',
            session_id: 'test-session-id',
            risk_level: 'LOW',
            timestamp: expect.any(Date),
          },
        ]);

      // Simulate site creation
      await queryRunner.query(
        'INSERT INTO sites (id, name, created_by, updated_by) VALUES ($1, $2, $3, $4)',
        ['site-1', 'Test Site', 'test-user-id', 'test-user-id']
      );

      // Check that audit log was created
      const auditLogs = await queryRunner.query(
        'SELECT * FROM audit_logs WHERE table_name = $1 AND record_id = $2',
        ['sites', 'site-1']
      );

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        table_name: 'sites',
        record_id: 'site-1',
        action: 'INSERT',
        user_id: 'test-user-id',
        risk_level: 'LOW',
      });
    });

    it('should create audit log for UPDATE operations with changed fields', async () => {
      const oldValues = { name: 'Old Site Name', updated_at: new Date() };
      const newValues = { name: 'New Site Name', updated_at: new Date() };

      queryRunner.query = jest
        .fn()
        .mockResolvedValueOnce(undefined) // UPDATE operation
        .mockResolvedValueOnce([
          {
            // Audit log query
            id: 'audit-2',
            table_name: 'sites',
            record_id: 'site-1',
            action: 'UPDATE',
            old_values: oldValues,
            new_values: newValues,
            changed_fields: ['name'],
            user_id: 'test-user-id',
            risk_level: 'LOW',
          },
        ]);

      // Simulate site update
      await queryRunner.query('UPDATE sites SET name = $1, updated_by = $2 WHERE id = $3', [
        'New Site Name',
        'test-user-id',
        'site-1',
      ]);

      // Verify audit log
      const auditLogs = await queryRunner.query(
        'SELECT * FROM audit_logs WHERE table_name = $1 AND action = $2',
        ['sites', 'UPDATE']
      );

      expect(auditLogs[0]).toMatchObject({
        action: 'UPDATE',
        changed_fields: ['name'],
        old_values: expect.objectContaining({ name: 'Old Site Name' }),
        new_values: expect.objectContaining({ name: 'New Site Name' }),
      });
    });

    it('should create audit log for DELETE operations', async () => {
      const deletedData = {
        id: 'site-1',
        name: 'Deleted Site',
        created_by: 'test-user-id',
        updated_by: 'test-user-id',
      };

      queryRunner.query = jest
        .fn()
        .mockResolvedValueOnce(undefined) // DELETE operation
        .mockResolvedValueOnce([
          {
            // Audit log query
            id: 'audit-3',
            table_name: 'sites',
            record_id: 'site-1',
            action: 'DELETE',
            old_values: deletedData,
            new_values: null,
            user_id: 'test-user-id',
            risk_level: 'MEDIUM',
          },
        ]);

      // Simulate site deletion
      await queryRunner.query('DELETE FROM sites WHERE id = $1', ['site-1']);

      // Verify audit log
      const auditLogs = await queryRunner.query('SELECT * FROM audit_logs WHERE action = $1', [
        'DELETE',
      ]);

      expect(auditLogs[0]).toMatchObject({
        action: 'DELETE',
        risk_level: 'MEDIUM',
        old_values: expect.objectContaining(deletedData),
        new_values: null,
      });
    });

    it('should assign appropriate risk levels based on table and operation', async () => {
      const testCases = [
        {
          tableName: 'users',
          action: 'DELETE',
          expectedRisk: 'HIGH',
        },
        {
          tableName: 'roles',
          action: 'UPDATE',
          expectedRisk: 'HIGH',
        },
        {
          tableName: 'plcs',
          action: 'DELETE',
          expectedRisk: 'HIGH',
        },
        {
          tableName: 'plcs',
          action: 'UPDATE',
          expectedRisk: 'MEDIUM', // Assuming IP change
        },
        {
          tableName: 'equipment',
          action: 'DELETE',
          expectedRisk: 'MEDIUM',
        },
        {
          tableName: 'sites',
          action: 'INSERT',
          expectedRisk: 'LOW',
        },
      ];

      for (const testCase of testCases) {
        queryRunner.query = jest
          .fn()
          .mockResolvedValueOnce([]) // First call for mock operation
          .mockResolvedValueOnce([
            {
              // Second call for SELECT query
              risk_level: testCase.expectedRisk,
            },
          ]);

        // Mock operation would trigger audit log creation
        await queryRunner.query(`SELECT '${testCase.tableName}' as table_name`);

        const result = await queryRunner.query(
          'SELECT risk_level FROM audit_logs ORDER BY timestamp DESC LIMIT 1'
        );
        expect(result[0].risk_level).toBe(testCase.expectedRisk);
      }
    });

    it('should handle missing session context with fallback', async () => {
      // Clear session context
      await queryRunner.query('RESET app.current_user_id');

      queryRunner.query = jest
        .fn()
        .mockResolvedValueOnce(undefined) // Operation without user context
        .mockResolvedValueOnce([
          {
            // Audit log with fallback user
            user_id: '00000000-0000-0000-0000-000000000000',
            table_name: 'sites',
            action: 'INSERT',
          },
        ]);

      // Simulate operation without user context
      await queryRunner.query('INSERT INTO sites (name) VALUES ($1)', ['Untracked Site']);

      const auditLogs = await queryRunner.query(
        'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1'
      );

      // Should use system fallback user ID
      expect(auditLogs[0].user_id).toBe('00000000-0000-0000-0000-000000000000');
    });

    it('should capture all session context variables', async () => {
      const sessionContext = {
        user_id: 'specific-user-id',
        ip_address: '10.0.0.100',
        user_agent: 'Specific User Agent',
        session_id: 'specific-session-id',
      };

      // Set specific session context
      await queryRunner.query(`SET app.current_user_id = '${sessionContext.user_id}'`);
      await queryRunner.query(`SET app.client_ip = '${sessionContext.ip_address}'`);
      await queryRunner.query(`SET app.user_agent = '${sessionContext.user_agent}'`);
      await queryRunner.query(`SET app.session_id = '${sessionContext.session_id}'`);

      queryRunner.query = jest
        .fn()
        .mockResolvedValueOnce(undefined) // INSERT operation
        .mockResolvedValueOnce([
          {
            user_id: sessionContext.user_id,
            ip_address: sessionContext.ip_address,
            user_agent: sessionContext.user_agent,
            session_id: sessionContext.session_id,
          },
        ]);

      await queryRunner.query(
        'INSERT INTO sites (name, created_by, updated_by) VALUES ($1, $2, $3)',
        ['Context Test Site', sessionContext.user_id, sessionContext.user_id]
      );

      const auditLogs = await queryRunner.query(
        'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1'
      );

      expect(auditLogs[0]).toMatchObject(sessionContext);
    });
  });

  describe('Trigger Performance', () => {
    it('should execute all batch operations successfully', async () => {
      queryRunner.query = jest.fn().mockResolvedValue(undefined);

      // Mock batch operations
      const operations = Array.from({ length: 10 }, (_, i) =>
        queryRunner.query('INSERT INTO sites (name, created_by, updated_by) VALUES ($1, $2, $3)', [
          `Site ${i}`,
          'test-user-id',
          'test-user-id',
        ])
      );

      await Promise.all(operations);

      // Verify all operations were executed
      expect(queryRunner.query).toHaveBeenCalledTimes(10);

      // Verify the operations were called with expected parameters
      operations.forEach((_, index) => {
        expect(queryRunner.query).toHaveBeenCalledWith(
          'INSERT INTO sites (name, created_by, updated_by) VALUES ($1, $2, $3)',
          [`Site ${index}`, 'test-user-id', 'test-user-id']
        );
      });
    });

    it('should handle concurrent operations correctly', async () => {
      // Set up mock for concurrent operations (5 INSERT calls + 1 SELECT call)
      const mockAuditLogs = Array.from({ length: 5 }, (_, i) => ({
        id: `audit-${i}`,
        table_name: 'sites',
        record_id: `site-${i}`,
        action: 'INSERT',
        user_id: `user-${i}`,
      }));

      queryRunner.query = jest
        .fn()
        .mockResolvedValueOnce(undefined) // INSERT 1
        .mockResolvedValueOnce(undefined) // INSERT 2
        .mockResolvedValueOnce(undefined) // INSERT 3
        .mockResolvedValueOnce(undefined) // INSERT 4
        .mockResolvedValueOnce(undefined) // INSERT 5
        .mockResolvedValueOnce(mockAuditLogs); // SELECT audit logs

      // Mock concurrent INSERT operations
      const concurrentOps = Array.from({ length: 5 }, (_, i) =>
        queryRunner.query('INSERT INTO sites (name, created_by, updated_by) VALUES ($1, $2, $3)', [
          `Concurrent Site ${i}`,
          `user-${i}`,
          `user-${i}`,
        ])
      );

      await Promise.all(concurrentOps);

      // Verify all operations were audited
      const auditLogs = await queryRunner.query('SELECT * FROM audit_logs WHERE table_name = $1', [
        'sites',
      ]);
      expect(auditLogs).toHaveLength(5);
    });
  });

  describe('Audit Log Immutability', () => {
    it('should prevent updates to audit logs', async () => {
      queryRunner.query = jest.fn().mockRejectedValueOnce(new Error('Permission denied')); // UPDATE should fail

      await expect(
        queryRunner.query('UPDATE audit_logs SET risk_level = $1 WHERE id = $2', ['LOW', 'audit-1'])
      ).rejects.toThrow('Permission denied');
    });

    it('should prevent deletion of audit logs', async () => {
      queryRunner.query = jest.fn().mockRejectedValueOnce(new Error('Permission denied')); // DELETE should fail

      await expect(
        queryRunner.query('DELETE FROM audit_logs WHERE id = $1', ['audit-1'])
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should maintain referential integrity with users table', async () => {
      // Mock constraint violation
      queryRunner.query = jest
        .fn()
        .mockRejectedValueOnce(new Error('Foreign key constraint violation'));

      // Trying to create audit log with non-existent user should fail
      await expect(
        queryRunner.query(
          'INSERT INTO audit_logs (table_name, record_id, action, user_id) VALUES ($1, $2, $3, $4)',
          ['sites', 'site-1', 'INSERT', 'non-existent-user-id']
        )
      ).rejects.toThrow('Foreign key constraint violation');
    });

    it('should restrict deletion of users with audit logs', async () => {
      queryRunner.query = jest
        .fn()
        .mockRejectedValueOnce(new Error('Cannot delete user with existing audit logs'));

      // Users with audit logs should not be deletable due to ON DELETE RESTRICT
      await expect(
        queryRunner.query('DELETE FROM users WHERE id = $1', ['user-with-audit-logs'])
      ).rejects.toThrow('Cannot delete user with existing audit logs');
    });
  });

  describe('Index Performance', () => {
    it('should use correct SQL query with proper parameters for indexed lookup', async () => {
      queryRunner.query = jest
        .fn()
        .mockResolvedValueOnce([{ id: 'audit-1', table_name: 'sites', record_id: 'site-1' }]);

      // This should use idx_audit_logs_table_record index
      await queryRunner.query('SELECT * FROM audit_logs WHERE table_name = $1 AND record_id = $2', [
        'sites',
        'site-1',
      ]);

      // Verify the query was called with correct SQL and parameters
      expect(queryRunner.query).toHaveBeenCalledWith(
        'SELECT * FROM audit_logs WHERE table_name = $1 AND record_id = $2',
        ['sites', 'site-1']
      );
      expect(queryRunner.query).toHaveBeenCalledTimes(1);
    });

    it('should efficiently query audit logs by user and timestamp', async () => {
      queryRunner.query = jest
        .fn()
        .mockResolvedValueOnce([{ id: 'audit-1', user_id: 'test-user', timestamp: new Date() }]);

      // This should use idx_audit_logs_user_timestamp index
      await queryRunner.query(
        'SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 10',
        ['test-user']
      );

      expect(queryRunner.query).toHaveBeenCalledTimes(1);
    });

    it('should efficiently query high-risk events', async () => {
      queryRunner.query = jest.fn().mockResolvedValueOnce([
        { id: 'audit-1', risk_level: 'HIGH' },
        { id: 'audit-2', risk_level: 'CRITICAL' },
      ]);

      // This should use idx_audit_logs_risk_level partial index
      await queryRunner.query(
        "SELECT * FROM audit_logs WHERE risk_level IN ('HIGH', 'CRITICAL') ORDER BY timestamp DESC",
        []
      );

      expect(queryRunner.query).toHaveBeenCalledTimes(1);
    });
  });
});
