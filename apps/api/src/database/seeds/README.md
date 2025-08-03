# Database Seed Scripts

This directory contains seed scripts for initializing the database with essential data for development and testing.

## Overview

The seed scripts create:

1. **System Roles** (`01-roles.ts`) - Admin, Engineer, and Viewer roles with appropriate permissions
2. **Development Users** (`02-users.ts`) - Sample users for testing (development only)

## Usage

### Run All Seeds

```bash
# Run all seeds in order
pnpm seed
```

### Run Individual Seeds

```bash
# Create roles only
pnpm seed:roles

# Create users only (requires roles to exist)
pnpm seed:users
```

## Role Permissions

### Admin Role

- **Full system access** including user management, system configuration
- Can manage users, equipment, PLCs, and system settings
- Has audit log access and system backup capabilities

### Engineer Role

- **Equipment and PLC management** for process engineers
- Can create, read, update equipment and PLCs (no deletion)
- Has read access to users and audit logs
- Can configure PLCs and perform maintenance

### Viewer Role

- **Read-only access** for plant operators
- Can view equipment and PLC information
- Limited audit log access (no export)
- No user or system management capabilities

## Development Users

The seed script creates three test users (development only):

- `admin@luppa-plc.local` - Admin role
- `engineer@luppa-plc.local` - Engineer role
- `viewer@luppa-plc.local` - Viewer role

**Security Notes:**

- Passwords are randomly generated and displayed during seeding
- Use environment variables `DEV_ADMIN_PASSWORD`, `DEV_ENGINEER_PASSWORD`, `DEV_VIEWER_PASSWORD` for consistent passwords
- User seeding is automatically disabled in production environments

## Environment Variables

Set these variables for consistent development passwords:

```bash
DEV_ADMIN_PASSWORD=your-admin-password
DEV_ENGINEER_PASSWORD=your-engineer-password
DEV_VIEWER_PASSWORD=your-viewer-password
```

## Safety Features

- **Production Protection**: User seeding automatically skips in production
- **Duplicate Prevention**: Scripts check for existing data before creating
- **Secure Passwords**: Uses bcrypt with 12 salt rounds
- **Clear Marking**: Development-only data is clearly identified

## Files

- `01-roles.ts` - System roles with permission structure
- `02-users.ts` - Development users with secure passwords
- `index.ts` - Main seed runner and orchestration
- `README.md` - This documentation file

## Prerequisites

Ensure the following before running seeds:

1. Database is running and accessible
2. Migrations have been applied (`pnpm migration:run`)
3. Environment variables are configured
4. Required dependencies are installed (`pnpm install`)
