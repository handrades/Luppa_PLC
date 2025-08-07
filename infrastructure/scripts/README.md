# Database Backup and Restore Scripts

This directory contains PowerShell scripts for backing up and restoring the Luppa Inventory System
PostgreSQL database. These scripts are designed for industrial environments with proper error
handling, logging, and support for both containerized and local PostgreSQL instances.

## Prerequisites

### Required Software

- **PowerShell Core** (pwsh) - Available on Windows, Linux, and macOS
- **PostgreSQL Client Tools** - Required for pg_dump and psql commands
  - Ubuntu/Debian: `sudo apt-get install postgresql-client`
  - RHEL/CentOS: `sudo yum install postgresql`
  - Windows: Install PostgreSQL or just the client tools
- **gzip** (optional) - For compressed backups
  - Usually pre-installed on Linux/macOS
  - Windows: Available through Git Bash, WSL, or standalone installation

### Environment Variables

The scripts use the following environment variables for database connection. These should match your Docker Compose configuration:

```bash
# Primary environment variables (matches config/docker-compose.dev.yml)
POSTGRES_HOST=localhost          # Database host
POSTGRES_PORT=5433              # Database port (5433 for dev, 5432 for container-internal)
POSTGRES_DB=luppa_dev           # Database name
POSTGRES_USER=postgres          # Database username
POSTGRES_PASSWORD=dev_password  # Database password

# Alternative variable names (fallback)
DB_HOST=localhost
DB_PORT=5433
DB_NAME=luppa_dev
DB_USER=postgres
DB_PASSWORD=dev_password
```

## Scripts Overview

### backup-db.ps1

Creates timestamped backups of the PostgreSQL database with support for full and schema-only backups.

**Features:**

- Full database backups with data
- Schema-only backups (structure without data)
- Gzip compression support
- Timestamped filenames for easy identification
- Comprehensive error handling and logging
- Environment variable configuration
- Connection testing before backup

### restore-db.ps1

Restores PostgreSQL database backups created by backup-db.ps1 or compatible SQL files.

**Features:**

- Supports both compressed (.gz) and uncompressed (.sql) files
- Database creation and dropping options
- Transaction-based restore (all-or-nothing)
- Connection validation before restore
- Comprehensive error handling and logging
- Safety checks to prevent accidental data loss

## Usage

### From Package.json Scripts (Recommended)

Navigate to the `/apps/api` directory and use the predefined npm scripts:

```bash
# Change to API directory
cd apps/api

# Backup operations
pnpm run backup:db                 # Full compressed backup
pnpm run backup:db:schema         # Schema-only backup
pnpm run backup:db:full           # Full backup (explicit)
pnpm run backup:db:uncompressed   # Uncompressed backup

# Restore operations (requires -BackupFile parameter)
pnpm run restore:db -- -BackupFile "./backups/backup.sql.gz"
pnpm run restore:db:create -- -BackupFile "./backups/backup.sql.gz"
pnpm run restore:db:replace -- -BackupFile "./backups/backup.sql.gz"
```

### Direct Script Execution

From the repository root directory:

```bash
# Backup examples
pwsh infrastructure/scripts/backup-db.ps1
pwsh infrastructure/scripts/backup-db.ps1 -BackupType schema
pwsh infrastructure/scripts/backup-db.ps1 -OutputDir /custom/backup/path
pwsh infrastructure/scripts/backup-db.ps1 -Compress:$false -Verbose

# Restore examples
pwsh infrastructure/scripts/restore-db.ps1 -BackupFile "./backups/backup.sql.gz"
pwsh infrastructure/scripts/restore-db.ps1 -BackupFile "./backups/backup.sql" -CreateDatabase
pwsh infrastructure/scripts/restore-db.ps1 -BackupFile "./backups/backup.sql" -DropExisting -CreateDatabase
```

## Script Parameters

### backup-db.ps1 Parameters

