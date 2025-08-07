# Docker Swarm Deployment Script for Luppa PLC Inventory System
# PowerShell script for production deployment

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [switch]$Initialize,
    
    [Parameter(Mandatory=$false)]
    [switch]$Update,
    
    [Parameter(Mandatory=$false)]
    [switch]$Remove,
    
    [Parameter(Mandatory=$false)]
    [string]$Stack = "luppa"
)

# Configuration
$ErrorActionPreference = "Stop"
$StackFile = "docker-compose.swarm.yml"
$EnvFile = ".env.production"

Write-Host "Luppa PLC Inventory System - Docker Swarm Deployment" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Check if Docker Swarm is initialized
function Test-SwarmMode {
    try {
        $swarmInfo = docker info --format "{{.Swarm.LocalNodeState}}"
        return $swarmInfo -eq "active"
    }
    catch {
        return $false
    }
}

# Initialize Docker Swarm
function Initialize-Swarm {
    Write-Host "Initializing Docker Swarm..." -ForegroundColor Yellow
    
    if (Test-SwarmMode) {
        Write-Host "Docker Swarm is already initialized" -ForegroundColor Green
        return
    }
    
    docker swarm init
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to initialize Docker Swarm"
    }
    
    Write-Host "Docker Swarm initialized successfully" -ForegroundColor Green
}

# Create required directories
function Initialize-Directories {
    Write-Host "Creating required directories..." -ForegroundColor Yellow
    
    $directories = @(
        "/opt/luppa/data/postgres",
        "/opt/luppa/data/redis",
        "/opt/luppa/data/grafana",
        "/opt/luppa/data/prometheus"
    )
    
    foreach ($dir in $directories) {
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "Created directory: $dir" -ForegroundColor Green
        }
    }
}

# Label nodes for placement constraints
function Set-NodeLabels {
    Write-Host "Setting node labels for service placement..." -ForegroundColor Yellow
    
    # Get the current node ID
    $nodeId = docker node ls --filter "role=manager" --format "{{.ID}}" | Select-Object -First 1
    
    if ($nodeId) {
        # Set labels for data persistence
        docker node update --label-add postgres=true $nodeId
        docker node update --label-add redis=true $nodeId
        docker node update --label-add monitoring=true $nodeId
        
        Write-Host "Node labels set successfully" -ForegroundColor Green
    }
    else {
        Write-Warning "Could not determine manager node ID"
    }
}

# Create Docker secrets
function Initialize-Secrets {
    Write-Host "Creating Docker secrets..." -ForegroundColor Yellow
    
    # Check if secrets already exist
    $existingSecrets = docker secret ls --format "{{.Name}}"
    
    $secrets = @{
        "postgres-password" = "Enter PostgreSQL password"
        "redis-password" = "Enter Redis password"
        "jwt-secret" = "Enter JWT secret key"
    }
    
    foreach ($secretName in $secrets.Keys) {
        if ($existingSecrets -notcontains $secretName) {
            $secretValue = Read-Host -Prompt $secrets[$secretName] -AsSecureString
            $plainSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretValue))
            
            $plainSecret | docker secret create $secretName -
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Created secret: $secretName" -ForegroundColor Green
            }
            else {
                Write-Warning "Failed to create secret: $secretName"
            }
        }
        else {
            Write-Host "Secret already exists: $secretName" -ForegroundColor Yellow
        }
    }
    
    # Handle SSL certificates
    if ($existingSecrets -notcontains "ssl-cert") {
        $certPath = Read-Host -Prompt "Enter path to SSL certificate file (or press Enter to generate self-signed)"
        
        if ([string]::IsNullOrWhiteSpace($certPath)) {
            # Generate self-signed certificate
            Write-Host "Generating self-signed SSL certificate..." -ForegroundColor Yellow
            & "infrastructure/ssl/generate-self-signed-cert.sh"
            $certPath = "infrastructure/ssl/server.crt"
            $keyPath = "infrastructure/ssl/server.key"
        }
        else {
            $keyPath = Read-Host -Prompt "Enter path to SSL private key file"
        }
        
        if (Test-Path $certPath) {
            docker secret create ssl-cert $certPath
            Write-Host "Created SSL certificate secret" -ForegroundColor Green
        }
        
        if (Test-Path $keyPath) {
            docker secret create ssl-key $keyPath
            Write-Host "Created SSL private key secret" -ForegroundColor Green
        }
    }
}

# Deploy the stack
function Deploy-Stack {
    Write-Host "Deploying Docker stack: $Stack" -ForegroundColor Yellow
    
    if (!(Test-Path $StackFile)) {
        throw "Stack file not found: $StackFile"
    }
    
    $deployArgs = @("stack", "deploy")
    
    if (Test-Path $EnvFile) {
        $deployArgs += @("--env-file", $EnvFile)
        Write-Host "Using environment file: $EnvFile" -ForegroundColor Green
    }
    
    $deployArgs += @("--compose-file", $StackFile, $Stack)
    
    & docker @deployArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Stack deployed successfully" -ForegroundColor Green
    }
    else {
        throw "Failed to deploy stack"
    }
}

# Update the stack
function Update-Stack {
    Write-Host "Updating Docker stack: $Stack" -ForegroundColor Yellow
    Deploy-Stack
}

# Remove the stack
function Remove-Stack {
    Write-Host "Removing Docker stack: $Stack" -ForegroundColor Red
    
    $confirmation = Read-Host "Are you sure you want to remove the stack? (y/N)"
    if ($confirmation -eq "y" -or $confirmation -eq "Y") {
        docker stack rm $Stack
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Stack removed successfully" -ForegroundColor Green
        }
        else {
            Write-Warning "Failed to remove stack"
        }
    }
    else {
        Write-Host "Stack removal cancelled" -ForegroundColor Yellow
    }
}

# Show stack status
function Show-StackStatus {
    Write-Host "Stack Status:" -ForegroundColor Cyan
    docker stack services $Stack
    
    Write-Host "`nService Details:" -ForegroundColor Cyan
    docker stack ps $Stack --no-trunc
}

# Main execution
try {
    # Ensure we're in the correct directory
    if (!(Test-Path $StackFile)) {
        Set-Location "infrastructure/swarm"
    }
    
    # Initialize Swarm if requested
    if ($Initialize) {
        Initialize-Swarm
        Initialize-Directories
        Set-NodeLabels
        Initialize-Secrets
        Deploy-Stack
        Show-StackStatus
        
        Write-Host "`nDeployment completed successfully!" -ForegroundColor Green
        Write-Host "Access the application at: https://localhost" -ForegroundColor Cyan
        Write-Host "Access Grafana monitoring at: https://localhost/grafana" -ForegroundColor Cyan
        return
    }
    
    # Update stack if requested
    if ($Update) {
        if (!(Test-SwarmMode)) {
            throw "Docker Swarm is not initialized. Use -Initialize first."
        }
        
        Update-Stack
        Show-StackStatus
        return
    }
    
    # Remove stack if requested
    if ($Remove) {
        Remove-Stack
        return
    }
    
    # Default action: show status
    if (Test-SwarmMode) {
        Show-StackStatus
    }
    else {
        Write-Host "Docker Swarm is not initialized." -ForegroundColor Yellow
        Write-Host "Use: .\deploy.ps1 -Initialize" -ForegroundColor Cyan
    }
}
catch {
    Write-Error "Deployment failed: $($_.Exception.Message)"
    exit 1
}
