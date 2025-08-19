import { DataSource } from "typeorm";
import {
  AuditAction,
  AuditLog,
  Cell,
  Equipment,
  EquipmentType,
  Notification,
  PLC,
  RiskLevel,
  Site,
  Tag,
  TagDataType,
  User,
} from "../../entities";
import {
  cleanTestData,
  setupTestDatabase,
  teardownTestDatabase,
} from "./test-db-setup";

describe("Database Entities Validation", () => {
  let dataSource: DataSource;
  let testUser: User;

  // Skip all tests if PostgreSQL is not available
  const shouldSkipTests = () => !dataSource?.isInitialized;

  beforeAll(async () => {
    try {
      const testSetup = await setupTestDatabase();
      dataSource = testSetup.dataSource;
      testUser = testSetup.fixtures.testUser;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        "Skipping entity tests - PostgreSQL test database not available",
      );
      // eslint-disable-next-line no-console
      console.log(
        "To run these tests, ensure PostgreSQL is running on localhost:5434",
      );
      // Tests will be skipped if dataSource is not set
    }
  }, 30000); // Increase timeout for database setup

  afterAll(async () => {
    if (dataSource) {
      await teardownTestDatabase(dataSource);
    }
  });

  beforeEach(async () => {
    // Skip all test setup if database is not available
    if (!dataSource?.isInitialized) {
      return;
    }

    // Clean data between tests but keep fixtures
    await cleanTestData(dataSource);

    // Recreate fixtures after cleanup
    const testSetup = await setupTestDatabase();
    testUser = testSetup.fixtures.testUser;
  });

  describe("Site Entity", () => {
    it("should create site with required fields", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const site = dataSource.manager.create(Site, {
        name: "Test Site",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });

      const savedSite = await dataSource.manager.save(site);
      expect(savedSite.id).toBeDefined();
      expect(savedSite.name).toBe("Test Site");
      expect(savedSite.createdAt).toBeDefined();
      expect(savedSite.updatedAt).toBeDefined();
    });

    it("should enforce unique site names", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const site1 = dataSource.manager.create(Site, {
        name: "Unique Site",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(site1);

      const site2 = dataSource.manager.create(Site, {
        name: "Unique Site",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });

      await expect(dataSource.manager.save(site2)).rejects.toThrow();
    });
  });

  describe("Cell Entity", () => {
    let testSite: Site;

    beforeEach(async () => {
      if (shouldSkipTests()) {
        return;
      }
      testSite = dataSource.manager.create(Site, {
        name: `Site ${Date.now()}`,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(testSite);
    });

    it("should create cell with site relationship", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const cell = dataSource.manager.create(Cell, {
        siteId: testSite.id,
        name: "Test Cell",
        lineNumber: "LINE001",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });

      const savedCell = await dataSource.manager.save(cell);
      expect(savedCell.id).toBeDefined();
      expect(savedCell.siteId).toBe(testSite.id);
    });

    it("should enforce unique line numbers per site", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const cell1 = dataSource.manager.create(Cell, {
        siteId: testSite.id,
        name: "Cell 1",
        lineNumber: "LINE001",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(cell1);

      const cell2 = dataSource.manager.create(Cell, {
        siteId: testSite.id,
        name: "Cell 2",
        lineNumber: "LINE001",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });

      await expect(dataSource.manager.save(cell2)).rejects.toThrow();
    });
  });

  describe("Equipment Entity", () => {
    let testCell: Cell;

    beforeEach(async () => {
      if (shouldSkipTests()) {
        return;
      }
      const site = dataSource.manager.create(Site, {
        name: `Site ${Date.now()}`,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(site);

      testCell = dataSource.manager.create(Cell, {
        siteId: site.id,
        name: "Test Cell",
        lineNumber: `LINE${Date.now()}`,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(testCell);
    });

    it("should create equipment with valid enum type", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const equipment = dataSource.manager.create(Equipment, {
        cellId: testCell.id,
        name: "Test Equipment",
        equipmentType: EquipmentType.ROBOT,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });

      const savedEquipment = await dataSource.manager.save(equipment);
      expect(savedEquipment.equipmentType).toBe(EquipmentType.ROBOT);
    });

    it("should validate equipment type enum values", () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      expect(Object.values(EquipmentType)).toContain("PRESS");
      expect(Object.values(EquipmentType)).toContain("ROBOT");
      expect(Object.values(EquipmentType)).toContain("OVEN");
      expect(Object.values(EquipmentType)).toContain("CONVEYOR");
      expect(Object.values(EquipmentType)).toContain("ASSEMBLY_TABLE");
      expect(Object.values(EquipmentType)).toContain("OTHER");
    });
  });

  describe("PLC Entity", () => {
    let testEquipment: Equipment;

    beforeEach(async () => {
      if (shouldSkipTests()) {
        return;
      }
      const site = dataSource.manager.create(Site, {
        name: `Site ${Date.now()}`,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(site);

      const cell = dataSource.manager.create(Cell, {
        siteId: site.id,
        name: "Test Cell",
        lineNumber: `LINE${Date.now()}`,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(cell);

      testEquipment = dataSource.manager.create(Equipment, {
        cellId: cell.id,
        name: "Test Equipment",
        equipmentType: EquipmentType.ROBOT,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(testEquipment);
    });

    it("should create PLC with unique tag ID", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const plc = dataSource.manager.create(PLC, {
        equipmentId: testEquipment.id,
        tagId: "PLC001",
        description: "Test PLC",
        make: "Allen Bradley",
        model: "CompactLogix",
        ipAddress: "192.168.1.100",
        firmwareVersion: "21.0.1",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });

      const savedPLC = await dataSource.manager.save(plc);
      expect(savedPLC.tagId).toBe("PLC001");
      expect(savedPLC.ipAddress).toBe("192.168.1.100");
    });

    it("should enforce unique tag IDs", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const plc1 = dataSource.manager.create(PLC, {
        equipmentId: testEquipment.id,
        tagId: "UNIQUE_PLC",
        description: "First PLC",
        make: "Allen Bradley",
        model: "CompactLogix",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(plc1);

      const plc2 = dataSource.manager.create(PLC, {
        equipmentId: testEquipment.id,
        tagId: "UNIQUE_PLC",
        description: "Second PLC",
        make: "Siemens",
        model: "S7-1500",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });

      await expect(dataSource.manager.save(plc2)).rejects.toThrow();
    });

    it("should allow nullable IP address", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const plc = dataSource.manager.create(PLC, {
        equipmentId: testEquipment.id,
        tagId: "PLC_NO_IP",
        description: "PLC without IP",
        make: "Allen Bradley",
        model: "CompactLogix",
        ipAddress: null,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });

      const savedPLC = await dataSource.manager.save(plc);
      expect(savedPLC.ipAddress).toBeNull();
    });
  });

  describe("Tag Entity", () => {
    let testPLC: PLC;

    beforeEach(async () => {
      if (shouldSkipTests()) {
        return;
      }
      const site = dataSource.manager.create(Site, {
        name: `Site ${Date.now()}`,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(site);

      const cell = dataSource.manager.create(Cell, {
        siteId: site.id,
        name: "Test Cell",
        lineNumber: `LINE${Date.now()}`,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(cell);

      const equipment = dataSource.manager.create(Equipment, {
        cellId: cell.id,
        name: "Test Equipment",
        equipmentType: EquipmentType.ROBOT,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(equipment);

      testPLC = dataSource.manager.create(PLC, {
        equipmentId: equipment.id,
        tagId: `PLC${Date.now()}`,
        description: "Test PLC",
        make: "Allen Bradley",
        model: "CompactLogix",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(testPLC);
    });

    it("should create tag with valid data type", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const tag = dataSource.manager.create(Tag, {
        plcId: testPLC.id,
        name: "START_BUTTON",
        dataType: TagDataType.BOOL,
        description: "Start button input",
        address: "I:0/0",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });

      const savedTag = await dataSource.manager.save(tag);
      expect(savedTag.dataType).toBe(TagDataType.BOOL);
      expect(savedTag.address).toBe("I:0/0");
    });

    it("should validate tag data type enum values", () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      expect(Object.values(TagDataType)).toContain("BOOL");
      expect(Object.values(TagDataType)).toContain("INT");
      expect(Object.values(TagDataType)).toContain("DINT");
      expect(Object.values(TagDataType)).toContain("REAL");
      expect(Object.values(TagDataType)).toContain("STRING");
      expect(Object.values(TagDataType)).toContain("TIMER");
      expect(Object.values(TagDataType)).toContain("COUNTER");
    });

    it("should enforce unique tag names per PLC", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const tag1 = dataSource.manager.create(Tag, {
        plcId: testPLC.id,
        name: "UNIQUE_TAG",
        dataType: TagDataType.BOOL,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(tag1);

      const tag2 = dataSource.manager.create(Tag, {
        plcId: testPLC.id,
        name: "UNIQUE_TAG",
        dataType: TagDataType.INT,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });

      await expect(dataSource.manager.save(tag2)).rejects.toThrow();
    });
  });

  describe("AuditLog Entity", () => {
    it("should create audit log with all fields", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const auditLog = dataSource.manager.create(AuditLog, {
        tableName: "test_table",
        recordId: testUser.id,
        action: AuditAction.UPDATE,
        oldValues: { field1: "old_value" },
        newValues: { field1: "new_value" },
        changedFields: ["field1"],
        userId: testUser.id,
        timestamp: new Date(),
        ipAddress: "192.168.1.1",
        userAgent: "Test Agent",
        sessionId: "test-session",
        riskLevel: RiskLevel.MEDIUM,
        complianceNotes: "Test compliance note",
      });

      const savedLog = await dataSource.manager.save(auditLog);
      expect(savedLog.action).toBe(AuditAction.UPDATE);
      expect(savedLog.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(savedLog.oldValues).toEqual({ field1: "old_value" });
    });

    it("should validate audit action enum values", () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      expect(Object.values(AuditAction)).toContain("INSERT");
      expect(Object.values(AuditAction)).toContain("UPDATE");
      expect(Object.values(AuditAction)).toContain("DELETE");
    });

    it("should validate risk level enum values", () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      expect(Object.values(RiskLevel)).toContain("LOW");
      expect(Object.values(RiskLevel)).toContain("MEDIUM");
      expect(Object.values(RiskLevel)).toContain("HIGH");
      expect(Object.values(RiskLevel)).toContain("CRITICAL");
    });
  });

  describe("Notification Entity", () => {
    it("should create notification with required fields", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const notification = dataSource.manager.create(Notification, {
        userId: testUser.id,
        title: "Test Notification",
        message: "Test message",
        type: "info",
        isRead: false,
        data: { key: "value" },
      });

      const savedNotification = await dataSource.manager.save(notification);
      expect(savedNotification.title).toBe("Test Notification");
      expect(savedNotification.isRead).toBe(false);
      expect(savedNotification.data).toEqual({ key: "value" });
    });

    it("should allow null data field", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const notification = dataSource.manager.create(Notification, {
        userId: testUser.id,
        title: "Simple Notification",
        message: "Simple message",
        type: "info",
        isRead: false,
        data: null,
      });

      const savedNotification = await dataSource.manager.save(notification);
      expect(savedNotification.data).toBeNull();
    });
  });

  describe("Entity Relationships", () => {
    it("should load site with cells", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      // Create site
      const site = dataSource.manager.create(Site, {
        name: `Site with Cells ${Date.now()}`,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(site);

      // Create cells
      const cell1 = dataSource.manager.create(Cell, {
        siteId: site.id,
        name: "Cell 1",
        lineNumber: "LINE001",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      const cell2 = dataSource.manager.create(Cell, {
        siteId: site.id,
        name: "Cell 2",
        lineNumber: "LINE002",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save([cell1, cell2]);

      // Load site with cells
      const siteWithCells = await dataSource.manager.findOne(Site, {
        where: { id: site.id },
        relations: ["cells"],
      });

      expect(siteWithCells?.cells).toHaveLength(2);
    });

    it("should cascade delete from site to cells", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      // Create site and cell
      const site = dataSource.manager.create(Site, {
        name: `Site for Cascade ${Date.now()}`,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(site);

      const cell = dataSource.manager.create(Cell, {
        siteId: site.id,
        name: "Cell for Cascade",
        lineNumber: "CASCADE001",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(cell);

      // Delete site
      await dataSource.manager.remove(site);

      // Check if cell is deleted
      const remainingCell = await dataSource.manager.findOne(Cell, {
        where: { id: cell.id },
      });
      expect(remainingCell).toBeNull();
    });
  });

  describe("PostgreSQL-specific Features", () => {
    it("should generate UUID primary keys using gen_random_uuid()", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const site = dataSource.manager.create(Site, {
        name: "UUID Test Site",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });

      const savedSite = await dataSource.manager.save(site);

      // Verify UUID format (8-4-4-4-12 characters)
      expect(savedSite.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(savedSite.id).not.toBe(testUser.id); // Should be unique
    });

    it("should handle INET type for IP addresses", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const site = dataSource.manager.create(Site, {
        name: "IP Test Site",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(site);

      const cell = dataSource.manager.create(Cell, {
        siteId: site.id,
        name: "IP Test Cell",
        lineNumber: "IP001",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(cell);

      const equipment = dataSource.manager.create(Equipment, {
        cellId: cell.id,
        name: "IP Test Equipment",
        equipmentType: EquipmentType.ROBOT,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(equipment);

      // Test IPv4 address
      const plc1 = dataSource.manager.create(PLC, {
        equipmentId: equipment.id,
        tagId: "IP_TEST_PLC_V4",
        description: "IPv4 Test PLC",
        make: "Test",
        model: "IPv4",
        ipAddress: "192.168.1.100",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      const savedPLC1 = await dataSource.manager.save(plc1);
      expect(savedPLC1.ipAddress).toBe("192.168.1.100");

      // Test IPv6 address
      const plc2 = dataSource.manager.create(PLC, {
        equipmentId: equipment.id,
        tagId: "IP_TEST_PLC_V6",
        description: "IPv6 Test PLC",
        make: "Test",
        model: "IPv6",
        ipAddress: "2001:db8::1",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      const savedPLC2 = await dataSource.manager.save(plc2);
      expect(savedPLC2.ipAddress).toBe("2001:db8::1");
    });

    it("should handle JSONB data types properly", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      // Test JSONB in AuditLog
      const auditLog = dataSource.manager.create(AuditLog, {
        tableName: "test_table",
        recordId: testUser.id,
        action: AuditAction.UPDATE,
        oldValues: {
          name: "old_name",
          count: 42,
          active: true,
          metadata: { version: "1.0" },
        },
        newValues: {
          name: "new_name",
          count: 43,
          active: false,
          metadata: { version: "2.0", updated: true },
        },
        changedFields: ["name", "count", "active", "metadata"],
        userId: testUser.id,
        timestamp: new Date(),
        riskLevel: RiskLevel.LOW,
      });

      const savedLog = await dataSource.manager.save(auditLog);
      expect(savedLog.oldValues).toEqual({
        name: "old_name",
        count: 42,
        active: true,
        metadata: { version: "1.0" },
      });
      expect(savedLog.newValues).toEqual({
        name: "new_name",
        count: 43,
        active: false,
        metadata: { version: "2.0", updated: true },
      });

      // Test JSONB in Notification
      const notification = dataSource.manager.create(Notification, {
        userId: testUser.id,
        title: "JSONB Test",
        message: "Testing JSONB data",
        type: "info",
        data: {
          priority: "high",
          tags: ["important", "test"],
          config: { retry: 3, timeout: 30 },
        },
      });

      const savedNotification = await dataSource.manager.save(notification);
      expect(savedNotification.data).toEqual({
        priority: "high",
        tags: ["important", "test"],
        config: { retry: 3, timeout: 30 },
      });
    });

    it("should handle text arrays properly", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const auditLog = dataSource.manager.create(AuditLog, {
        tableName: "test_table",
        recordId: testUser.id,
        action: AuditAction.UPDATE,
        changedFields: ["field1", "field2", "nested.field", "array_field[0]"],
        userId: testUser.id,
        timestamp: new Date(),
        riskLevel: RiskLevel.MEDIUM,
      });

      const savedLog = await dataSource.manager.save(auditLog);
      expect(savedLog.changedFields).toEqual([
        "field1",
        "field2",
        "nested.field",
        "array_field[0]",
      ]);
      expect(Array.isArray(savedLog.changedFields)).toBe(true);
    });

    it("should enforce unique constraints with partial indexes", async () => {
      if (shouldSkipTests()) {
        // eslint-disable-next-line no-console
        console.log("Skipping test: PostgreSQL not available");
        return;
      }
      const site = dataSource.manager.create(Site, {
        name: "Unique Index Test Site",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(site);

      const cell = dataSource.manager.create(Cell, {
        siteId: site.id,
        name: "Unique Index Test Cell",
        lineNumber: "UNIQUE001",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(cell);

      const equipment = dataSource.manager.create(Equipment, {
        cellId: cell.id,
        name: "Unique Index Test Equipment",
        equipmentType: EquipmentType.OTHER,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(equipment);

      // Create PLC with IP address
      const plc1 = dataSource.manager.create(PLC, {
        equipmentId: equipment.id,
        tagId: "UNIQUE_IP_PLC_1",
        description: "First PLC with IP",
        make: "Test",
        model: "Unique",
        ipAddress: "192.168.1.200",
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });
      await dataSource.manager.save(plc1);

      // Try to create another PLC with the same IP address - should fail
      const plc2 = dataSource.manager.create(PLC, {
        equipmentId: equipment.id,
        tagId: "UNIQUE_IP_PLC_2",
        description: "Second PLC with same IP",
        make: "Test",
        model: "Unique",
        ipAddress: "192.168.1.200", // Same IP as plc1
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });

      await expect(dataSource.manager.save(plc2)).rejects.toThrow();

      // But multiple PLCs with NULL IP addresses should be allowed
      const plc3 = dataSource.manager.create(PLC, {
        equipmentId: equipment.id,
        tagId: "NULL_IP_PLC_1",
        description: "PLC without IP",
        make: "Test",
        model: "NoIP",
        ipAddress: null,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });

      const plc4 = dataSource.manager.create(PLC, {
        equipmentId: equipment.id,
        tagId: "NULL_IP_PLC_2",
        description: "Another PLC without IP",
        make: "Test",
        model: "NoIP",
        ipAddress: null,
        createdBy: testUser.id,
        updatedBy: testUser.id,
      });

      // Both should save successfully (partial unique constraint allows multiple NULLs)
      await expect(
        dataSource.manager.save([plc3, plc4]),
      ).resolves.not.toThrow();
    });
  });
});
