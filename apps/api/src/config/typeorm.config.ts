/**
 * TypeORM CLI Configuration
 *
 * This configuration is used by TypeORM CLI commands for generating
 * and running migrations. It must be separate from the main DataSource
 * to avoid circular dependencies and to work with the CLI tools.
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';
// Use file paths instead of barrel imports for ESM compatibility
import { User } from '../entities/User';
import { Role } from '../entities/Role';
import { Site } from '../entities/Site';
import { Cell } from '../entities/Cell';
import { Equipment } from '../entities/Equipment';
import { PLC } from '../entities/PLC';
import { Tag } from '../entities/Tag';
import { AuditLog } from '../entities/AuditLog';
import { Notification } from '../entities/Notification';

// Load environment variables from root directory
// Use absolute path resolution to avoid dependency on current working directory
// __filename and __dirname are available in CommonJS
const envPath = process.env.ENV_FILE_PATH || resolve(__dirname, '../../../../.env');
config({ path: envPath });

/**
 * Database configuration for CLI operations
 */
const createCliDataSource = () => {
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

    // Entity and migration locations
    entities: [User, Role, Site, Cell, Equipment, PLC, Tag, AuditLog, Notification],
    migrations: ['src/database/migrations/**/*.ts'],
    subscribers: ['src/database/subscribers/**/*.ts'],

    // CLI settings
    synchronize: false,
    logging: ['error'],
    logger: 'advanced-console',
    migrationsTableName: 'migration_history',
  });
};

/**
 * Export DataSource for TypeORM CLI
 */
export default createCliDataSource();
