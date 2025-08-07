#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Database restore script for Luppa Inventory System

.DESCRIPTION
    This script restores PostgreSQL database backups created by backup-db.ps1.
    It supports both compressed and uncompressed SQL files with proper error
    handling and logging for industrial environments.

.PARAMETER BackupFile
    Path to the backup file to restore (required)

.PARAMETER DatabaseName
    Database name to restore to (overrides environment variable)

.PARAMETER CreateDatabase
    Whether to create the database if it doesn't exist (default: false)

.PARAMETER DropExisting
    Whether to drop existing database before restore (default: false)

.PARAMETER Verbose
    Enable verbose logging output

.EXAMPLE
    ./restore-db.ps1 -BackupFile ./backups/luppa_backup_20240129_143022.sql.gz
    Restores a compressed backup to the default database

.EXAMPLE
    ./restore-db.ps1 -BackupFile ./backups/luppa_backup_schema.sql -CreateDatabase -DropExisting
    Restores a schema backup, dropping and recreating the database

.EXAMPLE
    ./restore-db.ps1 -BackupFile backup.sql -DatabaseName luppa_test
    Restores to a specific database name

.NOTES
    - Requires psql to be available (installed with PostgreSQL client tools)
    - Uses environment variables for database connection parameters
    - Supports both compressed (.gz) and uncompressed (.sql) files
    - Includes safety checks to prevent accidental data loss
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,

    [Parameter(Mandatory = $false)]
    [string]$DatabaseName = '',

    [Parameter(Mandatory = $false)]
    [switch]$CreateDatabase,

    [Parameter(Mandatory = $false)]
    [switch]$DropExisting,

    [Parameter(Mandatory = $false)]
    [switch]$Verbose
)

# Set error action preference
$ErrorActionPreference = 'Stop'

# Enable verbose output if requested
if ($Verbose) {
    $VerbosePreference = 'Continue'
}

# Script configuration
$Script:LogFile = $null
$Script:StartTime = Get-Date

# Logging functions
function Write-Log {
    param(
        [string]$Message,
        [ValidateSet('INFO', 'WARN', 'ERROR', 'SUCCESS')]
        [string]$Level = 'INFO'
    )
    
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Write to console with colors
    switch ($Level) {
        'ERROR' { Write-Host $logEntry -ForegroundColor Red }
        'WARN' { Write-Host $logEntry -ForegroundColor Yellow }
        'SUCCESS' { Write-Host $logEntry -ForegroundColor Green }
        default { Write-Host $logEntry }
    }
    
    # Write to log file if available
    if ($Script:LogFile) {
        try {
            Add-Content -Path $Script:LogFile -Value $logEntry -ErrorAction SilentlyContinue
        } catch {
            # Ignore log file write errors to prevent infinite loops
        }
    }
}

function Test-Prerequisites {
    Write-Log "Checking prerequisites..." -Level INFO
    
    # Check if psql is available
    try {
        $psqlVersion = & psql --version 2>$null
        Write-Log "Found psql: $psqlVersion" -Level INFO
    } catch {
        Write-Log "psql not found. Please install PostgreSQL client tools." -Level ERROR
        Write-Log "On Ubuntu/Debian: sudo apt-get install postgresql-client" -Level INFO
        Write-Log "On RHEL/CentOS: sudo yum install postgresql" -Level INFO
        Write-Log "On Windows: Install PostgreSQL or just the client tools" -Level INFO
        return $false
    }
    
    # Check if backup file exists
    if (-not (Test-Path $BackupFile)) {
        Write-Log "Backup file not found: $BackupFile" -Level ERROR
        return $false
    }
    
    # Check if backup file is readable
    try {
        $fileInfo = Get-Item $BackupFile
        Write-Log "Backup file found: $($fileInfo.FullName)" -Level INFO
        Write-Log "File size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -Level INFO
        Write-Log "Created: $($fileInfo.CreationTime.ToString('yyyy-MM-dd HH:mm:ss'))" -Level INFO
        
        # Check if file is compressed
        if ($BackupFile -match '\.gz$') {
            Write-Log "Detected compressed backup file" -Level INFO
            # Check if gzip is available
            try {
                & gzip --version *> $null
                Write-Log "gzip available for decompression" -Level INFO
            } catch {
                Write-Log "gzip not found but compressed file provided" -Level ERROR
                return $false
            }
        }
        
    } catch {
        Write-Log "Cannot read backup file: $($_.Exception.Message)" -Level ERROR
        return $false
    }
    
    return $true
}

