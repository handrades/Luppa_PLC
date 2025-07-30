#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Database backup script for Luppa Inventory System

.DESCRIPTION
    This script creates timestamped backups of the PostgreSQL database using pg_dump.
    It supports both full database backups and schema-only backups, with proper error
    handling and logging for industrial environments.

.PARAMETER BackupType
    Type of backup to create: 'full' (default) or 'schema'

.PARAMETER OutputDir
    Directory to store backup files (default: ./backups)

.PARAMETER DatabaseName
    Database name to backup (overrides environment variable)

.PARAMETER Compress
    Whether to compress the backup with gzip (default: true)

.PARAMETER Verbose
    Enable verbose logging output

.EXAMPLE
    ./backup-db.ps1
    Creates a full compressed backup using environment variables

.EXAMPLE
    ./backup-db.ps1 -BackupType schema -Compress:$false
    Creates an uncompressed schema-only backup

.EXAMPLE
    ./backup-db.ps1 -DatabaseName luppa_prod -OutputDir /backups/production
    Creates a backup of specified database in custom directory

.NOTES
    - Requires pg_dump to be available (installed with PostgreSQL client tools)
    - Uses environment variables for database connection parameters
    - Creates timestamped backup files for easy identification
    - Supports both containerized and local PostgreSQL instances
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('full', 'schema')]
    [string]$BackupType = 'full',

    [Parameter(Mandatory = $false)]
    [string]$OutputDir = './backups',

    [Parameter(Mandatory = $false)]
    [string]$DatabaseName = '',

    [Parameter(Mandatory = $false)]
    [bool]$Compress = $true,

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
    
    # Check if pg_dump is available
    try {
        $pgDumpVersion = & pg_dump --version 2>$null
        Write-Log "Found pg_dump: $pgDumpVersion" -Level INFO
    } catch {
        Write-Log "pg_dump not found. Please install PostgreSQL client tools." -Level ERROR
        Write-Log "On Ubuntu/Debian: sudo apt-get install postgresql-client" -Level INFO
        Write-Log "On RHEL/CentOS: sudo yum install postgresql" -Level INFO
        Write-Log "On Windows: Install PostgreSQL or just the client tools" -Level INFO
        return $false
    }
    
    # Check if gzip is available (if compression requested)
    if ($Compress) {
        try {
            $gzipVersion = & gzip --version 2>$null
            Write-Log "Found gzip for compression" -Level INFO
        } catch {
            Write-Log "gzip not found but compression requested. Continuing without compression." -Level WARN
            $Compress = $false
        }
    }
    
    return $true
}

