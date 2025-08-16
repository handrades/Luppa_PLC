/**
 * Equipment Routes Integration Tests
 *
 * Comprehensive integration tests for equipment API endpoints
 * including authentication, authorization, validation, and database operations.
 */

// Mock the database module before importing any other modules
jest.mock('../../config/database', () => {
  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      connection: {
        driver: {
          escape: jest.fn(value => `'${value}'`),
        },
      },
      getRepository: jest.fn(),
    },
  };

  const mockDataSource = {
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    isInitialized: true,
    getRepository: jest.fn(),
    createQueryRunner: jest.fn(() => mockQueryRunner),
    options: { type: 'better-sqlite3' },
  };

  return {
    AppDataSource: mockDataSource,
    createDataSource: jest.fn(() => mockDataSource),
  };
});

// Mock audit context middleware
jest.mock('../../middleware/auditContext', () => ({
  auditContextMiddleware: jest.fn((req, res, next) => {
    // Simulate audit context setup with mocked manager
    const mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        getRepository: jest.fn(),
        connection: {
          driver: {
            escape: jest.fn(value => `'${value}'`),
          },
        },
      },
    };

    req.auditQueryRunner = mockQueryRunner;
    req.auditEntityManager = mockQueryRunner.manager;
    next();
  }),
}));

// Mock rate limiter to prevent rate limiting in tests
jest.mock('../../middleware/rateLimiter', () => ({
  authRateLimit: jest.fn((req, res, next) => next()),
  strictAuthRateLimit: jest.fn((req, res, next) => next()),
}));

import request from 'supertest';
import { Express } from 'express';
import { DataSource } from 'typeorm';
import jwt from 'jsonwebtoken';
import { createApp } from '../../app';
import { AppDataSource } from '../../config/database';
import { User } from '../../entities/User';
import { Role } from '../../entities/Role';
import { Site } from '../../entities/Site';
import { Cell } from '../../entities/Cell';
import { Equipment, EquipmentType } from '../../entities/Equipment';
import { PLC } from '../../entities/PLC';
import { jwtConfig } from '../../config/jwt';

