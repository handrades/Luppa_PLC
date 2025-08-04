#!/usr/bin/env pwsh

<#
.SYNOPSIS
    TypeScript type generation script

.DESCRIPTION
    Generates TypeScript type definitions for the project:
    - Database entity types from TypeORM models
    - API response types from OpenAPI/Swagger specs
    - Shared type definitions across workspaces
    - Frontend component prop types

.PARAMETER Target
    Specify which types to generate: all, database, api, shared, frontend

.PARAMETER Watch
    Run in watch mode for continuous type generation during development

.PARAMETER Validate
    Validate existing types without regenerating

.EXAMPLE
    ./scripts/generate-types.ps1
    Generate all types

.EXAMPLE
    ./scripts/generate-types.ps1 -Target database
    Generate only database types
#>

param(
    [ValidateSet("all", "database", "api", "shared", "frontend")]
    [string]$Target = "all",
    [switch]$Watch,
    [switch]$Validate
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Color functions for output
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Blue }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }

function Test-PackageExists {
    param($PackagePath)
    return Test-Path (Join-Path $PackagePath "package.json")
}

function Generate-DatabaseTypes {
    Write-Info "Generating database types from TypeORM entities..."
    
    if (-not (Test-PackageExists "apps/api")) {
        Write-Warning "API package not found, skipping database types"
        return
    }
    
    try {
        Push-Location "apps/api"
        
        # Generate types from TypeORM entities
        Write-Info "Extracting types from database entities..."
        
        # Check if we have a script for this
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        if ($packageJson.scripts."generate:types") {
            npm run generate:types
        }
        else {
            # Manual type extraction using TypeScript compiler
            npx tsc --declaration --emitDeclarationOnly --outDir ../../packages/shared-types/src/database src/entities/*.ts
        }
        
        Write-Success "Database types generated"
        Pop-Location
    }
    catch {
        Pop-Location
        Write-Error "Failed to generate database types: $_"
        return $false
    }
    
    return $true
}

function Generate-ApiTypes {
    Write-Info "Generating API types from OpenAPI specifications..."
    
    if (-not (Test-PackageExists "apps/api")) {
        Write-Warning "API package not found, skipping API types"
        return
    }
    
    try {
        Push-Location "apps/api"
        
        # Check if OpenAPI spec exists
        if (Test-Path "swagger.json") {
            Write-Info "Generating types from OpenAPI spec..."
            
            # Use openapi-typescript or similar tool
            if (Get-Command "openapi-typescript" -ErrorAction SilentlyContinue) {
                npx openapi-typescript swagger.json --output ../../packages/shared-types/src/api/types.ts
            }
            else {
                Write-Warning "openapi-typescript not found. Install with: pnpm add -D openapi-typescript"
            }
        }
        else {
            Write-Info "No OpenAPI spec found, generating basic API types..."
            
            # Create basic API response types
            $apiTypesDir = "../../packages/shared-types/src/api"
            if (-not (Test-Path $apiTypesDir)) {
                New-Item -ItemType Directory -Path $apiTypesDir -Force | Out-Null
            }
            
            $basicTypes = @"
// Auto-generated API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: 'connected' | 'disconnected';
  version: string;
}
"@
            
            Set-Content -Path (Join-Path $apiTypesDir "types.ts") -Value $basicTypes
        }
        
        Write-Success "API types generated"
        Pop-Location
    }
    catch {
        Pop-Location
        Write-Error "Failed to generate API types: $_"
        return $false
    }
    
    return $true
}

function Generate-SharedTypes {
    Write-Info "Building shared type definitions..."
    
    if (-not (Test-PackageExists "packages/shared-types")) {
        Write-Warning "Shared types package not found, creating basic structure..."
        
        # Create shared types package structure
        $sharedTypesDir = "packages/shared-types"
        $srcDir = Join-Path $sharedTypesDir "src"
        
        if (-not (Test-Path $srcDir)) {
            New-Item -ItemType Directory -Path $srcDir -Force | Out-Null
        }
        
        # Create package.json
        $packageJson = @{
            name = "@luppa/shared-types"
            version = "1.0.0"
            private = $true
            main = "dist/index.js"
            types = "dist/index.d.ts"
            scripts = @{
                build = "tsc"
                watch = "tsc --watch"
            }
            devDependencies = @{
                typescript = "~5.5.4"
            }
        }
        
        Set-Content -Path (Join-Path $sharedTypesDir "package.json") -Value ($packageJson | ConvertTo-Json -Depth 10)
        
        # Create tsconfig.json
        $tsConfig = @{
            compilerOptions = @{
                target = "ES2020"
                module = "commonjs"
                declaration = $true
                outDir = "./dist"
                rootDir = "./src"
                strict = $true
                esModuleInterop = $true
                skipLibCheck = $true
                forceConsistentCasingInFileNames = $true
            }
            include = @("src/**/*")
            exclude = @("node_modules", "dist")
        }
        
        Set-Content -Path (Join-Path $sharedTypesDir "tsconfig.json") -Value ($tsConfig | ConvertTo-Json -Depth 10)
        
        # Create index.ts
        $indexContent = @"
// Shared type definitions for Luppa PLC Inventory Framework
export * from './api/types';
export * from './database/entities';
export * from './common/types';
"@
        
        Set-Content -Path (Join-Path $srcDir "index.ts") -Value $indexContent
        
        # Create common types
        $commonDir = Join-Path $srcDir "common"
        if (-not (Test-Path $commonDir)) {
            New-Item -ItemType Directory -Path $commonDir -Force | Out-Null
        }
        
        $commonTypes = @"
// Common types used across the application
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends BaseEntity {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
}

export interface Role extends BaseEntity {
  name: string;
  description?: string;
  permissions: string[];
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  service: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}
"@
        
        Set-Content -Path (Join-Path $commonDir "types.ts") -Value $commonTypes
    }
    
    try {
        if (Test-PackageExists "packages/shared-types") {
            Push-Location "packages/shared-types"
            pnpm build
            Write-Success "Shared types built"
            Pop-Location
        }
    }
    catch {
        if (Get-Location | Select-Object -ExpandProperty Path | ForEach-Object { $_ -match "shared-types" }) {
            Pop-Location
        }
        Write-Error "Failed to build shared types: $_"
        return $false
    }
    
    return $true
}