function Get-DatabaseConfig {
    Write-Log "Loading database configuration..." -Level INFO
    
    # Default values based on docker-compose.dev.yml
    $config = @{
        Host = $env:POSTGRES_HOST ?? $env:DB_HOST ?? 'localhost'
        Port = $env:POSTGRES_PORT ?? $env:DB_PORT ?? '5433'
        Database = $env:POSTGRES_DB ?? $env:DB_NAME ?? 'luppa_dev'
        Username = $env:POSTGRES_USER ?? $env:DB_USER ?? 'postgres'
        Password = $env:POSTGRES_PASSWORD ?? $env:DB_PASSWORD ?? 'dev_password'
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
    
    Write-Log "Testing database connection..." -Level INFO
    
    # Set password environment variable for pg_dump
    $env:PGPASSWORD = $Config.Password
    
    try {
        # Test connection with a simple query
        $testResult = & pg_dump --host=$($Config.Host) --port=$($Config.Port) --username=$($Config.Username) --dbname=$($Config.Database) --schema-only --no-owner --no-privileges --table=pg_tables --quiet 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Database connection successful" -Level SUCCESS
            return $true
        } else {
            Write-Log "Database connection failed: $testResult" -Level ERROR
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

function New-BackupDirectory {
    param([string]$Path)
    
    Write-Log "Ensuring backup directory exists: $Path" -Level INFO
    
    try {
        if (-not (Test-Path $Path)) {
            New-Item -ItemType Directory -Path $Path -Force | Out-Null
            Write-Log "Created backup directory: $Path" -Level SUCCESS
        }
        
        # Test write permissions
        $testFile = Join-Path $Path "test_$(Get-Date -Format 'yyyyMMdd_HHmmss').tmp"
        "test" | Out-File -FilePath $testFile -Force
        Remove-Item $testFile -Force
        
        Write-Log "Backup directory is writable" -Level SUCCESS
        return $true
    } catch {
        Write-Log "Failed to create or write to backup directory: $($_.Exception.Message)" -Level ERROR
        return $false
    }
}

function New-BackupFileName {
    param(
        [hashtable]$Config,
        [string]$BackupType,
        [bool]$Compress
    )
    
    $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $hostname = $Config.Host -replace '[^\w\-]', '_'
    $dbname = $Config.Database
    
    $baseFilename = "luppa_backup_${dbname}_${hostname}_${timestamp}"
    
    if ($BackupType -eq 'schema') {
        $baseFilename += "_schema"
    }
    
    $extension = if ($Compress) { ".sql.gz" } else { ".sql" }
    
    return $baseFilename + $extension
}

function Invoke-DatabaseBackup {
    param(
        [hashtable]$Config,
        [string]$BackupType,
        [string]$OutputFile,
        [bool]$Compress
    )
    
    Write-Log "Starting $BackupType backup to: $OutputFile" -Level INFO
    
    # Set password environment variable
    $env:PGPASSWORD = $Config.Password
    
    try {
        # Build pg_dump command arguments
        $pgDumpArgs = @(
            "--host=$($Config.Host)"
            "--port=$($Config.Port)"
            "--username=$($Config.Username)"
            "--dbname=$($Config.Database)"
            "--no-password"
            "--verbose"
            "--no-owner"
            "--no-privileges"
        )
        
        # Add backup type specific options
        if ($BackupType -eq 'schema') {
            $pgDumpArgs += "--schema-only"
            Write-Log "Performing schema-only backup" -Level INFO
        } elseif ($BackupType -eq 'data') {
            $pgDumpArgs += "--data-only"
            $pgDumpArgs += "--inserts"  # Use INSERT statements instead of COPY for better portability
            Write-Log "Performing data-only backup with INSERT statements" -Level INFO
        } else {
            # Full backup includes both schema and data by default
            Write-Log "Performing full backup with schema and data" -Level INFO
        }
        
        # Execute backup
        $backupStartTime = Get-Date
        
        if ($Compress) {
            Write-Log "Creating compressed backup..." -Level INFO
            & pg_dump @pgDumpArgs | gzip > $OutputFile
        } else {
            Write-Log "Creating uncompressed backup..." -Level INFO
            & pg_dump @pgDumpArgs > $OutputFile
        }
        
        $backupEndTime = Get-Date
        $duration = $backupEndTime - $backupStartTime
        
        if ($LASTEXITCODE -eq 0) {
            $fileSize = (Get-Item $OutputFile).Length
            $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
            
            Write-Log "Backup completed successfully!" -Level SUCCESS
            Write-Log "Duration: $($duration.ToString('mm\:ss'))" -Level SUCCESS
            Write-Log "File size: $fileSizeMB MB" -Level SUCCESS
            Write-Log "Output file: $OutputFile" -Level SUCCESS
            return $true
        } else {
            Write-Log "Backup failed with exit code: $LASTEXITCODE" -Level ERROR
            
            # Try to get more error details
            if (Test-Path $OutputFile) {
                $outputSize = (Get-Item $OutputFile).Length
                if ($outputSize -eq 0) {
                    Remove-Item $OutputFile -Force
                    Write-Log "Removed empty backup file" -Level INFO
                }
            }
            
            return $false
        }
    } catch {
        Write-Log "Backup failed with exception: $($_.Exception.Message)" -Level ERROR
        return $false
    } finally {
        # Clear password from environment
        Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}

function Write-BackupSummary {
    param(
        [string]$OutputFile,
        [bool]$Success
    )
    
    $endTime = Get-Date
    $totalDuration = $endTime - $Script:StartTime
    
    Write-Log "============ BACKUP SUMMARY ============" -Level INFO
    Write-Log "Start Time: $($Script:StartTime.ToString('yyyy-MM-dd HH:mm:ss'))" -Level INFO
    Write-Log "End Time: $($endTime.ToString('yyyy-MM-dd HH:mm:ss'))" -Level INFO
    Write-Log "Total Duration: $($totalDuration.ToString('mm\:ss'))" -Level INFO
    
    if ($Success) {
        Write-Log "Status: SUCCESS" -Level SUCCESS
        Write-Log "Backup File: $OutputFile" -Level SUCCESS
        
        if (Test-Path $OutputFile) {
            $fileInfo = Get-Item $OutputFile
            Write-Log "File Size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -Level SUCCESS
            Write-Log "Created: $($fileInfo.CreationTime.ToString('yyyy-MM-dd HH:mm:ss'))" -Level SUCCESS
        }
    } else {
        Write-Log "Status: FAILED" -Level ERROR
    }
    
    Write-Log "=======================================" -Level INFO
}

# Main execution
function Main {
    try {
        Write-Log "Starting Luppa PLC Database Backup Script" -Level INFO
        Write-Log "Backup Type: $BackupType" -Level INFO
        Write-Log "Output Directory: $OutputDir" -Level INFO
        Write-Log "Compression: $(if($Compress) {'Enabled'} else {'Disabled'})" -Level INFO
        
        # Create log file
        $logDir = Join-Path $OutputDir "logs"
        if (-not (Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }
        $Script:LogFile = Join-Path $logDir "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
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
        
        # Test database connection
        if (-not (Test-DatabaseConnection -Config $dbConfig)) {
            Write-Log "Database connection test failed" -Level ERROR
            exit 1
        }
        
        # Create backup directory
        if (-not (New-BackupDirectory -Path $OutputDir)) {
            Write-Log "Failed to create backup directory" -Level ERROR
            exit 1
        }
        
        # Generate backup filename
        $backupFileName = New-BackupFileName -Config $dbConfig -BackupType $BackupType -Compress $Compress
        $outputFile = Join-Path $OutputDir $backupFileName
        
        Write-Log "Generated backup filename: $backupFileName" -Level INFO
        
        # Perform backup
        $backupSuccess = Invoke-DatabaseBackup -Config $dbConfig -BackupType $BackupType -OutputFile $outputFile -Compress $Compress
        
        # Write summary
        Write-BackupSummary -OutputFile $outputFile -Success $backupSuccess
        
        if ($backupSuccess) {
            Write-Log "Database backup completed successfully!" -Level SUCCESS
            exit 0
        } else {
            Write-Log "Database backup failed!" -Level ERROR
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