describe('Equipment Routes Integration Tests', () => {
  let app: Express;
  let dataSource: DataSource;
  let testUser: User;
  let testRole: Role;
  let testSite: Site;
  let testCell: Cell;
  let authToken: string;

  beforeAll(async () => {
    // Use the mocked AppDataSource which doesn't require actual database connection
    dataSource = AppDataSource;

    // Set up mock repositories for the entities
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        delete: jest.fn(() => ({
          execute: jest.fn().mockResolvedValue({ affected: 0 }),
        })),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getOne: jest.fn().mockResolvedValue(null),
      })),
    };

    (dataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

    // Create test app
    app = createApp();

    // Setup test data with mocked repositories
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();

    // Close database connection
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Reset repository mocks to base configuration
    const mockRepository = {
      create: jest.fn().mockImplementation(data => ({
        ...data,
        id: 'mock-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      save: jest
        .fn()
        .mockImplementation(entity => Promise.resolve({ ...entity, id: entity.id || 'mock-id' })),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => ({
        delete: jest.fn(() => ({
          execute: jest.fn().mockResolvedValue({ affected: 0 }),
        })),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getOne: jest.fn().mockResolvedValue(null),
      })),
    };

    (dataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

    // Also setup the audit EntityManager repositories with same mock
    const mockAuditRepository = {
      create: jest.fn().mockImplementation(data => ({
        ...data,
        id: 'mock-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      save: jest
        .fn()
        .mockImplementation(entity => Promise.resolve({ ...entity, id: entity.id || 'mock-id' })),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      manager: {
        transaction: jest.fn().mockImplementation(fn => fn(mockAuditRepository)),
      },
      createQueryBuilder: jest.fn(() => ({
        delete: jest.fn(() => ({
          execute: jest.fn().mockResolvedValue({ affected: 0 }),
        })),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getOne: jest.fn().mockResolvedValue(null),
        setParameter: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
      })),
    };

    // Mock the audit EntityManager's getRepository method
    const mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        getRepository: jest.fn().mockReturnValue(mockAuditRepository),
        connection: {
          driver: {
            escape: jest.fn(value => `'${value}'`),
          },
        },
      },
    };

    (dataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);
  });

  const setupTestData = async () => {
    // Create mock test entities with fixed IDs for testing
    testRole = {
      id: 'test-role-id',
      name: 'Engineer',
      permissions: {
        equipment: {
          create: true,
          read: true,
          update: true,
          delete: true,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Role;

    testUser = {
      id: 'test-user-id',
      email: 'test@equipment.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'test-password-hash',
      roleId: testRole.id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;

    testSite = {
      id: 'test-site-id',
      name: 'Test Site',
      createdBy: testUser.id,
      updatedBy: testUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Site;

    testCell = {
      id: 'test-cell-id',
      siteId: testSite.id,
      name: 'Test Cell',
      lineNumber: 'LINE-001',
      createdBy: testUser.id,
      updatedBy: testUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Cell;

    // Configure mocked repositories to return our test data
    const mockRepository = dataSource.getRepository(Role);
    (mockRepository.create as jest.Mock).mockImplementation(data => ({
      ...data,
      id: data.name === 'Engineer' ? testRole.id : 'mock-id',
    }));
    (mockRepository.save as jest.Mock).mockResolvedValue(testRole);

    // Generate auth token
    authToken = jwt.sign(
      {
        sub: testUser.id,
        email: testUser.email,
        permissions: testRole.permissions,
      },
      jwtConfig.secret,
      {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
        expiresIn: '1h',
      }
    );
  };

  const cleanupTestData = async () => {
    // For mocked tests, cleanup is automatically handled by Jest
    // No actual database cleanup needed since we're using mocks
    jest.clearAllMocks();
  };

  const createTestEquipment = async (): Promise<{ equipment: Equipment; plc: PLC }> => {
    // Create mock equipment and PLC for testing
    const equipment = {
      id: 'test-equipment-id',
      name: 'Test Press',
      equipmentType: EquipmentType.PRESS,
      cellId: testCell.id,
      createdBy: testUser.id,
      updatedBy: testUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Equipment;

    const plc = {
      id: 'test-plc-id',
      equipmentId: equipment.id,
      tagId: 'PRESS_001',
      description: 'Test hydraulic press PLC',
      make: 'Allen-Bradley',
      model: 'CompactLogix 5370',
      ipAddress: '192.168.1.100',
      firmwareVersion: '33.01',
      createdBy: testUser.id,
      updatedBy: testUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as PLC;

    // Configure mocks to return our test equipment
    const equipmentRepository = dataSource.getRepository(Equipment);
    const plcRepository = dataSource.getRepository(PLC);

    (equipmentRepository.create as jest.Mock).mockReturnValue(equipment);
    (equipmentRepository.save as jest.Mock).mockResolvedValue(equipment);
    (plcRepository.create as jest.Mock).mockReturnValue(plc);
    (plcRepository.save as jest.Mock).mockResolvedValue(plc);

    return { equipment, plc };
  };

  describe('POST /api/v1/equipment', () => {
    const validEquipmentData = {
      name: 'Test Press',
      equipmentType: EquipmentType.PRESS,
      cellId: null, // Will be set in test
      plcData: {
        tagId: 'PRESS_001',
        description: 'Test hydraulic press PLC',
        make: 'Allen-Bradley',
        model: 'CompactLogix 5370',
        ipAddress: '192.168.1.100',
        firmwareVersion: '33.01',
      },
    };

    beforeEach(() => {
      validEquipmentData.cellId = testCell.id;
    });

    it('should create equipment successfully with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/equipment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validEquipmentData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Equipment created successfully');
      expect(response.body.equipment).toMatchObject({
        name: 'Test Press',
        equipmentType: EquipmentType.PRESS,
        cellId: testCell.id,
      });
      expect(response.body.equipment.plcs).toHaveLength(1);
      expect(response.body.equipment.plcs[0]).toMatchObject({
        tagId: 'PRESS_001',
        description: 'Test hydraulic press PLC',
        make: 'Allen-Bradley',
        model: 'CompactLogix 5370',
        ipAddress: '192.168.1.100',
      });
    });

    it('should return 400 for invalid equipment data', async () => {
      const invalidData = {
        ...validEquipmentData,
        name: '', // Invalid empty name
        equipmentType: 'INVALID_TYPE',
      };

      const response = await request(app)
        .post('/api/v1/equipment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveProperty('name');
      expect(response.body.error.details).toHaveProperty('equipmentType');
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(app).post('/api/v1/equipment').send(validEquipmentData);

      expect(response.status).toBe(401);
    });

    it('should return 409 for duplicate tag ID', async () => {
      // Create first equipment
      await createTestEquipment();

      // Try to create another with same tag ID
      const response = await request(app)
        .post('/api/v1/equipment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validEquipmentData,
          name: 'Another Press',
          plcData: {
            ...validEquipmentData.plcData,
            tagId: 'PRESS_001', // Same tag ID
            ipAddress: '192.168.1.101', // Different IP
          },
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('EQUIPMENT_CONFLICT');
    });
  });

  describe('GET /api/v1/equipment', () => {
    it('should return paginated equipment list', async () => {
      // Create test equipment
      await createTestEquipment();

      const response = await request(app)
        .get('/api/v1/equipment')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        pageSize: 50,
        total: 1,
        totalPages: 1,
      });
    });

    it('should support search filtering', async () => {
      await createTestEquipment();

      const response = await request(app)
        .get('/api/v1/equipment')
        .query({ search: 'Press' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Test Press');
    });

    it('should support pagination', async () => {
      await createTestEquipment();

      const response = await request(app)
        .get('/api/v1/equipment')
        .query({ page: 1, pageSize: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination.pageSize).toBe(10);
    });
  });

  describe('GET /api/v1/equipment/:id', () => {
    it('should return equipment details', async () => {
      const { equipment } = await createTestEquipment();

      const response = await request(app)
        .get(`/api/v1/equipment/${equipment.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.equipment.id).toBe(equipment.id);
      expect(response.body.equipment.name).toBe('Test Press');
      expect(response.body.equipment.plcs).toHaveLength(1);
    });

    it('should return 404 for non-existent equipment', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app)
        .get(`/api/v1/equipment/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('EQUIPMENT_NOT_FOUND');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/v1/equipment/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/v1/equipment/:id', () => {
    it('should update equipment successfully', async () => {
      const { equipment } = await createTestEquipment();

      const updateData = {
        name: 'Updated Press',
        plcData: {
          description: 'Updated description',
          make: 'Siemens',
        },
        updatedAt: equipment.updatedAt.toISOString(),
      };

      const response = await request(app)
        .put(`/api/v1/equipment/${equipment.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Equipment updated successfully');
      expect(response.body.equipment.name).toBe('Updated Press');
      expect(response.body.equipment.plcs[0].description).toBe('Updated description');
      expect(response.body.equipment.plcs[0].make).toBe('Siemens');
    });

    it('should return 409 for optimistic locking conflict', async () => {
      const { equipment } = await createTestEquipment();

      const updateData = {
        name: 'Updated Press',
        updatedAt: new Date('2020-01-01T00:00:00.000Z').toISOString(), // Old timestamp
      };

      const response = await request(app)
        .put(`/api/v1/equipment/${equipment.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('OPTIMISTIC_LOCKING_ERROR');
    });
  });

  describe('DELETE /api/v1/equipment/:id', () => {
    it('should soft delete equipment successfully', async () => {
      const { equipment } = await createTestEquipment();

      const response = await request(app)
        .delete(`/api/v1/equipment/${equipment.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Equipment deleted successfully');

      // Verify equipment is soft deleted (should not appear in regular queries)
      const getResponse = await request(app)
        .get(`/api/v1/equipment/${equipment.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('GET /api/v1/equipment/statistics', () => {
    it('should return equipment statistics', async () => {
      await createTestEquipment();

      const response = await request(app)
        .get('/api/v1/equipment/statistics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.statistics).toMatchObject({
        totalEquipment: 1,
        equipmentByType: {
          [EquipmentType.PRESS]: 1,
        },
        equipmentWithIP: 1,
        equipmentWithoutIP: 0,
      });
    });
  });

  describe('POST /api/v1/equipment/bulk', () => {
    it('should perform bulk delete operation', async () => {
      const { equipment: equipment1 } = await createTestEquipment();

      // Create a second equipment for bulk operation
      const equipmentRepository = dataSource.getRepository(Equipment);
      const plcRepository = dataSource.getRepository(PLC);

      const equipment2 = equipmentRepository.create({
        name: 'Test Robot',
        equipmentType: EquipmentType.ROBOT,
        cellId: testCell.id,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      const savedEquipment2 = await equipmentRepository.save(equipment2);

      const plc2 = plcRepository.create({
        equipmentId: savedEquipment2.id,
        tagId: 'ROBOT_001',
        description: 'Test robot PLC',
        make: 'ABB',
        model: 'IRC5',
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await plcRepository.save(plc2);

      const response = await request(app)
        .post('/api/v1/equipment/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          equipmentIds: [equipment1.id, savedEquipment2.id],
          operation: 'delete',
        });

      if (response.status !== 200) {
        // eslint-disable-next-line no-console
        console.log('Bulk delete - Response status:', response.status);
        // eslint-disable-next-line no-console
        console.log('Bulk delete - Response body:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(200);
      expect(response.body.deletedCount).toBe(2);
      expect(response.body.message).toContain('Successfully deleted 2 equipment items');
    });

    it('should perform bulk export operation', async () => {
      const { equipment } = await createTestEquipment();

      const response = await request(app)
        .post('/api/v1/equipment/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          equipmentIds: [equipment.id],
          operation: 'export',
        });

      expect(response.status).toBe(200);
      expect(response.body.equipment).toHaveLength(1);
      expect(response.body.equipment[0].id).toBe(equipment.id);
    });
  });
});
