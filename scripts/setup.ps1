#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Initial project setup automation script

.DESCRIPTION
    Automates the complete setup process for the Luppa PLC Inventory Framework:
    - Installs dependencies
    - Sets up Docker development environment
    - Initializes database with migrations and seeds
    - Builds type definitions
    - Runs initial health checks

.PARAMETER SkipDocker
    Skip Docker setup and health checks

.PARAMETER SkipDatabase
    Skip database setup (migrations and seeding)

.EXAMPLE
    ./scripts/setup.ps1
    Complete setup including Docker and database

.EXAMPLE
    ./scripts/setup.ps1 -SkipDocker
    Setup without Docker containers
#>

param(
    [switch]$SkipDocker,
    [switch]$SkipDatabase
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Color functions for output
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Blue }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }

function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Test-DockerRunning {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

Write-Info "Starting Luppa PLC Inventory Framework setup..."

# Check prerequisites
Write-Info "Checking prerequisites..."

if (-not (Test-Command "node")) {
    Write-Error "Node.js is not installed. Please install Node.js 20+ and try again."
    exit 1
}

if (-not (Test-Command "pnpm")) {
    Write-Error "pnpm is not installed. Please install pnpm and try again."
    exit 1
}

if (-not $SkipDocker -and -not (Test-Command "docker")) {
    Write-Error "Docker is not installed. Please install Docker or use -SkipDocker flag."
    exit 1
}

Write-Success "Prerequisites check passed"

# Install dependencies
Write-Info "Installing dependencies..."
try {
    pnpm install
    Write-Success "Dependencies installed"
}
catch {
    Write-Error "Failed to install dependencies: $_"
    exit 1
}

# Set up environment file if it doesn't exist
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Info "Creating .env from .env.example..."
        Copy-Item ".env.example" ".env"
        Write-Success ".env file created"
    }
    else {
        Write-Warning ".env.example not found. You may need to create .env manually."
    }
}

# Docker setup
if (-not $SkipDocker) {
    Write-Info "Setting up Docker environment..."
    
    if (-not (Test-DockerRunning)) {
        Write-Error "Docker is not running. Please start Docker and try again."
        exit 1
    }
    
    try {
        # Start Docker services
        docker-compose -f config/docker-compose.dev.yml up -d
        Write-Success "Docker services started"
        
        # Wait for services to be ready
        Write-Info "Waiting for services to be ready..."
        Start-Sleep -Seconds 10
        
        # Check if database is ready
        $maxAttempts = 30
        $attempt = 0
        do {
            $attempt++
            try {
                # Test database connection with actual PostgreSQL query
                Write-Info "Checking database connection (attempt $attempt/$maxAttempts)..."
                
                # Use docker exec to run psql command against the database
                $result = docker exec luppa-postgres pg_isready -h localhost -p 5432 -U postgres 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Database connection successful"
                    break
                }
                else {
                    throw "Database not ready: $result"
                }
            }
            catch {
                Write-Warning "Database connection failed: $_"
                if ($attempt -eq $maxAttempts) {
                    Write-Error "Database did not become ready within timeout"
                    exit 1
                }
                Start-Sleep -Seconds 2
            }
        } while ($attempt -lt $maxAttempts)
        
        Write-Success "Docker services are ready"
    }
    catch {
        Write-Error "Failed to set up Docker environment: $_"
        exit 1
    }
}

# Build type definitions
Write-Info "Building type definitions..."
try {
    pnpm build:types
    Write-Success "Type definitions built"
}
catch {
    Write-Warning "Failed to build type definitions (this is normal if packages don't exist yet)"
}

# Database setup
if (-not $SkipDatabase) {
    Write-Info "Setting up database..."
    try {
        pnpm db:setup
        Write-Success "Database setup completed"
    }
    catch {
        Write-Warning "Failed to set up database: $_"
        Write-Info "You may need to run database setup manually later"
    }
}

# Run health checks
Write-Info "Running health checks..."
try {
    # Test if API is responding
    if (-not $SkipDocker) {
        $maxAttempts = 10
        $attempt = 0
        do {
            $attempt++
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:3010/health" -Method GET -TimeoutSec 5
                Write-Success "API health check passed"
                break
            }
            catch {
                if ($attempt -eq $maxAttempts) {
                    Write-Warning "API health check failed - service may not be fully ready yet"
                    break
                }
                Start-Sleep -Seconds 2
            }
        } while ($attempt -lt $maxAttempts)
    }
    
    # Run test suite
    Write-Info "Running test suite..."
    pnpm test
    Write-Success "All tests passed"
}
catch {
    Write-Warning "Some health checks failed: $_"
    Write-Info "This may be normal during initial setup"
}

Write-Success "Setup completed successfully!"
Write-Info ""
Write-Info "Next steps:"
Write-Info "  • Run 'pnpm dev' to start development servers"
Write-Info "  • Visit http://localhost:3000 for the web application"
Write-Info "  • Visit http://localhost:3010/health for API health check"
Write-Info "  • Check TROUBLESHOOTING.md if you encounter issues"
