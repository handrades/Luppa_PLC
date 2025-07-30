/**
 * Seed script for sample development users
 * DEVELOPMENT ONLY - Creates sample users for testing
 * 
 * WARNING: This script should NEVER be run in production
 * NOTE: Contains development passwords that are randomly generated - not hardcoded secrets
 */

/* eslint-disable no-console */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from '../../entities/User.js';
import { Role } from '../../entities/Role.js';

export const seedUsers = async (dataSource: DataSource): Promise<void> => {
  // Safety check: only run in development
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  User seeding skipped - production environment detected');
    return;
  }

  console.log('🌱 Seeding development users...');
  
  const userRepository = dataSource.getRepository(User);
  const roleRepository = dataSource.getRepository(Role);

  // Get roles for user assignment
  const adminRole = await roleRepository.findOne({ where: { name: 'Admin' } });
  const engineerRole = await roleRepository.findOne({ where: { name: 'Engineer' } });
  const viewerRole = await roleRepository.findOne({ where: { name: 'Viewer' } });

  if (!adminRole || !engineerRole || !viewerRole) {
    throw new Error('Required roles not found. Please run role seeding first.');
  }

  // Generate cryptographically secure random passwords for development
  const generateSecurePassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*';
    // nosemgrep: generic.secrets.security.detected-generic-secret - Dynamic password generation, not hardcoded
    let password = '';
    const randomValues = randomBytes(16);
    
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(randomValues[i] % chars.length);
    }
    return password;
  };

  // Define sample users for development testing
  const sampleUsers = [
    {
      email: 'admin@luppa-plc.local',
      firstName: 'System',
      lastName: 'Administrator',
      role: adminRole,
      password: process.env.DEV_ADMIN_PASSWORD || generateSecurePassword(),
    },
    {
      email: 'engineer@luppa-plc.local',
      firstName: 'Process',
      lastName: 'Engineer',
      role: engineerRole,
      password: process.env.DEV_ENGINEER_PASSWORD || generateSecurePassword(),
    },
    {
      email: 'viewer@luppa-plc.local',
      firstName: 'Plant',
      lastName: 'Operator',
      role: viewerRole,
      password: process.env.DEV_VIEWER_PASSWORD || generateSecurePassword(),
    },
  ];

  // Check if users already exist
  const existingUsers = await userRepository.find({
    where: sampleUsers.map(user => ({ email: user.email })),
  });

  const existingEmails = existingUsers.map(user => user.email);
  const usersToCreate = sampleUsers.filter(
    user => !existingEmails.includes(user.email)
  );

  if (usersToCreate.length === 0) {
    console.log('✅ Development users already exist, skipping seed');
    return;
  }

  // Hash passwords and create users
  const saltRounds = 12; // Strong hashing for security
  const users: User[] = [];
  const credentials: Array<{ email: string; password: string; role: string }> = [];

  for (const userData of usersToCreate) {
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
    
    const user = new User();
    user.email = userData.email;
    user.firstName = userData.firstName;
    user.lastName = userData.lastName;
    user.passwordHash = hashedPassword;
    user.roleId = userData.role.id;
    user.isActive = true;
    user.lastLogin = null;

    users.push(user);
    
    // Store credentials for display (only in development)
    credentials.push({
      email: userData.email,
      password: userData.password,
      role: userData.role.name,
    });
  }

  await userRepository.save(users);

  console.log(`✅ Created ${users.length} development users:`);
  console.log('\n📋 Development Login Credentials:');
  console.log('=====================================');
  
  credentials.forEach(cred => {
    console.log(`${cred.role} User:`);
    console.log(`  Email: ${cred.email}`);
    console.log(`  Password: ${cred.password}`);
    console.log('');
  });

  console.log('⚠️  IMPORTANT: These are development-only credentials.');
  console.log('   Store these securely and change passwords in production!');
  console.log('   Consider setting DEV_ADMIN_PASSWORD, DEV_ENGINEER_PASSWORD,');
  console.log('   and DEV_VIEWER_PASSWORD environment variables for consistency.');
};
