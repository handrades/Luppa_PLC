/**
 * Seed PLC inventory data
 * Creates sample PLCs, equipment, and tags for testing
 */

import { DataSource } from 'typeorm';
import { PLC } from '../../entities/PLC.js';
import { Equipment } from '../../entities/Equipment.js';
import { Tag } from '../../entities/Tag.js';
import { Site } from '../../entities/Site.js';
import { Cell } from '../../entities/Cell.js';
import { User } from '../../entities/User.js';

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
    console.log(`  �  PLCs already exist (${existingPlcCount} found), skipping PLC seed`);
    return;
  }

  // Get admin user for created_by/updated_by
  const adminUser = await userRepo.findOne({
    where: { email: 'admin@luppa.com' },
  });
  if (!adminUser) {
    console.error('  L Admin user not found, cannot create PLC inventory');
    return;
  }

  // Get sites and cells for assignment
  const sites = await siteRepo.find();
  const cells = await cellRepo.find({ relations: ['site'] });

  if (sites.length === 0 || cells.length === 0) {
    console.log('  �  No sites or cells found, skipping PLC inventory seed');
    return;
  }

  // Create equipment entries
  const equipmentData = [
    {
      name: 'Assembly Line 1 Controller',
      description: 'Main PLC controlling assembly line 1',
      type: 'PLC Controller',
      manufacturer: 'Allen-Bradley',
      model: 'CompactLogix 5380',
      serial_number: 'AB-CL5380-001',
      cell: cells[0],
      created_by: adminUser,
      updated_by: adminUser,
    },
    {
      name: 'Conveyor System Controller',
      description: 'Controls material handling conveyor system',
      type: 'PLC Controller',
      manufacturer: 'Siemens',
      model: 'S7-1500',
      serial_number: 'SIE-S71500-001',
      cell: cells[1] || cells[0],
      created_by: adminUser,
      updated_by: adminUser,
    },
    {
      name: 'Quality Station PLC',
      description: 'Quality inspection station controller',
      type: 'PLC Controller',
      manufacturer: 'Omron',
      model: 'NX102',
      serial_number: 'OMR-NX102-001',
      cell: cells[2] || cells[0],
      created_by: adminUser,
      updated_by: adminUser,
    },
  ];

  const createdEquipment = await equipmentRepo.save(equipmentData);
  console.log(`   Created ${createdEquipment.length} equipment entries`);

  // Create PLC entries
  const plcData = [
    {
      tag_id: 'PLC-001',
      description: 'Main assembly line controller for production line 1',
      make: 'Allen-Bradley',
      model: 'CompactLogix 5380',
      ip_address: '192.168.1.101',
      firmware_version: 'v32.011',
      equipment: createdEquipment[0],
      created_by: adminUser,
      updated_by: adminUser,
    },
    {
      tag_id: 'PLC-002',
      description: 'Conveyor system controller for material handling',
      make: 'Siemens',
      model: 'S7-1500',
      ip_address: '192.168.1.102',
      firmware_version: 'v2.9.3',
      equipment: createdEquipment[1],
      created_by: adminUser,
      updated_by: adminUser,
    },
    {
      tag_id: 'PLC-003',
      description: 'Quality inspection station controller',
      make: 'Omron',
      model: 'NX102',
      ip_address: '192.168.1.103',
      firmware_version: 'v1.4.0',
      equipment: createdEquipment[2],
      created_by: adminUser,
      updated_by: adminUser,
    },
  ];

  const createdPlcs = await plcRepo.save(plcData);
  console.log(`   Created ${createdPlcs.length} PLCs`);

  // Create sample tags for each PLC
  const tagData = [];
  for (const plc of createdPlcs) {
    tagData.push(
      {
        plc,
        name: `${plc.tag_id}_START`,
        data_type: 'BOOL',
        description: 'Start command for the system',
        address: 'B3:0/0',
        created_by: adminUser,
        updated_by: adminUser,
      },
      {
        plc,
        name: `${plc.tag_id}_STOP`,
        data_type: 'BOOL',
        description: 'Stop command for the system',
        address: 'B3:0/1',
        created_by: adminUser,
        updated_by: adminUser,
      },
      {
        plc,
        name: `${plc.tag_id}_SPEED`,
        data_type: 'REAL',
        description: 'System speed setpoint',
        address: 'F8:10',
        created_by: adminUser,
        updated_by: adminUser,
      },
      {
        plc,
        name: `${plc.tag_id}_COUNT`,
        data_type: 'DINT',
        description: 'Production counter',
        address: 'N7:0',
        created_by: adminUser,
        updated_by: adminUser,
      }
    );
  }

  await tagRepo.save(tagData);
  console.log(`   Created ${tagData.length} tags`);
};

export default seedPLCInventory;
