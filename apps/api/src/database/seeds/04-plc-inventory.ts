/**
 * Seed PLC inventory data
 * Creates sample PLCs, equipment, and tags for testing
 */

import { DataSource } from 'typeorm';
import { PLC } from '../../entities/PLC.js';
import { Equipment, EquipmentType } from '../../entities/Equipment.js';
import { Tag } from '../../entities/Tag.js';
import { Site } from '../../entities/Site.js';
import { Cell } from '../../entities/Cell.js';
import { User } from '../../entities/User.js';
import { logger } from '../../config/logger.js';

export const seedPLCInventory = async (dataSource: DataSource): Promise<void> => {
  const plcRepo = dataSource.getRepository(PLC);
  const equipmentRepo = dataSource.getRepository(Equipment);
  const tagRepo = dataSource.getRepository(Tag);
  const siteRepo = dataSource.getRepository(Site);
  const cellRepo = dataSource.getRepository(Cell);
  const userRepo = dataSource.getRepository(User);

  // Check if PLCs already exist
  const existingPlcCount = await plcRepo.count();
  if (existingPlcCount > 0) {
    logger.info(`  - PLCs already exist (${existingPlcCount} found), skipping PLC seed`);
    return;
  }

  // Get admin user for created_by/updated_by
  const adminUser = await userRepo.findOne({
    where: { email: 'admin@luppa-plc.local' },
  });
  if (!adminUser) {
    logger.error('  - Admin user not found, cannot create PLC inventory');
    return;
  }

  // Get sites and cells for assignment
  const sites = await siteRepo.find();
  const cells = await cellRepo.find({ relations: ['site'] });

  if (sites.length === 0 || cells.length === 0) {
    logger.info('  - No sites or cells found, skipping PLC inventory seed');
    return;
  }

  // Create equipment entries
  const equipmentData = [
    {
      name: 'Assembly Line 1 Controller',
      equipmentType: EquipmentType.ASSEMBLY_TABLE,
      cellId: cells[0].id,
      cell: cells[0],
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
    {
      name: 'Conveyor System Controller',
      equipmentType: EquipmentType.CONVEYOR,
      cellId: cells[1]?.id || cells[0].id,
      cell: cells[1] || cells[0],
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
    {
      name: 'Quality Station PLC',
      equipmentType: EquipmentType.OTHER,
      cellId: cells[2]?.id || cells[0].id,
      cell: cells[2] || cells[0],
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  ];

  const createdEquipment = await equipmentRepo.save(equipmentData);
  logger.info(`  - Created ${createdEquipment.length} equipment entries`);

  // Create PLC entries
  const plcData = [
    {
      tagId: 'PLC-001',
      description: 'Main assembly line controller for production line 1',
      make: 'Allen-Bradley',
      model: 'CompactLogix 5380',
      ipAddress: '192.168.1.101',
      firmwareVersion: 'v32.011',
      equipment: createdEquipment[0],
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
    {
      tagId: 'PLC-002',
      description: 'Conveyor system controller for material handling',
      make: 'Siemens',
      model: 'S7-1500',
      ipAddress: '192.168.1.102',
      firmwareVersion: 'v2.9.3',
      equipment: createdEquipment[1],
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
    {
      tagId: 'PLC-003',
      description: 'Quality inspection station controller',
      make: 'Omron',
      model: 'NX102',
      ipAddress: '192.168.1.103',
      firmwareVersion: 'v1.4.0',
      equipment: createdEquipment[2],
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  ];

  const createdPlcs = await plcRepo.save(plcData);
  logger.info(`  - Created ${createdPlcs.length} PLCs`);

  // Create sample tags for each PLC
  const tagData = [];
  for (const plc of createdPlcs) {
    tagData.push(
      {
        plc,
        name: `${plc.tagId}_START`,
        dataType: 'BOOL',
        description: 'Start command for the system',
        address: 'B3:0/0',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
      {
        plc,
        name: `${plc.tagId}_STOP`,
        dataType: 'BOOL',
        description: 'Stop command for the system',
        address: 'B3:0/1',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
      {
        plc,
        name: `${plc.tagId}_SPEED`,
        dataType: 'REAL',
        description: 'System speed setpoint',
        address: 'F8:10',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
      {
        plc,
        name: `${plc.tagId}_COUNT`,
        dataType: 'DINT',
        description: 'Production counter',
        address: 'N7:0',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      }
    );
  }

  await tagRepo.save(tagData);
  logger.info(`  - Created ${tagData.length} tags`);
};

export default seedPLCInventory;