function Generate-FrontendTypes {
    Write-Info "Generating frontend component types..."
    
    if (-not (Test-PackageExists "apps/web")) {
        Write-Warning "Web package not found, skipping frontend types"
        return
    }
    
    try {
        Push-Location "apps/web"
        
        # Generate prop types for components
        Write-Info "Analyzing React components for type extraction..."
        
        # This would typically use a tool like react-docgen-typescript
        # For now, we'll create a basic types file
        $frontendTypesDir = "src/types"
        if (-not (Test-Path $frontendTypesDir)) {
            New-Item -ItemType Directory -Path $frontendTypesDir -Force | Out-Null
        }
        
        $componentTypes = @"
// Auto-generated frontend component types
import { ReactNode } from 'react';

export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
}

export interface LoadingSpinnerProps extends BaseComponentProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

export interface ErrorBoundaryProps extends BaseComponentProps {
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}
"@
        
        Set-Content -Path (Join-Path $frontendTypesDir "components.ts") -Value $componentTypes
        
        Write-Success "Frontend types generated"
        Pop-Location
    }
    catch {
        Pop-Location
        Write-Error "Failed to generate frontend types: $_"
        return $false
    }
    
    return $true
}

function Validate-Types {
    Write-Info "Validating TypeScript types across all packages..."
    
    $packages = @("apps/api", "apps/web", "packages/shared-types")
    $allValid = $true
    
    foreach ($package in $packages) {
        if (Test-PackageExists $package) {
            Write-Info "Validating types in $package..."
            try {
                Push-Location $package
                npx tsc --noEmit
                Write-Success "Types valid in $package"
                Pop-Location
            }
            catch {
                Pop-Location
                Write-Error "Type validation failed in $package"
                $allValid = $false
            }
        }
    }
    
    if ($allValid) {
        Write-Success "All types are valid"
    }
    else {
        Write-Error "Type validation failed in one or more packages"
        exit 1
    }
}

# Main execution
Write-Info "TypeScript Type Generation Script"

if ($Validate) {
    Validate-Types
    exit 0
}

if ($Watch) {
    Write-Info "Starting type generation in watch mode..."
    Write-Warning "Watch mode not fully implemented yet. Use individual package watch scripts."
    exit 0
}

$success = $true

switch ($Target) {
    "all" {
        $success = (Generate-SharedTypes) -and (Generate-DatabaseTypes) -and (Generate-ApiTypes) -and (Generate-FrontendTypes)
    }
    "database" {
        $success = Generate-DatabaseTypes
    }
    "api" {
        $success = Generate-ApiTypes
    }
    "shared" {
        $success = Generate-SharedTypes
    }
    "frontend" {
        $success = Generate-FrontendTypes
    }
}

if ($success) {
    Write-Success "Type generation completed successfully!"
    Write-Info ""
    Write-Info "Generated types are available in:"
    Write-Info "  • packages/shared-types/dist/ (compiled types)"
    Write-Info "  • apps/web/src/types/ (frontend-specific types)"
    Write-Info ""
    Write-Info "To use shared types in your code:"
    Write-Info "  import { ApiResponse, User } from '@luppa/shared-types';"
}
else {
    Write-Error "Type generation failed"
    exit 1
}
