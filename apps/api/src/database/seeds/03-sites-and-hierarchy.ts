/**
 * Seed script for sites, cells, and equipment hierarchy
 * Creates sample industrial site structure for PLC inventory system
 *
 * DEVELOPMENT ONLY - Creates sample industrial hierarchy for testing
 */

/* eslint-disable no-console */

import { DataSource } from 'typeorm';
import { Site } from '../../entities/Site.js';
import { Cell } from '../../entities/Cell.js';
import { Equipment, EquipmentType } from '../../entities/Equipment.js';
import { User } from '../../entities/User.js';

export const seedSitesAndHierarchy = async (dataSource: DataSource): Promise<void> => {
  // Safety check: only run in development/test
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  Sites/hierarchy seeding skipped - production environment detected');
    return;
  }

  console.log('🌱 Seeding sites and equipment hierarchy...');

  const siteRepository = dataSource.getRepository(Site);
  const userRepository = dataSource.getRepository(User);

  // Get admin user for created_by/updated_by tracking
  const adminUser = await userRepository.findOne({
    where: { email: 'admin@luppa-plc.local' },
  });

  if (!adminUser) {
    throw new Error('Admin user not found. Please run user seeding first.');
  }

  // Define sample sites based on typical industrial facilities
  const sitesData = [
    {
      name: 'Detroit Manufacturing Plant',
      cells: [
        {
          name: 'Assembly Line Alpha',
          lineNumber: 'AL-001',
          equipment: [
            { name: 'Hydraulic Press Station', type: EquipmentType.PRESS },
            { name: 'Assembly Robot Arm', type: EquipmentType.ROBOT },
            { name: 'Quality Inspection Table', type: EquipmentType.ASSEMBLY_TABLE },
          ],
        },
        {
          name: 'Assembly Line Beta',
          lineNumber: 'AL-002',
          equipment: [
            { name: 'Pneumatic Press Unit', type: EquipmentType.PRESS },
            { name: 'Parts Conveyor System', type: EquipmentType.CONVEYOR },
            { name: 'Welding Robot Station', type: EquipmentType.ROBOT },
          ],
        },
        {
          name: 'Heat Treatment Cell',
          lineNumber: 'HT-001',
          equipment: [
            { name: 'Industrial Curing Oven', type: EquipmentType.OVEN },
            { name: 'Temperature Control System', type: EquipmentType.OTHER },
          ],
        },
      ],
    },
    {
      name: 'Chicago Distribution Center',
      cells: [
        {
          name: 'Packaging Line 1',
          lineNumber: 'PL-001',
          equipment: [
            { name: 'Main Conveyor Belt', type: EquipmentType.CONVEYOR },
            { name: 'Packaging Robot', type: EquipmentType.ROBOT },
            { name: 'Final Assembly Station', type: EquipmentType.ASSEMBLY_TABLE },
          ],
        },
        {
          name: 'Packaging Line 2',
          lineNumber: 'PL-002',
          equipment: [
            { name: 'Secondary Conveyor', type: EquipmentType.CONVEYOR },
            { name: 'Labeling Station', type: EquipmentType.OTHER },
          ],
        },
      ],
    },
    {
      name: 'Milwaukee Quality Control',
      cells: [
        {
          name: 'Testing Cell A',
          lineNumber: 'TC-A01',
          equipment: [
            { name: 'Stress Test Press', type: EquipmentType.PRESS },
            { name: 'Automated Testing Robot', type: EquipmentType.ROBOT },
            { name: 'Quality Control Workstation', type: EquipmentType.ASSEMBLY_TABLE },
            { name: 'Environmental Test Chamber', type: EquipmentType.OVEN },
          ],
        },
      ],
    },
    {
      name: 'Columbus Prototype Lab',
      cells: [
        {
          name: 'R&D Development Cell',
          lineNumber: 'RD-001',
          equipment: [
            { name: 'Prototype Assembly Table', type: EquipmentType.ASSEMBLY_TABLE },
            { name: 'Precision Robot Arm', type: EquipmentType.ROBOT },
            { name: 'Test Equipment Rack', type: EquipmentType.OTHER },
          ],
        },
      ],
    },
  ];

  // Check if sites already exist BEFORE starting any transaction
  const existingSites = await siteRepository.find({
    where: sitesData.map(site => ({ name: site.name })),
  });

  const existingSiteNames = existingSites.map(site => site.name);
  const sitesToCreate = sitesData.filter(site => !existingSiteNames.includes(site.name));

  if (sitesToCreate.length === 0) {
    console.log('✅ Site hierarchy already exists, skipping seed');
    return;
  }

  // Use database transaction for atomic operations
  await dataSource.transaction(async manager => {
    let createdSitesCount = 0;
    let createdCellsCount = 0;
    let createdEquipmentCount = 0;

    // Create sites, cells, and equipment in order
    for (const siteData of sitesToCreate) {
      // Create site
      const site = new Site();
      site.name = siteData.name;
      site.createdBy = adminUser.id;
      site.updatedBy = adminUser.id;

      const savedSite = await manager.save(site);
      createdSitesCount++;

      // Create cells for this site
      for (const cellData of siteData.cells) {
        const cell = new Cell();
        cell.siteId = savedSite.id;
        cell.name = cellData.name;
        cell.lineNumber = cellData.lineNumber;
        cell.createdBy = adminUser.id;
        cell.updatedBy = adminUser.id;

        const savedCell = await manager.save(cell);
        createdCellsCount++;

        // Create equipment for this cell
        for (const equipmentData of cellData.equipment) {
          const equipment = new Equipment();
          equipment.cellId = savedCell.id;
          equipment.name = equipmentData.name;
          equipment.equipmentType = equipmentData.type;
          equipment.createdBy = adminUser.id;
          equipment.updatedBy = adminUser.id;

          await manager.save(equipment);
          createdEquipmentCount++;
        }
      }
    }

    console.log(`✅ Created site hierarchy:`);
    console.log(`   - ${createdSitesCount} sites`);
    console.log(`   - ${createdCellsCount} cells`);
    console.log(`   - ${createdEquipmentCount} equipment items`);
    console.log('');

    sitesToCreate.forEach(site => {
      console.log(`📍 ${site.name}:`);
      site.cells.forEach(cell => {
        console.log(`   └── ${cell.name} (${cell.lineNumber})`);
        cell.equipment.forEach(eq => {
          console.log(`       └── ${eq.name} (${eq.type})`);
        });
      });
    });
  });
};
