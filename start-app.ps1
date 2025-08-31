#!/usr/bin/env pwsh
# Quick start script for Luppa PLC Application
# Run this script to start the full application stack

param(
    [switch]$Build,
    [switch]$Reset,
    [switch]$Logs,
    [switch]$Status,
    [switch]$Stop
)

$ErrorActionPreference = "Stop"

# Set environment variables
$env:COMPOSE_PROJECT_NAME = "luppa-dev"
$env:ALLOWED_ORIGINS = "http://localhost:3011,http://localhost:3010,http://localhost:3100,http://localhost:3000,http://localhost:5173,http://localhost:4173"

function Write-Banner {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║     Luppa PLC Inventory System         ║" -ForegroundColor Cyan
    Write-Host "║         Development Environment        ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Start-Application {
    Write-Banner
    Write-Host "🚀 Starting application stack..." -ForegroundColor Green
    
    if ($Build) {
        Write-Host "📦 Building services..." -ForegroundColor Yellow
        docker compose -f config/docker-compose.dev.yml -p luppa-dev build
    }
    
    if ($Reset) {
        Write-Host "🔄 Resetting database..." -ForegroundColor Yellow
        docker compose -f config/docker-compose.dev.yml -p luppa-dev down -v
    }
    
    Write-Host "▶️  Starting services..." -ForegroundColor Cyan
    docker compose -f config/docker-compose.dev.yml -p luppa-dev up -d
    
    Write-Host ""
    Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Check health
    $healthy = $false
    $attempts = 0
    $maxAttempts = 30
    
    while (-not $healthy -and $attempts -lt $maxAttempts) {
        $attempts++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3010/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $healthy = $true
            }
        }
        catch {
            Write-Host "." -NoNewline
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Host ""
    
    if ($healthy) {
        Write-Host "✅ Application is running!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📍 Access Points:" -ForegroundColor Cyan
        Write-Host "   Main Application:  " -NoNewline
        Write-Host "http://localhost:3011" -ForegroundColor Green
        Write-Host "   API Health Check:  " -NoNewline
        Write-Host "http://localhost:3010/health" -ForegroundColor Green
        Write-Host "   Direct Frontend:   " -NoNewline
        Write-Host "http://localhost:3100" -ForegroundColor Green
        Write-Host "   Direct API:        " -NoNewline
        Write-Host "http://localhost:3010" -ForegroundColor Green
        Write-Host ""
        Write-Host "📚 Database Access:" -ForegroundColor Cyan
        Write-Host "   PostgreSQL:        localhost:5433" -ForegroundColor Gray
        Write-Host "   Database:          luppa_dev" -ForegroundColor Gray
        Write-Host "   Username:          postgres" -ForegroundColor Gray
        Write-Host "   Password:          dev_password" -ForegroundColor Gray
        Write-Host ""
        Write-Host "🔧 Useful Commands:" -ForegroundColor Cyan
        Write-Host "   View logs:         ./start-app.ps1 -Logs" -ForegroundColor Gray
        Write-Host "   Check status:      ./start-app.ps1 -Status" -ForegroundColor Gray
        Write-Host "   Stop application:  ./start-app.ps1 -Stop" -ForegroundColor Gray
        Write-Host "   Rebuild & start:   ./start-app.ps1 -Build" -ForegroundColor Gray
        Write-Host "   Reset & start:     ./start-app.ps1 -Reset" -ForegroundColor Gray
        
        # Run migrations and seed
        Write-Host ""
        Write-Host "🗄️  Setting up database..." -ForegroundColor Yellow
        
        # Run migrations
        Write-Host "   Running migrations..." -ForegroundColor Gray
        $migrationResult = docker compose -f config/docker-compose.dev.yml -p luppa-dev exec -T api npm run migration:run 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Database migration failed!" -ForegroundColor Red
            Write-Host $migrationResult -ForegroundColor Red
            exit 1
        }
        
        # Run seed
        Write-Host "   Seeding database..." -ForegroundColor Gray
        $seedResult = docker compose -f config/docker-compose.dev.yml -p luppa-dev exec -T api npm run seed 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Database seeding failed!" -ForegroundColor Red
            Write-Host $seedResult -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✅ Database ready!" -ForegroundColor Green
        
        if ($Logs) {
            Write-Host ""
            Write-Host "📜 Following logs (Ctrl+C to exit)..." -ForegroundColor Yellow
            docker compose -f config/docker-compose.dev.yml -p luppa-dev logs -f
        }
    }
    else {
        Write-Host "⚠️  Services are taking longer than expected to start." -ForegroundColor Yellow
        Write-Host "   Check logs with: docker compose -f config/docker-compose.dev.yml -p luppa-dev logs" -ForegroundColor Gray
    }
}

function Show-Status {
    Write-Banner
    Write-Host "📊 Service Status:" -ForegroundColor Cyan
    Write-Host ""
    docker compose -f config/docker-compose.dev.yml -p luppa-dev ps
    Write-Host ""
    
    # Check API health
    Write-Host "🏥 Health Check:" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3010/health" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ API is healthy" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "   ❌ API is not responding" -ForegroundColor Red
    }
    
    # Check frontend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3100" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Frontend is accessible" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "   ❌ Frontend is not responding" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "📍 Access Points:" -ForegroundColor Cyan
    Write-Host "   Main Application:  http://localhost:3011" -ForegroundColor Green
    Write-Host "   API Health Check:  http://localhost:3010/health" -ForegroundColor Green
}

function Stop-Application {
    Write-Banner
    Write-Host "🛑 Stopping application stack..." -ForegroundColor Yellow
    docker compose -f config/docker-compose.dev.yml -p luppa-dev down
    Write-Host "✅ Application stopped!" -ForegroundColor Green
}

function Show-Logs {
    Write-Banner
    Write-Host "📜 Showing logs (Ctrl+C to exit)..." -ForegroundColor Yellow
    docker compose -f config/docker-compose.dev.yml -p luppa-dev logs -f
}

# Main execution
if ($Stop) {
    Stop-Application
}
elseif ($Status) {
    Show-Status
}
elseif ($Logs) {
    Show-Logs
}
else {
    Start-Application
}