| Parameter      | Type    | Default     | Description                        |
| -------------- | ------- | ----------- | ---------------------------------- |
| `BackupType`   | String  | 'full'      | Type of backup: 'full' or 'schema' |
| `OutputDir`    | String  | './backups' | Directory to store backup files    |
| `DatabaseName` | String  | (from env)  | Override database name             |
| `Compress`     | Boolean | true        | Whether to compress with gzip      |
| `Verbose`      | Switch  | false       | Enable verbose logging             |

### restore-db.ps1 Parameters

| Parameter        | Type   | Default    | Description                           |
| ---------------- | ------ | ---------- | ------------------------------------- |
| `BackupFile`     | String | (required) | Path to backup file to restore        |
| `DatabaseName`   | String | (from env) | Override database name                |
| `CreateDatabase` | Switch | false      | Create database if it doesn't exist   |
| `DropExisting`   | Switch | false      | Drop existing database before restore |
| `Verbose`        | Switch | false      | Enable verbose logging                |

## File Naming Convention

Backup files are automatically named with timestamps and database information:

```text
luppa_backup_{database}_{host}_{timestamp}.sql[.gz]
luppa_backup_{database}_{host}_{timestamp}_schema.sql[.gz]
```

Examples:

- `luppa_backup_luppa_dev_localhost_20240129_143022.sql.gz`
- `luppa_backup_luppa_dev_localhost_20240129_143022_schema.sql.gz`

## Logging

Both scripts create detailed log files in the `logs` subdirectory of the output/backup directory:

- **Backup logs**: `{OutputDir}/logs/backup_{timestamp}.log`
- **Restore logs**: `{BackupDir}/logs/restore_{timestamp}.log`

Log files contain:

- Timestamped entries for all operations
- Configuration information
- Error details and stack traces
- Performance metrics (duration, file sizes)
- Summary information

## Common Use Cases

### Daily Backup Routine

```bash
# Create a full compressed backup
cd apps/api
pnpm run backup:db

# The backup will be saved as:
# ./backups/luppa_backup_luppa_dev_localhost_20240129_143022.sql.gz
```

### Development Database Reset

```bash
# 1. Create a backup of current state
cd apps/api
pnpm run backup:db

# 2. Restore from a clean backup (replaces existing database)
pnpm run restore:db:replace -- -BackupFile "./backups/clean_install.sql.gz"
```

### Schema Migration Testing

```bash
# 1. Create schema-only backup
cd apps/api
pnpm run backup:db:schema

# 2. Test migrations on a copy
pnpm run restore:db:create -- -BackupFile "./backups/schema_backup.sql.gz" -DatabaseName luppa_test

# 3. Run migrations against test database
DB_NAME=luppa_test pnpm run migration:run
```

### Production Backup (Air-gapped Environment)

```bash
# Create uncompressed backup for maximum compatibility
cd apps/api
POSTGRES_HOST=production-host POSTGRES_PORT=5432 pnpm run backup:db:uncompressed

# Copy backup file to secure storage location
cp ./backups/luppa_backup_*.sql /secure/backup/location/
```

## Docker Integration

The scripts work seamlessly with the Docker development environment defined in `config/docker-compose.dev.yml`:

### Default Docker Configuration

```yaml
# From config/docker-compose.dev.yml
postgres:
  ports:
    - '5433:5432' # Maps container port 5432 to host port 5433
  environment:
    POSTGRES_DB: luppa_dev
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: dev_password
```

### Environment Variables for Docker

```bash
# For connecting to Docker containers from host
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5433
export POSTGRES_DB=luppa_dev
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=dev_password
```

### Containerized Backup (Alternative)

You can also run backups from within the container:

```bash
# Execute backup from within the postgres container
docker exec luppa-postgres-dev pg_dump -U postgres -d luppa_dev > backup.sql

# Or with the API container
docker exec luppa-api-dev pwsh infrastructure/scripts/backup-db.ps1
```

## Error Handling

