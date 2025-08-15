/**
 * Equipment Routes Integration Tests
 *
 * Comprehensive integration tests for equipment API endpoints
 * including authentication, authorization, validation, and database operations.
 */

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
    // Initialize test database connection
    dataSource = AppDataSource;
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    // Create test app
    app = createApp();

    // Setup test data
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
    // Clean up any equipment records before each test
    await dataSource.getRepository(PLC).createQueryBuilder().delete().execute();
    await dataSource.getRepository(Equipment).createQueryBuilder().delete().execute();
  });

  const setupTestData = async () => {
    // Create test role
    const roleRepository = dataSource.getRepository(Role);
    testRole = roleRepository.create({
      name: 'Engineer',
      permissions: {
        equipment: {
          create: true,
          read: true,
          update: true,
          delete: true,
        },
      },
    });
    testRole = await roleRepository.save(testRole);

    // Create test user
    const userRepository = dataSource.getRepository(User);
    testUser = userRepository.create({
      email: 'test@equipment.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'test-password-hash',
      roleId: testRole.id,
      isActive: true,
    });
    testUser = await userRepository.save(testUser);

    // Create test site
    const siteRepository = dataSource.getRepository(Site);
    testSite = siteRepository.create({
      name: 'Test Site',
      createdBy: testUser.id,
      updatedBy: testUser.id,
    });
    testSite = await siteRepository.save(testSite);

    // Create test cell
    const cellRepository = dataSource.getRepository(Cell);
    testCell = cellRepository.create({
      siteId: testSite.id,
      name: 'Test Cell',
      lineNumber: 'LINE-001',
      createdBy: testUser.id,
      updatedBy: testUser.id,
    });
    testCell = await cellRepository.save(testCell);

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
    // Clean up in reverse order due to foreign key constraints
    const plcRepo = dataSource.getRepository(PLC);
    const equipmentRepo = dataSource.getRepository(Equipment);
    const cellRepo = dataSource.getRepository(Cell);
    const siteRepo = dataSource.getRepository(Site);
    const userRepo = dataSource.getRepository(User);
    const roleRepo = dataSource.getRepository(Role);

    // Delete all records if they exist
    await plcRepo.createQueryBuilder().delete().execute();
    await equipmentRepo.createQueryBuilder().delete().execute();
    await cellRepo.createQueryBuilder().delete().execute();
    await siteRepo.createQueryBuilder().delete().execute();
    await userRepo.createQueryBuilder().delete().execute();
    await roleRepo.createQueryBuilder().delete().execute();
  };

  const createTestEquipment = async (): Promise<{ equipment: Equipment; plc: PLC }> => {
    const equipmentRepository = dataSource.getRepository(Equipment);
    const plcRepository = dataSource.getRepository(PLC);

    const equipment = equipmentRepository.create({
      name: 'Test Press',
      equipmentType: EquipmentType.PRESS,
      cellId: testCell.id,
      createdBy: testUser.id,
      updatedBy: testUser.id,
    });
    const savedEquipment = await equipmentRepository.save(equipment);

    const plc = plcRepository.create({
      equipmentId: savedEquipment.id,
      tagId: 'PRESS_001',
      description: 'Test hydraulic press PLC',
      make: 'Allen-Bradley',
      model: 'CompactLogix 5370',
      ipAddress: '192.168.1.100',
      firmwareVersion: '33.01',
      createdBy: testUser.id,
      updatedBy: testUser.id,
    });
    const savedPLC = await plcRepository.save(plc);

    return { equipment: savedEquipment, plc: savedPLC };
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
