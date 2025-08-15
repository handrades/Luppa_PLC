/**
 * Main seed runner script
 * Orchestrates all database seeding operations in the correct order
 */

/* eslint-disable no-console */

import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { seedRoles } from './01-roles.js';
import { seedUsers } from './02-users.js';
import { seedSitesAndHierarchy } from './03-sites-and-hierarchy.js';
import { seedPLCInventory } from './04-plc-inventory.js';

/**
 * Create DataSource for seeding operations
 */
const createSeedDataSource = (): DataSource => {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'luppa_plc',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
  };

  return new DataSource({
    type: 'postgres',
    host: dbConfig.host,
    port: dbConfig.port,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.database,
    ssl: dbConfig.ssl,

    // Use same entities as main application
    entities:
      process.env.NODE_ENV === 'production' ? ['dist/entities/**/*.js'] : ['src/entities/**/*.ts'],

    // Synchronize should be false in seeding
    synchronize: false,
    logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    logger: 'advanced-console',
  });
};

/**
 * Run all seed scripts in order
 */
const runSeeds = async (): Promise<void> => {
  console.log('🌱 Starting database seeding...');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(
    `Database: ${process.env.DB_NAME || 'luppa_plc'} on ${process.env.DB_HOST || 'localhost'}`
  );
  console.log('========================================\n');

  const dataSource = createSeedDataSource();

  try {
    // Initialize database connection
    console.log('📡 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connection established\n');

    // Run seeds in order
    const seedFunctions = [
      { name: 'Roles', fn: seedRoles },
      { name: 'Users', fn: seedUsers },
      { name: 'Sites and Hierarchy', fn: seedSitesAndHierarchy },
      { name: 'PLC Inventory', fn: seedPLCInventory },
    ];

    for (const seed of seedFunctions) {
      try {
        console.log(`\n📦 Running ${seed.name} seed...`);
        await seed.fn(dataSource);
        console.log(`✅ ${seed.name} seed completed`);
      } catch (error) {
        console.error(`❌ ${seed.name} seed failed:`, error);
        throw error;
      }
    }

    console.log('\n🎉 All seeds completed successfully!');
    console.log('========================================');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Always close the connection
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('📡 Database connection closed');
    }
  }
};

/**
 * Individual seed functions for granular control
 */
export const runRolesOnly = async (): Promise<void> => {
  console.log('🌱 Running roles seed only...');
  const dataSource = createSeedDataSource();

  try {
    await dataSource.initialize();
    await seedRoles(dataSource);
    console.log('✅ Roles seed completed');
  } catch (error) {
    console.error('❌ Roles seed failed:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
};

export const runUsersOnly = async (): Promise<void> => {
  console.log('🌱 Running users seed only...');
  const dataSource = createSeedDataSource();

  try {
    await dataSource.initialize();
    await seedUsers(dataSource);
    console.log('✅ Users seed completed');
  } catch (error) {
    console.error('❌ Users seed failed:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
};

// Run seeds if this file is executed directly
// In CommonJS, we can check if the module is the main module
if (require.main === module) {
  runSeeds().catch(error => {
    console.error('Seed execution failed:', error);
    process.exit(1);
  });
}

export { runSeeds };
export default runSeeds;