The scripts include comprehensive error handling:

### Common Error Scenarios

1. **pg_dump/psql not found**
   - Install PostgreSQL client tools
   - Ensure tools are in PATH

2. **Connection refused**
   - Verify database server is running
   - Check host and port configuration
   - Verify firewall settings

3. **Authentication failed**
   - Check username and password
   - Verify user permissions
   - Ensure password environment variable is set

4. **Permission denied on backup directory**
   - Ensure write permissions on output directory
   - Create directory if it doesn't exist

5. **Insufficient disk space**
   - Monitor available disk space
   - Use compression to reduce backup size
   - Implement backup rotation strategy

### Exit Codes

Both scripts use standard exit codes:

- `0` - Success
- `1` - Error (various causes, check logs for details)

## Security Considerations

### Password Handling

- Passwords are passed via environment variables to avoid command-line exposure
- `PGPASSWORD` environment variable is cleared after each operation
- Log files do not contain passwords (shown as `***`)

### File Permissions

- Backup files should be secured with appropriate file permissions
- Consider encrypting backup files for long-term storage
- Implement backup rotation to prevent disk space issues

### Network Security

- Use SSL connections for remote database connections
- Set `DB_SSL_MODE=require` for encrypted connections
- Consider VPN or other secure networking for production backups

## Backup Strategy Recommendations

### Development Environment

- **Frequency**: Before major changes, after successful migrations
- **Retention**: Keep last 5-10 backups, rotate older ones
- **Type**: Full backups for complete state preservation

### Industrial/Production Environment

- **Frequency**: Daily full backups, hourly incremental if supported
- **Retention**: Follow regulatory requirements (often 7+ years for industrial)
- **Type**: Both full and schema-only backups
- **Storage**: Multiple locations (local, network, offline)
- **Testing**: Regular restore testing to verify backup integrity

### Automated Backup Script Example

Create a cron job or scheduled task:

```bash
#!/bin/bash
# /etc/cron.daily/luppa-backup

cd /path/to/luppa/apps/api
pnpm run backup:db

# Rotate old backups (keep last 30 days)
find ./backups -name "luppa_backup_*.sql.gz" -mtime +30 -delete

# Log rotation
find ./backups/logs -name "backup_*.log" -mtime +7 -delete
```

## Troubleshooting

### Debug Mode

Run scripts with `-Verbose` parameter for detailed output:

```bash
pwsh infrastructure/scripts/backup-db.ps1 -Verbose
pwsh infrastructure/scripts/restore-db.ps1 -BackupFile backup.sql.gz -Verbose
```

### Manual Connection Testing

Test database connectivity manually:

```bash
# Set environment variables
export PGPASSWORD=dev_password

# Test connection
psql -h localhost -p 5433 -U postgres -d luppa_dev -c "SELECT version();"

# Test pg_dump
pg_dump -h localhost -p 5433 -U postgres -d luppa_dev --schema-only --table=pg_tables
```

### Log Analysis

Check log files for detailed error information:

```bash
# View latest backup log
ls -la ./backups/logs/backup_*.log | tail -1 | xargs cat

# View latest restore log
ls -la ./backups/logs/restore_*.log | tail -1 | xargs cat
```

## Integration with CI/CD

The backup scripts can be integrated into CI/CD pipelines:

### GitHub Actions Example

```yaml
- name: Create Database Backup
  run: |
    cd apps/api
    pnpm run backup:db
  env:
    POSTGRES_HOST: localhost
    POSTGRES_PORT: 5432
    POSTGRES_DB: luppa_test
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: test_password
```

### Pre-deployment Backup

```bash
# Before deploying changes
cd apps/api
pnpm run backup:db

# Store backup location for potential rollback
echo "Pre-deployment backup: $(ls -t ./backups/*.sql.gz | head -1)" > deployment.log
```

This comprehensive backup and restore system provides robust data protection for the Luppa Inventory System, suitable for both development and industrial production environments.