function Get-DatabaseConfig {
    Write-Log "Loading database configuration..." -Level INFO
    
    # Default values based on config/docker-compose.dev.yml
    $config = @{
        Host = $env:POSTGRES_HOST ?? $env:DB_HOST ?? 'localhost'
        Port = $env:POSTGRES_PORT ?? $env:DB_PORT ?? '5433'
        Database = $env:POSTGRES_DB ?? $env:DB_NAME ?? 'luppa_dev'
        Username = $env:POSTGRES_USER ?? $env:DB_USER ?? 'postgres'
        Password = $env:POSTGRES_PASSWORD ?? $env:DB_PASSWORD ?? 'dev_password'
        AdminDatabase = 'postgres'  # For creating/dropping databases
    }
    
    # Override database name if provided as parameter
    if ($DatabaseName) {
        $config.Database = $DatabaseName
        Write-Log "Using database name from parameter: $DatabaseName" -Level INFO
    }
    
    # Validate configuration
    if (-not $config.Host -or -not $config.Port -or -not $config.Database -or -not $config.Username) {
        Write-Log "Incomplete database configuration. Required environment variables:" -Level ERROR
        Write-Log "  POSTGRES_HOST or DB_HOST (current: $($config.Host))" -Level ERROR
        Write-Log "  POSTGRES_PORT or DB_PORT (current: $($config.Port))" -Level ERROR
        Write-Log "  POSTGRES_DB or DB_NAME (current: $($config.Database))" -Level ERROR
        Write-Log "  POSTGRES_USER or DB_USER (current: $($config.Username))" -Level ERROR
        Write-Log "  POSTGRES_PASSWORD or DB_PASSWORD (current: $(if($config.Password) {'***'} else {'NOT SET'}))" -Level ERROR
        return $null
    }
    
    Write-Log "Database configuration loaded:" -Level INFO
    Write-Log "  Host: $($config.Host)" -Level INFO
    Write-Log "  Port: $($config.Port)" -Level INFO
    Write-Log "  Database: $($config.Database)" -Level INFO
    Write-Log "  Username: $($config.Username)" -Level INFO
    Write-Log "  Password: $(if($config.Password) {'***'} else {'NOT SET'})" -Level INFO
    
    return $config
}

