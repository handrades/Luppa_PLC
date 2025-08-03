/**
 * Seed script for initial system roles
 * Creates Admin, Engineer, and Viewer roles with appropriate permissions
 */

/* eslint-disable no-console */

import { DataSource } from 'typeorm';
import { Role, RolePermissions } from '../../entities/Role.js';

export const seedRoles = async (dataSource: DataSource): Promise<void> => {
  console.log('🌱 Seeding system roles...');

  const roleRepository = dataSource.getRepository(Role);

  // Define role permissions based on industrial PLC management requirements
  const rolePermissions: Array<{
    name: string;
    permissions: RolePermissions;
    description: string;
    isSystem: boolean;
  }> = [
    {
      name: 'Admin',
      description:
        'Full system administration access with user management and system configuration',
      isSystem: true,
      permissions: {
        // User Management
        users: {
          create: true,
          read: true,
          update: true,
          delete: true,
          export: true,
        },
        // Role Management
        roles: {
          create: true,
          read: true,
          update: true,
          delete: false, // Cannot delete system roles
          export: true,
        },
        // Equipment Management
        equipment: {
          create: true,
          read: true,
          update: true,
          delete: true,
          export: true,
        },
        // PLC Management
        plcs: {
          create: true,
          read: true,
          update: true,
          delete: true,
          export: true,
          configure: true,
          maintenance: true,
        },
        // Audit System
        audit: {
          read: true,
          export: true,
          purge: true, // Can purge old audit logs
        },
        // System Settings
        system: {
          configure: true,
          backup: true,
          restore: true,
          monitoring: true,
        },
      },
    },
    {
      name: 'Engineer',
      description: 'Process engineer with equipment and PLC management capabilities',
      isSystem: true,
      permissions: {
        // User Management (limited)
        users: {
          read: true,
          export: false,
        },
        // Role Management (read-only)
        roles: {
          read: true,
        },
        // Equipment Management (full)
        equipment: {
          create: true,
          read: true,
          update: true,
          delete: false, // Cannot delete equipment, only deactivate
          export: true,
        },
        // PLC Management (full operational access)
        plcs: {
          create: true,
          read: true,
          update: true,
          delete: false, // Cannot delete PLCs, only deactivate
          export: true,
          configure: true,
          maintenance: true,
        },
        // Audit System (read-only)
        audit: {
          read: true,
          export: true,
        },
        // System Settings (monitoring only)
        system: {
          monitoring: true,
        },
      },
    },
    {
      name: 'Viewer',
      description: 'Read-only access for viewing equipment and PLC information',
      isSystem: true,
      permissions: {
        // User Management (none)
        users: {},
        // Role Management (none)
        roles: {},
        // Equipment Management (read-only)
        equipment: {
          read: true,
          export: false, // No export capabilities
        },
        // PLC Management (read-only)
        plcs: {
          read: true,
          export: false,
        },
        // Audit System (limited read)
        audit: {
          read: true, // Can view audit logs but not export
        },
        // System Settings (monitoring only)
        system: {
          monitoring: true,
        },
      },
    },
  ];

  // Check if roles already exist to avoid duplicates
  const existingRoles = await roleRepository.find({
    where: rolePermissions.map(role => ({ name: role.name })),
  });

  const existingRoleNames = existingRoles.map(role => role.name);
  const rolesToCreate = rolePermissions.filter(role => !existingRoleNames.includes(role.name));

  if (rolesToCreate.length === 0) {
    console.log('✅ System roles already exist, skipping seed');
    return;
  }

  // Create new roles
  const roles = rolesToCreate.map(roleData => {
    const role = new Role();
    role.name = roleData.name;
    role.description = roleData.description;
    role.permissions = roleData.permissions;
    role.isSystem = roleData.isSystem;
    return role;
  });

  await roleRepository.save(roles);

  console.log(`✅ Created ${roles.length} system roles:`);
  roles.forEach(role => {
    console.log(`   - ${role.name}: ${role.description}`);
  });
};
