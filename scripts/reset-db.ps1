#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Database reset and seeding script

.DESCRIPTION
    Resets the development database by:
    - Dropping all existing data
    - Running fresh migrations
    - Seeding with initial data
    - Running database health checks

.PARAMETER Confirm
    Skip confirmation prompt and proceed directly

.PARAMETER SkipSeed
    Skip seeding step after migrations

.EXAMPLE
    ./scripts/reset-db.ps1
    Interactive database reset with confirmation

.EXAMPLE
    ./scripts/reset-db.ps1 -Confirm
    Reset database without confirmation prompt
#>

param(
    [switch]$Confirm,
    [switch]$SkipSeed
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Color functions for output
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Blue }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }

function Test-DockerRunning {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Test-DatabaseContainer {
    try {
        $containers = docker-compose -f docker-compose.dev.yml ps --services --filter "status=running"
        return ($containers | Select-String "postgres|database" | Measure-Object).Count -gt 0
    }
    catch {
        return $false
    }
}

Write-Warning "Database Reset Script"
Write-Info "This will completely reset your development database!"

# Safety confirmation
if (-not $Confirm) {
    Write-Warning "⚠️  This action will:"
    Write-Warning "   • Drop all existing database data"
    Write-Warning "   • Run fresh migrations"
    if (-not $SkipSeed) {
        Write-Warning "   • Seed with initial development data"
    }
    Write-Warning ""
    $confirmation = Read-Host "Are you sure you want to continue? (yes/no)"
    
    if ($confirmation -ne "yes" -and $confirmation -ne "y") {
        Write-Info "Database reset cancelled"
        exit 0
    }
}

Write-Info "Starting database reset..."

# Check if Docker is running and database container is up
Write-Info "Checking database availability..."

if (-not (Test-DockerRunning)) {
    Write-Error "Docker is not running. Please start Docker and try again."
    exit 1
}

if (-not (Test-DatabaseContainer)) {
    Write-Info "Database container is not running. Starting Docker services..."
    try {
        docker-compose -f docker-compose.dev.yml up -d
        Write-Success "Docker services started"
        
        # Wait for database to be ready
        Write-Info "Waiting for database to be ready..."
        Start-Sleep -Seconds 15
    }
    catch {
        Write-Error "Failed to start Docker services: $_"
        exit 1
    }
}

# Reset database using TypeORM
Write-Info "Dropping existing database schema..."
try {
    # Navigate to API directory and run database commands
    Push-Location "apps/api"
    
    # Drop and recreate database schema
    npx typeorm schema:drop -d src/config/typeorm.config.ts
    Write-Success "Database schema dropped"
    
    # Run migrations
    Write-Info "Running database migrations..."
    npx typeorm migration:run -d src/config/typeorm.config.ts
    Write-Success "Database migrations completed"
    
    Pop-Location
}
catch {
    Pop-Location
    Write-Error "Failed to reset database schema: $_"
    exit 1
}

# Seed database with initial data
if (-not $SkipSeed) {
    Write-Info "Seeding database with initial data..."
    try {
        pnpm -C apps/api db:seed
        Write-Success "Database seeding completed"
    }
    catch {
        Write-Warning "Database seeding failed: $_"
        Write-Info "You may need to run seeding manually with: pnpm -C apps/api db:seed"
    }
}

# Run database health check
Write-Info "Running database health check..."
try {
    # Test API health endpoint which includes database connectivity
    $maxAttempts = 10
    $attempt = 0
    do {
        $attempt++
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 5
            if ($response.status -eq "ok" -and $response.database -eq "connected") {
                Write-Success "Database health check passed"
                break
            }
            else {
                throw "Health check returned: $($response | ConvertTo-Json)"
            }
        }
        catch {
            if ($attempt -eq $maxAttempts) {
                Write-Warning "Database health check failed after $maxAttempts attempts"
                Write-Info "Database may be ready but API might not be running"
                break
            }
            Write-Info "Waiting for API to be ready (attempt $attempt/$maxAttempts)..."
            Start-Sleep -Seconds 3
        }
    } while ($attempt -lt $maxAttempts)
}
catch {
    Write-Warning "Failed to run health check: $_"
    Write-Info "Database reset may have succeeded but API is not responding"
}

Write-Success "Database reset completed!"
Write-Info ""
Write-Info "Database has been reset with:"
Write-Info "  • Fresh schema from migrations"
if (-not $SkipSeed) {
    Write-Info "  • Initial seed data"
}
Write-Info ""
Write-Info "You can now:"
Write-Info "  • Start development with 'pnpm dev'"
Write-Info "  • Run tests with 'pnpm test'"
Write-Info "  • Check API health at http://localhost:3001/health"