function Test-DatabaseConnection {
    param([hashtable]$Config)
    
    Write-Log "Testing database server connection..." -Level INFO
    
    # Set password environment variable
    $env:PGPASSWORD = $Config.Password
    
    try {
        # Test connection to admin database first
        $testResult = & psql --host=$($Config.Host) --port=$($Config.Port) --username=$($Config.Username) --dbname=$($Config.AdminDatabase) --command="SELECT version();" --quiet --tuples-only 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Database server connection successful" -Level SUCCESS
            return $true
        } else {
            Write-Log "Database server connection failed: $testResult" -Level ERROR
            return $false
        }
    } catch {
        Write-Log "Database connection test failed: $($_.Exception.Message)" -Level ERROR
        return $false
    } finally {
        # Clear password from environment
        Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Test-DatabaseExists {
    param([hashtable]$Config)
    
    Write-Log "Checking if database '$($Config.Database)' exists..." -Level INFO
    
    # Set password environment variable
    $env:PGPASSWORD = $Config.Password
    
    try {
        $query = "SELECT 1 FROM pg_database WHERE datname = '$($Config.Database)';"
        $result = & psql --host=$($Config.Host) --port=$($Config.Port) --username=$($Config.Username) --dbname=$($Config.AdminDatabase) --command=$query --quiet --tuples-only 2>&1
        
        if ($LASTEXITCODE -eq 0 -and $result.Trim() -eq '1') {
            Write-Log "Database '$($Config.Database)' exists" -Level INFO
            return $true
        } else {
            Write-Log "Database '$($Config.Database)' does not exist" -Level INFO
            return $false
        }
    } catch {
        Write-Log "Failed to check database existence: $($_.Exception.Message)" -Level ERROR
        return $false
    } finally {
        # Clear password from environment
        Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function New-Database {
    param([hashtable]$Config)
    
    Write-Log "Creating database '$($Config.Database)'..." -Level INFO
    
    # Set password environment variable
    $env:PGPASSWORD = $Config.Password
    
    try {
        $createCommand = "CREATE DATABASE `"$($Config.Database)`" WITH OWNER = '$($Config.Username)' ENCODING = 'UTF8';"
        $result = & psql --host=$($Config.Host) --port=$($Config.Port) --username=$($Config.Username) --dbname=$($Config.AdminDatabase) --command=$createCommand 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Database '$($Config.Database)' created successfully" -Level SUCCESS
            return $true
        } else {
            Write-Log "Failed to create database: $result" -Level ERROR
            return $false
        }
    } catch {
        Write-Log "Database creation failed: $($_.Exception.Message)" -Level ERROR
        return $false
    } finally {
        # Clear password from environment
        Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Remove-Database {
    param([hashtable]$Config)
    
    Write-Log "WARNING: Dropping database '$($Config.Database)'..." -Level WARN
    
    # Safety confirmation
    if (-not $DropExisting) {
        Write-Log "DropExisting parameter not specified. Skipping database drop." -Level INFO
        return $false
    }
    
    # Set password environment variable
    $env:PGPASSWORD = $Config.Password
    
    try {
        # Terminate active connections first
        $terminateCommand = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$($Config.Database)' AND pid <> pg_backend_pid();"
        & psql --host=$($Config.Host) --port=$($Config.Port) --username=$($Config.Username) --dbname=$($Config.AdminDatabase) --command=$terminateCommand --quiet 2>&1 | Out-Null
        
        # Drop the database
        $dropCommand = "DROP DATABASE IF EXISTS `"$($Config.Database)`";"
        $result = & psql --host=$($Config.Host) --port=$($Config.Port) --username=$($Config.Username) --dbname=$($Config.AdminDatabase) --command=$dropCommand 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Database '$($Config.Database)' dropped successfully" -Level SUCCESS
            return $true
        } else {
            Write-Log "Failed to drop database: $result" -Level ERROR
            return $false
        }
    } catch {
        Write-Log "Database drop failed: $($_.Exception.Message)" -Level ERROR
        return $false
    } finally {
        # Clear password from environment
        Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Invoke-DatabaseRestore {
    param(
        [hashtable]$Config,
        [string]$BackupFile
    )
    
    Write-Log "Starting database restore from: $BackupFile" -Level INFO
    
    # Set password environment variable
    $env:PGPASSWORD = $Config.Password
    
    try {
        # Build psql command arguments
        $psqlArgs = @(
            "--host=$($Config.Host)"
            "--port=$($Config.Port)"
            "--username=$($Config.Username)"
            "--dbname=$($Config.Database)"
            "--quiet"
            "--single-transaction"  # All-or-nothing restore
        )
        
        # Execute restore
        $restoreStartTime = Get-Date
        
        if ($BackupFile -match '\.gz$') {
            Write-Log "Restoring from compressed backup..." -Level INFO
            & gzip -dc $BackupFile | & psql @psqlArgs
        } else {
            Write-Log "Restoring from uncompressed backup..." -Level INFO
            & psql @psqlArgs --file=$BackupFile
        }
        
        $restoreEndTime = Get-Date
        $duration = $restoreEndTime - $restoreStartTime
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Database restore completed successfully!" -Level SUCCESS
            Write-Log "Duration: $($duration.ToString('mm\:ss'))" -Level SUCCESS
            return $true
        } else {
            Write-Log "Database restore failed with exit code: $LASTEXITCODE" -Level ERROR
            return $false
        }
    } catch {
        Write-Log "Database restore failed with exception: $($_.Exception.Message)" -Level ERROR
        return $false
    } finally {
        # Clear password from environment
        Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Write-RestoreSummary {
    param(
        [string]$BackupFile,
        [bool]$Success
    )
    
    $endTime = Get-Date
    $totalDuration = $endTime - $Script:StartTime
    
    Write-Log "============ RESTORE SUMMARY ============" -Level INFO
    Write-Log "Start Time: $($Script:StartTime.ToString('yyyy-MM-dd HH:mm:ss'))" -Level INFO
    Write-Log "End Time: $($endTime.ToString('yyyy-MM-dd HH:mm:ss'))" -Level INFO
    Write-Log "Total Duration: $($totalDuration.ToString('mm\:ss'))" -Level INFO
    Write-Log "Backup File: $BackupFile" -Level INFO
    
    if ($Success) {
        Write-Log "Status: SUCCESS" -Level SUCCESS
    } else {
        Write-Log "Status: FAILED" -Level ERROR
    }
    
    Write-Log "=========================================" -Level INFO
}

# Main execution
function Main {
    try {
        Write-Log "Starting Luppa PLC Database Restore Script" -Level INFO
        Write-Log "Backup File: $BackupFile" -Level INFO
        Write-Log "Create Database: $(if($CreateDatabase) {'Yes'} else {'No'})" -Level INFO
        Write-Log "Drop Existing: $(if($DropExisting) {'Yes'} else {'No'})" -Level INFO
        
        # Create log file
        $logDir = Split-Path $BackupFile -Parent
        if ($logDir) {
            $logDir = Join-Path $logDir "logs"
        } else {
            $logDir = "./logs"
        }
        
        if (-not (Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }
        $Script:LogFile = Join-Path $logDir "restore_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
        Write-Log "Log file: $($Script:LogFile)" -Level INFO
        
        # Check prerequisites
        if (-not (Test-Prerequisites)) {
            Write-Log "Prerequisites check failed" -Level ERROR
            exit 1
        }
        
        # Get database configuration
        $dbConfig = Get-DatabaseConfig
        if (-not $dbConfig) {
            Write-Log "Database configuration failed" -Level ERROR
            exit 1
        }
        
        # Test database server connection
        if (-not (Test-DatabaseConnection -Config $dbConfig)) {
            Write-Log "Database server connection test failed" -Level ERROR
            exit 1
        }
        
        # Check if database exists
        $databaseExists = Test-DatabaseExists -Config $dbConfig
        
        # Handle database creation/dropping
        if ($DropExisting -and $databaseExists) {
            if (-not (Remove-Database -Config $dbConfig)) {
                Write-Log "Failed to drop existing database" -Level ERROR
                exit 1
            }
            $databaseExists = $false
        }
        
        if (-not $databaseExists) {
            if ($CreateDatabase) {
                if (-not (New-Database -Config $dbConfig)) {
                    Write-Log "Failed to create database" -Level ERROR
                    exit 1
                }
            } else {
                Write-Log "Database '$($dbConfig.Database)' does not exist and CreateDatabase not specified" -Level ERROR
                Write-Log "Use -CreateDatabase parameter to create the database automatically" -Level INFO
                exit 1
            }
        }
        
        # Perform restore
        $restoreSuccess = Invoke-DatabaseRestore -Config $dbConfig -BackupFile $BackupFile
        
        # Write summary
        Write-RestoreSummary -BackupFile $BackupFile -Success $restoreSuccess
        
        if ($restoreSuccess) {
            Write-Log "Database restore completed successfully!" -Level SUCCESS
            exit 0
        } else {
            Write-Log "Database restore failed!" -Level ERROR
            exit 1
        }
        
    } catch {
        Write-Log "Script execution failed: $($_.Exception.Message)" -Level ERROR
        Write-Log "Stack trace: $($_.ScriptStackTrace)" -Level ERROR
        exit 1
    }
}

# Execute main function
Main
