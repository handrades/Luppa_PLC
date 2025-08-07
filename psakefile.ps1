# Psake build script for Luppa PLC Project
# This script contains all build and linting tasks

# Properties that can be overridden
Properties {
    $MarkdownFix = $false
}

# Parameters that can be passed between tasks
$script:MarkdownFixMode = $false

# Helper functions
function Test-Command {
    param($Command)
    try {
        if (Get-Command $Command -ErrorAction Stop) {
            return $true
        }
    }
    catch {
        return $false
    }
}

# Default task
Task Default -Depends Lint

# Main linting task that runs all linters and tests
Task Lint -Depends LintMarkdown, LintJson, LintYaml, LintTypeScript, CheckNewlines, CheckSecurity, CheckApiHealth, Test {
    Write-Host "`nAll linting checks and tests completed! ✓" -ForegroundColor Green
}

# Markdown linting task
Task LintMarkdown {
    Write-Host "`nChecking Markdown files..." -ForegroundColor Cyan
    
    if (-not (Test-Command "markdownlint")) {
        throw "markdownlint not found. Install with: npm install -g markdownlint-cli"
    }
    
    $mdFiles = Get-ChildItem -Path $PSScriptRoot -Filter "*.md" -Recurse | 
               Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.bmad-core*" }
    
    if ($mdFiles.Count -eq 0) {
        Write-Host "No markdown files found to lint" -ForegroundColor Cyan
        return
    }
    
    Write-Host "Found $($mdFiles.Count) markdown files" -ForegroundColor Cyan
    
    Push-Location $PSScriptRoot
    try {
        if ($script:MarkdownFixMode -or $MarkdownFix) {
            exec { markdownlint "**/*.md" --ignore "**/node_modules/**" --ignore "**/.bmad-core/**" --ignore "infrastructure/__tests__/node_modules/**" --config config/.markdownlint.json --fix } "Markdown linting with fixes failed"
        } else {
            exec { markdownlint "**/*.md" --ignore "**/node_modules/**" --ignore "**/.bmad-core/**" --ignore "infrastructure/__tests__/node_modules/**" --config config/.markdownlint.json } "Markdown linting failed"
        }
        Write-Host "✓ Markdown linting passed" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

# JSON linting task
Task LintJson {
    Write-Host "`nChecking JSON files..." -ForegroundColor Cyan
    
    if (-not (Test-Command "jsonlint")) {
        throw "jsonlint not found. Install with: npm install -g jsonlint"
    }
    
    $jsonFiles = Get-ChildItem -Path $PSScriptRoot -Filter "*.json" -Recurse -File | 
                 Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.bmad-core*" }
    
    if ($jsonFiles.Count -eq 0) {
        Write-Host "No JSON files found to lint" -ForegroundColor Cyan
        return
    }
    
    Write-Host "Found $($jsonFiles.Count) JSON files" -ForegroundColor Cyan
    
    $hasErrors = $false
    foreach ($file in $jsonFiles) {
        try {
            exec { jsonlint $file.FullName -q } "JSON linting failed for $($file.Name)"
            Write-Host "✓ $($file.Name)" -ForegroundColor DarkGreen
        }
        catch {
            Write-Host "✗ $($file.Name)" -ForegroundColor Red
            $hasErrors = $true
        }
    }
    
    if ($hasErrors) {
        throw "JSON linting failed for one or more files"
    }
    
    Write-Host "✓ JSON linting passed" -ForegroundColor Green
}

# YAML linting task
Task LintYaml {
    Write-Host "`nChecking YAML files..." -ForegroundColor Cyan
    
    if (-not (Test-Command "pnpm")) {
        throw "pnpm not found. Install Node.js and pnpm first"
    }
    
    # Use a more robust approach to find YAML files including hidden directories
    $yamlFiles = @()
    $yamlFiles += Get-ChildItem -Path $PSScriptRoot -Filter "*.yml" -Recurse -Force
    $yamlFiles += Get-ChildItem -Path $PSScriptRoot -Filter "*.yaml" -Recurse -Force
    $yamlFiles = $yamlFiles | Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.bmad-core*" }
    
    if ($yamlFiles.Count -eq 0) {
        Write-Host "No YAML files found to lint" -ForegroundColor Cyan
        return
    }
    
    Write-Host "Found $($yamlFiles.Count) YAML files" -ForegroundColor Cyan
    Write-Host "Files found:" -ForegroundColor Cyan
    $yamlFiles | ForEach-Object { Write-Host "  $($_.FullName)" -ForegroundColor Gray }
    
    $fileList = $yamlFiles | ForEach-Object { $_.FullName }
    
    Push-Location $PSScriptRoot
    try {
        # Run yaml-lint with config file to catch all issues
        # Use npx directly instead of pnpm exec for better compatibility
        $arguments = @("yaml-lint", "--config-file", "config/.yaml-lint.json") + $fileList
        exec { & npx $arguments } "YAML linting failed"
        Write-Host "✓ YAML linting passed" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

# TypeScript/JavaScript linting task
Task LintTypeScript {
    Write-Host "`nChecking TypeScript/JavaScript files..." -ForegroundColor Cyan
    
    # Check if we have a package.json and pnpm workspace
    if (Test-Path "package.json") {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        
        # Check if lint script exists in package.json
        if ($packageJson.scripts -and $packageJson.scripts.lint) {
            Write-Host "Using pnpm workspace lint script..." -ForegroundColor Cyan
            
            if (-not (Test-Command "pnpm")) {
                throw "pnpm not found. Please install pnpm first."
            }
            
            Push-Location $PSScriptRoot
            try {
                exec { pnpm lint } "TypeScript/JavaScript linting failed"
                Write-Host "✓ TypeScript/JavaScript linting passed" -ForegroundColor Green
            }
            finally {
                Pop-Location
            }
        } else {
            Write-Host "No lint script found in package.json - skipping TypeScript/JavaScript linting" -ForegroundColor Yellow
        }
    } else {
        Write-Host "No package.json found - skipping TypeScript/JavaScript linting" -ForegroundColor Yellow
    }
}

# Check that all files end with newlines
Task CheckNewlines {
    Write-Host "`nChecking that all files end with newlines..." -ForegroundColor Cyan
    
    # Define file patterns to check
    $filePatterns = @("*.md", "*.json", "*.yml", "*.yaml", "*.js", "*.ts", "*.jsx", "*.tsx", "*.ps1", "*.txt", "*.cjs")
    $failedFiles = @()
    
    foreach ($pattern in $filePatterns) {
        $files = Get-ChildItem -Path $PSScriptRoot -Filter $pattern -Recurse | 
                 Where-Object { 
                     $_.FullName -notlike "*node_modules*" -and 
                     $_.FullName -notlike "*.bmad-core*" -and
                     $_.FullName -notlike "*/.git/*" -and
                     $_.FullName -notlike "*/dist/*" -and
                     $_.FullName -notlike "*/build/*" -and
                     $_.FullName -notlike "*/coverage/*"
                 }
        
        foreach ($file in $files) {
            # Skip empty files
            if ($file.Length -eq 0) {
                continue
            }
            
            # Read the last character of the file
            $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
            if ($content -and -not $content.EndsWith("`n") -and -not $content.EndsWith("`r`n")) {
                $failedFiles += $file.FullName
            }
        }
    }
    
    if ($failedFiles.Count -gt 0) {
        Write-Host "❌ The following files do not end with a newline:" -ForegroundColor Red
        foreach ($file in $failedFiles) {
            Write-Host "  $file" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "To fix this, ensure all files end with a newline character." -ForegroundColor Yellow
        Write-Host "In most editors, this happens automatically when you save." -ForegroundColor Yellow
        throw "Files missing final newlines"
    } else {
        Write-Host "✓ All files end with newlines" -ForegroundColor Green
    }
}

# Security checks for dependencies and code
Task CheckSecurity {
    Write-Host "`nRunning security checks..." -ForegroundColor Cyan
    
    Push-Location $PSScriptRoot
    try {
        # Check for npm audit if pnpm is available
        if ((Test-Path "package.json") -and (Test-Command "pnpm")) {
            Write-Host "Checking for security vulnerabilities in dependencies..." -ForegroundColor Cyan
            
            try {
                exec { pnpm audit --audit-level moderate } "Dependency security audit found issues"
                Write-Host "✓ No security vulnerabilities found in dependencies" -ForegroundColor Green
            }
            catch {
                Write-Host "⚠️  Security vulnerabilities found. Run 'pnpm audit' for details." -ForegroundColor Yellow
                # Don't fail the build for security issues, just warn
            }
        }
        
        # Check for common security anti-patterns in code
        Write-Host "Scanning for security anti-patterns..." -ForegroundColor Cyan
        $securityIssues = @()
        
        # Look for hardcoded secrets patterns
        $secretPatterns = @(
            "password\s*[:=]\s*[`"'].*[`"']",
            "secret\s*[:=]\s*[`"'].*[`"']",
            "api_key\s*[:=]\s*[`"'].*[`"']",
            "apikey\s*[:=]\s*[`"'].*[`"']",
            "private_key\s*[:=]\s*[`"'].*[`"']",
            "access_token\s*[:=]\s*[`"'].*[`"']"
        )
        
        $codeFiles = Get-ChildItem -Path $PSScriptRoot -Include "*.ts", "*.js", "*.tsx", "*.jsx" -Recurse |
                     Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.bmad-core*" -and $_.FullName -notlike "*\dist\*" }
        
        foreach ($file in $codeFiles) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            if ($content) {
                foreach ($pattern in $secretPatterns) {
                    if ($content -match $pattern) {
                        $securityIssues += "Potential hardcoded secret in $($file.FullName): matches pattern '$pattern'"
                    }
                }
            }
        }
        
        if ($securityIssues.Count -gt 0) {
            Write-Host "⚠️  Security issues found:" -ForegroundColor Yellow
            foreach ($issue in $securityIssues) {
                Write-Host "  $issue" -ForegroundColor Yellow
            }
            Write-Host "Please review and ensure no real secrets are hardcoded" -ForegroundColor Yellow
        } else {
            Write-Host "✓ No security anti-patterns detected" -ForegroundColor Green
        }
    }
    finally {
        Pop-Location
    }
}

# API Health checks for development environment
Task CheckApiHealth {
    Write-Host "`nChecking API health and configuration..." -ForegroundColor Cyan
    
    # Check if API package exists
    if (-not (Test-Path "apps/api/package.json")) {
        Write-Host "⚠️  API package not found, skipping health checks" -ForegroundColor Yellow
        return
    }
    
    Push-Location "apps/api"
    try {
        # Check if API builds successfully
        Write-Host "Verifying API builds correctly..." -ForegroundColor Cyan
        if (Test-Command "pnpm") {
            try {
                exec { pnpm build } "API build failed"
                Write-Host "✓ API builds successfully" -ForegroundColor Green
            }
            catch {
                throw "API build verification failed"
            }
        }
        
        # Check TypeScript configuration
        Write-Host "Validating TypeScript configuration..." -ForegroundColor Cyan
        if (Test-Path "tsconfig.json") {
            try {
                exec { pnpm type-check } "TypeScript type checking failed"
                Write-Host "✓ TypeScript configuration is valid" -ForegroundColor Green
            }
            catch {
                throw "TypeScript configuration validation failed"
            }
        }
        
        # Validate package.json required scripts
        Write-Host "Checking required npm scripts..." -ForegroundColor Cyan
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        $requiredScripts = @("dev", "build", "start", "test", "lint")
        $missingScripts = @()
        
        foreach ($script in $requiredScripts) {
            if (-not ($packageJson.scripts -and $packageJson.scripts.$script)) {
                $missingScripts += $script
            }
        }
        
        if ($missingScripts.Count -gt 0) {
            throw "Missing required npm scripts: $($missingScripts -join ', ')"
        }
        
        Write-Host "✓ All required npm scripts are present" -ForegroundColor Green
        
        # Check for proper dependency versions
        Write-Host "Validating dependency versions..." -ForegroundColor Cyan
        $requiredDeps = @{
            "express" = "^4.19.0"
            "winston" = "^3.17.0"
            "helmet" = "^7.1.0"
            "cors" = "^2.8.5"
        }
        
        $versionIssues = @()
        foreach ($dep in $requiredDeps.GetEnumerator()) {
            if ($packageJson.dependencies -and $packageJson.dependencies.($dep.Key)) {
                $actualVersion = $packageJson.dependencies.($dep.Key)
                # Check if actual version satisfies the required range
                # This is a simplified check - for full semver support, use a proper parser
                if (-not ($actualVersion -match "^\^?\d+\.\d+\.\d+")) {
                    $versionIssues += "$($dep.Key): invalid version format $actualVersion"
                } elseif ($dep.Value.StartsWith("^") -and -not $actualVersion.StartsWith("^")) {
                    # Allow exact versions that would satisfy the caret range
                    $requiredMajor = $dep.Value.Substring(1).Split('.')[0]
                    $actualMajor = $actualVersion.Split('.')[0]
                    if ($actualMajor -ne $requiredMajor) {
                        $versionIssues += "$($dep.Key): major version mismatch - expected $($dep.Value), got $actualVersion"
                    }
                }
            } else {
                $versionIssues += "$($dep.Key): missing dependency"
            }
        }
        
        if ($versionIssues.Count -gt 0) {
            Write-Host "⚠️  Dependency version issues:" -ForegroundColor Yellow
            foreach ($issue in $versionIssues) {
                Write-Host "  $issue" -ForegroundColor Yellow
            }
        } else {
            Write-Host "✓ All core dependencies have correct versions" -ForegroundColor Green
        }
        
    }
    finally {
        Pop-Location
    }
}

# Test task
Task Test -Description "Run workspace configuration tests" {
    Write-Host "`nRunning workspace configuration tests..." -ForegroundColor Cyan
    
    Push-Location $PSScriptRoot
    try {
        # Run Jest tests if available
        if (Test-Path "package.json") {
            $packageJson = Get-Content "package.json" | ConvertFrom-Json
            
            if ($packageJson.scripts -and $packageJson.scripts.test) {
                Write-Host "Running Jest tests..." -ForegroundColor Cyan
                
                if (-not (Test-Command "pnpm")) {
                    throw "pnpm not found. Please install pnpm first."
                }
                
                exec { pnpm test } "Jest tests failed"
                Write-Host "✓ Jest tests passed" -ForegroundColor Green
            }
        }
        
        # Run validation script
        if (Test-Path "__tests__/workspace-validation.js") {
            Write-Host "Running workspace validation script..." -ForegroundColor Cyan
            
            if (-not (Test-Command "node")) {
                throw "Node.js not found. Please install Node.js first."
            }
            
            exec { node "__tests__/workspace-validation.js" } "Workspace validation failed"
            Write-Host "✓ Workspace validation passed" -ForegroundColor Green
        }
        
        # Run API-specific tests if they exist
        if (Test-Path "apps/api/package.json") {
            Write-Host "Running API-specific tests..." -ForegroundColor Cyan
            
            Push-Location "apps/api"
            try {
                if (Test-Command "pnpm") {
                    exec { pnpm test } "API tests failed"
                    Write-Host "✓ API tests passed" -ForegroundColor Green
                }
            }
            finally {
                Pop-Location
            }
        }
        
        Write-Host "✓ All tests passed" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

# Individual convenience tasks
Task Markdown -Alias md -Description "Run only markdown linting" -Depends LintMarkdown
Task Json -Description "Run only JSON linting" -Depends LintJson
Task Yaml -Alias yml -Description "Run only YAML linting" -Depends LintYaml
Task TypeScript -Alias ts -Description "Run only TypeScript/JavaScript linting" -Depends LintTypeScript
Task Newlines -Description "Check that all files end with newlines" -Depends CheckNewlines
Task Security -Description "Run only security checks" -Depends CheckSecurity
Task ApiHealth -Description "Run only API health checks" -Depends CheckApiHealth

# Fix task for markdown
Task FixMarkdown -Alias fix-md -Description "Run markdown linting with auto-fix" {
    $script:MarkdownFixMode = $true
    Invoke-Task LintMarkdown
    $script:MarkdownFixMode = $false  # Reset after use
}

# Clean task (placeholder for future use)
Task Clean -Description "Clean build artifacts" {
    Write-Host "Clean task - no artifacts to clean yet" -ForegroundColor Cyan
}

# Show available tasks
Task ? -Alias help -Description "Show available tasks" {
    Write-Host "`nAvailable tasks:" -ForegroundColor Cyan
    Write-Host "=================" -ForegroundColor Cyan
    
    Get-PSakeScriptTasks | ForEach-Object {
        $description = if ($_.Description) { " - $($_.Description)" } else { "" }
        $aliases = if ($_.Alias) { " (alias: $($_.Alias -join ', '))" } else { "" }
        Write-Host "$($_.Name)$aliases$description" -ForegroundColor Yellow
    }
    
    Write-Host "`nUsage examples:" -ForegroundColor Cyan
    Write-Host "  Invoke-psake                    # Run default task (all linting)" -ForegroundColor Gray
    Write-Host "  Invoke-psake Markdown           # Run only markdown linting" -ForegroundColor Gray
    Write-Host "  Invoke-psake FixMarkdown        # Run markdown linting with auto-fix" -ForegroundColor Gray
    Write-Host "  Invoke-psake ?                  # Show this help" -ForegroundColor Gray
}

# Task to ensure dependencies are installed
Task CheckDependencies -Description "Check if all linting tools are installed" {
    Write-Host "`nChecking dependencies..." -ForegroundColor Cyan
    
    $tools = @(
        @{Name = "markdownlint"; Install = "npm install -g markdownlint-cli"; CheckCommand = "markdownlint"; Alternative = "npx markdownlint-cli"},
        @{Name = "jsonlint"; Install = "npm install -g jsonlint"; CheckCommand = "jsonlint"; Alternative = "npx jsonlint"},
        @{Name = "yaml-lint"; Install = "pnpm install (included in dev dependencies)"; CheckCommand = "npx yaml-lint"; IsLocal = $true},
        @{Name = "pnpm"; Install = "npm install -g pnpm"; CheckCommand = "pnpm"; Alternative = "npm"},
        @{Name = "docker"; Install = "Install Docker Desktop from https://docs.docker.com/desktop/"; CheckCommand = "docker"; IsDocker = $true},
        @{Name = "docker-compose"; Install = "Included with Docker Desktop or install separately"; CheckCommand = "docker compose version"; IsDockerCompose = $true}
    )
    
    $missing = @()
    
    foreach ($tool in $tools) {
        $checkCommand = if ($tool.CheckCommand) { $tool.CheckCommand } else { $tool.Name }
        $available = $false
        
        # Special handling for local tools that use npx
        if ($tool.IsLocal) {
            # Check if the tool is available through npx (checks node_modules/.bin and registry)
            try {
                $null = & npx --yes --quiet $tool.Name --version 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✓ $($tool.Name) is available (local/npx)" -ForegroundColor Green
                    $available = $true
                }
            } catch {
                # Tool not available through npx
            }
        } elseif ($tool.IsDocker) {
            # Special handling for Docker
            if (Test-Command "docker") {
                Write-Host "✓ $($tool.Name) is installed" -ForegroundColor Green
                $available = $true
            }
        } elseif ($tool.IsDockerCompose) {
            # Special handling for Docker Compose - check modern plugin first
            try {
                $null = & docker compose version 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✓ $($tool.Name) is available (Docker Compose plugin)" -ForegroundColor Green
                    $available = $true
                }
            } catch {
                # Try standalone docker-compose
                if (Test-Command "docker-compose") {
                    Write-Host "✓ $($tool.Name) is available (standalone docker-compose)" -ForegroundColor Green
                    $available = $true
                }
            }
        } else {
            # Check primary command
            if (Test-Command $checkCommand) {
                Write-Host "✓ $($tool.Name) is installed" -ForegroundColor Green
                $available = $true
            } elseif ($tool.Alternative) {
                # Check alternative command (like npx version)
                try {
                    $testCmd = $tool.Alternative.Split(' ')[0]
                    if (Test-Command $testCmd) {
                        Write-Host "✓ $($tool.Name) is available (via $($tool.Alternative))" -ForegroundColor Green
                        $available = $true
                    }
                } catch {
                    # Alternative not available
                }
            }
        }
        
        if (-not $available) {
            Write-Host "✗ $($tool.Name) is NOT available" -ForegroundColor Red
            $missing += $tool
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "`nSome dependencies are missing, but CI will attempt to continue:" -ForegroundColor Yellow
        foreach ($tool in $missing) {
            Write-Host "  $($tool.Install)" -ForegroundColor Gray
        }
        Write-Host "`nNote: Individual linting tasks will fail if required tools are unavailable." -ForegroundColor Yellow
        Write-Host "The linting tasks may still work through workspace dependencies or npx." -ForegroundColor Cyan
        # Don't throw - let individual tasks handle their own dependencies
    } else {
        Write-Host "`nAll dependencies are available! ✓" -ForegroundColor Green
    }
}

# CI task for continuous integration
Task CI -Depends CheckDependencies, Lint -Description "Run all CI checks" {
    Write-Host "`nCI checks passed! ✓" -ForegroundColor Green
}

# ==================================================================
# Docker Development Environment Management Tasks
# ==================================================================

# Variables for Docker configuration
$script:ComposeFile = "config/docker-compose.dev.yml"
$script:ProjectName = "luppa-dev"
$script:Services = @("postgres", "redis", "api", "web", "nginx")

# Helper function to check if Docker is available
function Test-Docker {
    if (-not (Test-Command "docker")) {
        throw "Docker not found. Please install Docker Desktop first."
    }
    
    # Test modern Docker Compose (plugin) - preferred
    try {
        $null = & docker compose version 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
    }
    catch {
        # Docker Compose plugin not available, check for standalone docker-compose
    }
    
    # Fallback to standalone docker-compose command
    if (-not (Test-Command "docker-compose")) {
        throw @"
Docker Compose not found. Please install Docker Compose using one of these methods:

1. Install Docker Desktop (includes Docker Compose plugin) - RECOMMENDED
   Visit: https://docs.docker.com/desktop/

2. Install Docker Compose standalone:
   Visit: https://docs.docker.com/compose/install/

3. On Linux, you can also install via package manager:
   sudo apt-get install docker-compose-plugin  # Ubuntu/Debian
   sudo yum install docker-compose-plugin      # RHEL/CentOS
"@
    }
}

# Helper function to run docker compose commands
function Invoke-DockerCompose {
    param(
        [Parameter(Mandatory=$true)]
        [string[]]$Arguments,
        
        [string]$ErrorMessage = "Docker Compose command failed"
    )
    
    Test-Docker
    
    # Try modern Docker Compose plugin first
    try {
        $output = & docker compose version 2>&1
        if ($LASTEXITCODE -eq 0 -and $output -match "Docker Compose version") {
            $fullArgs = @("compose", "-f", $script:ComposeFile, "-p", $script:ProjectName) + $Arguments
            exec { & docker $fullArgs } $ErrorMessage
            return
        }
    }
    catch {
        # Docker Compose plugin not available, continue to standalone check
    }
    
    # Fallback to standalone docker-compose if available
    try {
        if (Test-Command "docker-compose") {
            $output = & docker-compose version 2>&1
            if ($LASTEXITCODE -eq 0) {
                $fullArgs = @("-f", $script:ComposeFile, "-p", $script:ProjectName) + $Arguments
                exec { & docker-compose $fullArgs } $ErrorMessage
                return
            }
        }
    }
    catch {
        # Standalone docker-compose also failed
    }
    
    throw "Neither 'docker compose' plugin nor standalone 'docker-compose' is available. Please install Docker Compose."
}

# Helper function to run docker compose exec commands
function Invoke-DockerComposeExec {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Service,
        
        [Parameter(Mandatory=$true)]
        [string[]]$Command,
        
        [switch]$Interactive = $true,
        
        [string]$ErrorMessage = "Docker Compose exec command failed"
    )
    
    Test-Docker
    
    $execArgs = if ($Interactive) { @("exec", $Service) } else { @("exec", "-T", $Service) }
    $allArgs = $execArgs + $Command
    
    # Try modern Docker Compose plugin first
    try {
        $output = & docker compose version 2>&1
        if ($LASTEXITCODE -eq 0 -and $output -match "Docker Compose version") {
            $fullArgs = @("compose", "-f", $script:ComposeFile, "-p", $script:ProjectName) + $allArgs
            exec { & docker $fullArgs } $ErrorMessage
            return
        }
    }
    catch {
        # Docker Compose plugin not available, continue to standalone check
    }
    
    # Fallback to standalone docker-compose if available
    try {
        if (Test-Command "docker-compose") {
            $output = & docker-compose version 2>&1
            if ($LASTEXITCODE -eq 0) {
                $fullArgs = @("-f", $script:ComposeFile, "-p", $script:ProjectName) + $allArgs
                exec { & docker-compose $fullArgs } $ErrorMessage
                return
            }
        }
    }
    catch {
        # Standalone docker-compose also failed
    }
    
    throw "Neither 'docker compose' plugin nor standalone 'docker-compose' is available. Please install Docker Compose."
}

# Start all development services
Task DockerUp -Alias up -Description "Start all development services" {
    Write-Host "`nStarting Luppa Inventory development environment..." -ForegroundColor Cyan
    
    Invoke-DockerCompose -Arguments @("up", "-d")
    
    Write-Host "`nServices started successfully!" -ForegroundColor Green
    Write-Host "Access the application at: http://localhost:3000" -ForegroundColor Yellow
    Write-Host "API health check: http://localhost:3000/api/health" -ForegroundColor Yellow
    
    Invoke-Task DockerStatus
}

# Stop and remove all containers
Task DockerDown -Alias down -Description "Stop and remove all containers" {
    Write-Host "`nStopping Luppa Inventory development environment..." -ForegroundColor Cyan
    
    Invoke-DockerCompose -Arguments @("down")
    
    Write-Host "All services stopped and containers removed." -ForegroundColor Green
}

# Restart all services
Task DockerRestart -Alias restart -Description "Restart all services" {
    Write-Host "`nRestarting all services..." -ForegroundColor Cyan
    
    Invoke-Task DockerDown
    Start-Sleep -Seconds 2
    Invoke-Task DockerUp
}

# Build or rebuild all services
Task DockerBuild -Alias build -Description "Build or rebuild all services" {
    Write-Host "`nBuilding all services..." -ForegroundColor Cyan
    
    Invoke-DockerCompose -Arguments @("build", "--no-cache")
    
    Write-Host "All services built successfully!" -ForegroundColor Green
}

# View logs from all services
Task DockerLogs -Alias logs -Description "View logs from all services" {
    Write-Host "`nShowing logs from all services (Ctrl+C to exit)..." -ForegroundColor Cyan
    
    try {
        Invoke-DockerCompose -Arguments @("logs", "-f")
    }
    catch {
        Write-Host "`nLog viewing stopped." -ForegroundColor Yellow
    }
}

# View API service logs only
Task DockerLogsApi -Alias logs-api -Description "View API service logs only" {
    Write-Host "`nShowing API service logs (Ctrl+C to exit)..." -ForegroundColor Cyan
    
    try {
        Invoke-DockerCompose -Arguments @("logs", "-f", "api")
    }
    catch {
        Write-Host "`nLog viewing stopped." -ForegroundColor Yellow
    }
}

# View web service logs only
Task DockerLogsWeb -Alias logs-web -Description "View web service logs only" {
    Write-Host "`nShowing web service logs (Ctrl+C to exit)..." -ForegroundColor Cyan
    
    try {
        Invoke-DockerCompose -Arguments @("logs", "-f", "web")
    }
    catch {
        Write-Host "`nLog viewing stopped." -ForegroundColor Yellow
    }
}

# View PostgreSQL service logs only
Task DockerLogsPostgres -Alias logs-postgres -Description "View PostgreSQL service logs only" {
    Write-Host "`nShowing PostgreSQL service logs (Ctrl+C to exit)..." -ForegroundColor Cyan
    
    try {
        Invoke-DockerCompose -Arguments @("logs", "-f", "postgres")
    }
    catch {
        Write-Host "`nLog viewing stopped." -ForegroundColor Yellow
    }
}

# View Redis service logs only
Task DockerLogsRedis -Alias logs-redis -Description "View Redis service logs only" {
    Write-Host "`nShowing Redis service logs (Ctrl+C to exit)..." -ForegroundColor Cyan
    
    try {
        Invoke-DockerCompose -Arguments @("logs", "-f", "redis")
    }
    catch {
        Write-Host "`nLog viewing stopped." -ForegroundColor Yellow
    }
}

# View Nginx service logs only
Task DockerLogsNginx -Alias logs-nginx -Description "View Nginx service logs only" {
    Write-Host "`nShowing Nginx service logs (Ctrl+C to exit)..." -ForegroundColor Cyan
    
    try {
        Invoke-DockerCompose -Arguments @("logs", "-f", "nginx")
    }
    catch {
        Write-Host "`nLog viewing stopped." -ForegroundColor Yellow
    }
}

# Access backend container shell
Task DockerShellApi -Alias shell-api -Description "Access backend container shell" {
    Write-Host "`nOpening shell in API container..." -ForegroundColor Cyan
    
    Invoke-DockerComposeExec -Service "api" -Command @("sh") -ErrorMessage "Failed to access API container shell"
}

# Access frontend container shell
Task DockerShellWeb -Alias shell-web -Description "Access frontend container shell" {
    Write-Host "`nOpening shell in web container..." -ForegroundColor Cyan
    
    Invoke-DockerComposeExec -Service "web" -Command @("sh") -ErrorMessage "Failed to access web container shell"
}

# Access PostgreSQL container shell
Task DockerShellPostgres -Alias shell-postgres -Description "Access PostgreSQL container shell" {
    Write-Host "`nOpening shell in PostgreSQL container..." -ForegroundColor Cyan
    
    Invoke-DockerComposeExec -Service "postgres" -Command @("bash") -ErrorMessage "Failed to access PostgreSQL container shell"
}

# Access Redis container shell
Task DockerShellRedis -Alias shell-redis -Description "Access Redis container shell" {
    Write-Host "`nOpening shell in Redis container..." -ForegroundColor Cyan
    
    Invoke-DockerComposeExec -Service "redis" -Command @("sh") -ErrorMessage "Failed to access Redis container shell"
}

# Connect to PostgreSQL database
Task DockerPsql -Alias psql -Description "Connect to PostgreSQL database" {
    Write-Host "`nConnecting to PostgreSQL database..." -ForegroundColor Cyan
    
    Invoke-DockerComposeExec -Service "postgres" -Command @("psql", "-U", "postgres", "-d", "luppa_dev") -ErrorMessage "Failed to connect to PostgreSQL database"
}

# Connect to Redis CLI
Task DockerRedisCli -Alias redis-cli -Description "Connect to Redis CLI" {
    Write-Host "`nConnecting to Redis CLI..." -ForegroundColor Cyan
    
    Invoke-DockerComposeExec -Service "redis" -Command @("redis-cli", "-a", "dev_redis_password") -ErrorMessage "Failed to connect to Redis CLI"
}

# Reset database to initial state
Task DockerResetDb -Alias reset-db -Description "Reset database to initial state" {
    Write-Host "`nWARNING: This will delete all data in the database!" -ForegroundColor Red
    $response = Read-Host "Press Enter to continue or Ctrl+C to cancel"
    
    Write-Host "`nResetting database..." -ForegroundColor Cyan
    
    Test-Docker
    
    # Stop postgres container
    Invoke-DockerCompose -Arguments @("stop", "postgres") -ErrorMessage "Failed to stop PostgreSQL container"
    
    # Remove postgres container
    Invoke-DockerCompose -Arguments @("rm", "-f", "postgres") -ErrorMessage "Failed to remove PostgreSQL container"
    
    # Remove postgres volume
    try {
        exec { docker volume rm luppa-postgres-data } "Failed to remove PostgreSQL volume"
    }
    catch {
        Write-Host "PostgreSQL volume may not exist or may be in use - continuing..." -ForegroundColor Yellow
    }
    
    Write-Host "Database reset completed. Starting PostgreSQL..." -ForegroundColor Green
    
    # Start postgres container
    Invoke-DockerCompose -Arguments @("up", "-d", "postgres") -ErrorMessage "Failed to start PostgreSQL container"
    
    Write-Host "Database reinitialized with fresh data." -ForegroundColor Green
}

# Reset Redis cache
Task DockerResetRedis -Alias reset-redis -Description "Reset Redis cache" {
    Write-Host "`nResetting Redis cache..." -ForegroundColor Cyan
    
    Invoke-DockerComposeExec -Service "redis" -Command @("redis-cli", "-a", "dev_redis_password", "FLUSHALL") -Interactive:$false -ErrorMessage "Failed to reset Redis cache"
    
    Write-Host "Redis cache cleared." -ForegroundColor Green
}

# Reset all data (database and cache)
Task DockerResetAll -Alias reset-all -Description "Reset all data (database and cache)" {
    Write-Host "`nWARNING: This will delete ALL data!" -ForegroundColor Red
    $response = Read-Host "Press Enter to continue or Ctrl+C to cancel"
    
    Invoke-Task DockerResetDb
    Invoke-Task DockerResetRedis
    
    Write-Host "All data reset completed." -ForegroundColor Green
}

# Show status of all services
Task DockerStatus -Alias status -Description "Show status of all services" {
    Write-Host "`nService Status:" -ForegroundColor Cyan
    
    Invoke-DockerCompose -Arguments @("ps") -ErrorMessage "Failed to get service status"
}

# Check health of all services
Task DockerHealth -Alias health -Description "Check health of all services" {
    Write-Host "`nHealth Check Results:" -ForegroundColor Cyan
    Write-Host ""
    
    Test-Docker
    
    # PostgreSQL health check
    Write-Host "PostgreSQL:" -ForegroundColor Yellow
    try {
        Invoke-DockerComposeExec -Service "postgres" -Command @("pg_isready", "-U", "postgres", "-d", "luppa_dev") -Interactive:$false -ErrorMessage "PostgreSQL health check failed"
        Write-Host "✓ PostgreSQL: HEALTHY" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ PostgreSQL: UNHEALTHY" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # Redis health check
    Write-Host "Redis:" -ForegroundColor Yellow
    try {
        Invoke-DockerComposeExec -Service "redis" -Command @("redis-cli", "--no-auth-warning", "-a", "dev_redis_password", "ping") -Interactive:$false -ErrorMessage "Redis health check failed"
        Write-Host "✓ Redis: HEALTHY" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Redis: UNHEALTHY" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # API health check
    Write-Host "API:" -ForegroundColor Yellow
    try {
        if (Test-Command "curl") {
            $null = & curl -s -f http://localhost:3010/health 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ API: HEALTHY" -ForegroundColor Green
            } else {
                Write-Host "✗ API: UNHEALTHY" -ForegroundColor Red
            }
        } else {
            # Fallback using PowerShell
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:3010/health" -TimeoutSec 5 -ErrorAction Stop
                if ($response.StatusCode -eq 200) {
                    Write-Host "✓ API: HEALTHY" -ForegroundColor Green
                } else {
                    Write-Host "✗ API: UNHEALTHY" -ForegroundColor Red
                }
            }
            catch {
                Write-Host "✗ API: UNHEALTHY" -ForegroundColor Red
            }
        }
    }
    catch {
        Write-Host "✗ API: UNHEALTHY" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # Nginx health check
    Write-Host "Web (via Nginx):" -ForegroundColor Yellow
    try {
        if (Test-Command "curl") {
            $null = & curl -s -f http://localhost:3000/health 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Nginx: HEALTHY" -ForegroundColor Green
            } else {
                Write-Host "✗ Nginx: UNHEALTHY" -ForegroundColor Red
            }
        } else {
            # Fallback using PowerShell
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -ErrorAction Stop
                if ($response.StatusCode -eq 200) {
                    Write-Host "✓ Nginx: HEALTHY" -ForegroundColor Green
                } else {
                    Write-Host "✗ Nginx: UNHEALTHY" -ForegroundColor Red
                }
            }
            catch {
                Write-Host "✗ Nginx: UNHEALTHY" -ForegroundColor Red
            }
        }
    }
    catch {
        Write-Host "✗ Nginx: UNHEALTHY" -ForegroundColor Red
    }
}

# Run tests in all services
Task DockerTest -Alias docker-test -Description "Run tests in all services" {
    Write-Host "`nRunning tests..." -ForegroundColor Cyan
    
    Write-Host "API Tests:" -ForegroundColor Yellow
    try {
        Invoke-DockerCompose -Arguments @("exec", "api", "pnpm", "test")
        Write-Host "✓ API tests passed" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ API tests failed" -ForegroundColor Red
        throw "API tests failed"
    }
    
    Write-Host "`nWeb Tests:" -ForegroundColor Yellow
    try {
        Invoke-DockerCompose -Arguments @("exec", "web", "pnpm", "test")
        Write-Host "✓ Web tests passed" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Web tests failed" -ForegroundColor Red
        throw "Web tests failed"
    }
}

# Run linting checks in containers
Task DockerLint -Alias docker-lint -Description "Run linting checks in containers" {
    Write-Host "`nRunning linting checks..." -ForegroundColor Cyan
    
    Write-Host "API Linting:" -ForegroundColor Yellow
    try {
        Invoke-DockerCompose -Arguments @("exec", "api", "pnpm", "lint")
        Write-Host "✓ API linting passed" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ API linting failed" -ForegroundColor Red
        throw "API linting failed"
    }
    
    Write-Host "`nWeb Linting:" -ForegroundColor Yellow
    try {
        Invoke-DockerCompose -Arguments @("exec", "web", "pnpm", "lint")
        Write-Host "✓ Web linting passed" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Web linting failed" -ForegroundColor Red
        throw "Web linting failed"
    }
}

# Build production images
Task DockerBuildProd -Alias build-prod -Description "Build production images" {
    Write-Host "`nBuilding production images..." -ForegroundColor Cyan
    
    try {
        Invoke-DockerCompose -Arguments @("exec", "api", "pnpm", "build")
        Write-Host "✓ API production build completed" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ API production build failed" -ForegroundColor Red
        throw "API production build failed"
    }
    
    try {
        Invoke-DockerCompose -Arguments @("exec", "web", "pnpm", "build")
        Write-Host "✓ Web production build completed" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Web production build failed" -ForegroundColor Red
        throw "Web production build failed"
    }
    
    Write-Host "Production builds completed." -ForegroundColor Green
}

# Clean up Docker resources
Task DockerClean -Alias clean-docker -Description "Clean up Docker resources" {
    Write-Host "`nCleaning up Docker resources..." -ForegroundColor Cyan
    
    Test-Docker
    
    # Stop and remove containers with volumes
    Invoke-DockerCompose -Arguments @("down", "-v", "--remove-orphans") -ErrorMessage "Failed to clean up containers"
    
    # Clean up unused Docker resources
    exec { docker system prune -f } "Failed to clean up Docker system"
    
    Write-Host "Cleanup completed." -ForegroundColor Green
}

# Complete cleanup including volumes and images
Task DockerCleanAll -Alias clean-all -Description "Clean up everything including volumes and images" {
    Write-Host "`nWARNING: This will remove all containers, volumes, and images!" -ForegroundColor Red
    $response = Read-Host "Press Enter to continue or Ctrl+C to cancel"
    
    Test-Docker
    
    # Stop and remove everything
    Invoke-DockerCompose -Arguments @("down", "-v", "--rmi", "all", "--remove-orphans") -ErrorMessage "Failed to clean up everything"
    
    # Clean up all unused resources
    exec { docker volume prune -f } "Failed to clean up volumes"
    exec { docker image prune -a -f } "Failed to clean up images"
    
    Write-Host "Complete cleanup finished." -ForegroundColor Green
}

# Backup database to file
Task DockerBackupDb -Alias backup-db -Description "Backup database to file" {
    Write-Host "`nCreating database backup..." -ForegroundColor Cyan
    
    Test-Docker
    
    # Create backups directory if it doesn't exist
    if (-not (Test-Path "backups")) {
        New-Item -ItemType Directory -Path "backups" | Out-Null
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "backups/luppa_dev_$timestamp.sql"
    
    Invoke-DockerComposeExec -Service "postgres" -Command @("pg_dump", "-U", "postgres", "-d", "luppa_dev") -Interactive:$false -ErrorMessage "Failed to create database backup" | Out-File -FilePath $backupFile -Encoding utf8
    
    Write-Host "Database backup created: $backupFile" -ForegroundColor Green
}

# Restore database from backup file
Task DockerRestoreDb -Alias restore-db -Description "Restore database from backup file (use -Properties @{BackupFile='path/to/backup.sql'})" {
    if (-not $BackupFile) {
        throw "Please specify backup file with -Properties @{BackupFile='path/to/backup.sql'}"
    }
    
    if (-not (Test-Path $BackupFile)) {
        throw "Backup file not found: $BackupFile"
    }
    
    Write-Host "`nRestoring database from $BackupFile..." -ForegroundColor Cyan
    
    Test-Docker
    
    Get-Content $BackupFile | Invoke-DockerComposeExec -Service "postgres" -Command @("psql", "-U", "postgres", "-d", "luppa_dev") -Interactive:$false -ErrorMessage "Failed to restore database"
    
    Write-Host "Database restore completed." -ForegroundColor Green
}

# Update Docker images
Task DockerUpdate -Alias update -Description "Pull latest images and rebuild" {
    Write-Host "`nUpdating Docker images..." -ForegroundColor Cyan
    
    Test-Docker
    
    # Pull latest images
    Invoke-DockerCompose -Arguments @("pull") -ErrorMessage "Failed to pull latest images"
    
    # Rebuild with latest images
    Invoke-DockerCompose -Arguments @("build", "--pull") -ErrorMessage "Failed to rebuild with latest images"
    
    Write-Host "Images updated successfully." -ForegroundColor Green
}

# Check environment configuration
Task DockerEnvCheck -Alias env-check -Description "Check environment configuration" {
    Write-Host "`nEnvironment Configuration Check:" -ForegroundColor Cyan
    
    # Check for .env file
    if (Test-Path ".env") {
        Write-Host "✓ .env file exists" -ForegroundColor Green
    } else {
        Write-Host "✗ .env file missing" -ForegroundColor Red
        Write-Host "  Copy .env.example to .env and configure your settings" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Required directories:" -ForegroundColor Yellow
    
    if (Test-Path "infrastructure/docker") {
        Write-Host "✓ infrastructure/docker exists" -ForegroundColor Green
    } else {
        Write-Host "✗ infrastructure/docker missing" -ForegroundColor Red
    }
    
    if (Test-Path "infrastructure/docker/postgres/init.sql") {
        Write-Host "✓ PostgreSQL init script exists" -ForegroundColor Green
    } else {
        Write-Host "✗ PostgreSQL init script missing" -ForegroundColor Red
    }
    
    if (Test-Path "infrastructure/docker/nginx.conf") {
        Write-Host "✓ Nginx configuration exists" -ForegroundColor Green
    } else {
        Write-Host "✗ Nginx configuration missing" -ForegroundColor Red
    }
    
    if (Test-Path $script:ComposeFile) {
        Write-Host "✓ Docker Compose file exists" -ForegroundColor Green
    } else {
        Write-Host "✗ Docker Compose file missing" -ForegroundColor Red
    }
}

# Docker help - show available Docker commands
Task DockerHelp -Alias docker-help -Description "Show available Docker commands" {
    Write-Host "`nLuppa Inventory System - Docker Management" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Available Docker commands:" -ForegroundColor Yellow
    Write-Host ""
    
    $dockerTasks = @(
        @{Name="DockerUp (up)"; Description="Start all development services"},
        @{Name="DockerDown (down)"; Description="Stop and remove all containers"},
        @{Name="DockerRestart (restart)"; Description="Restart all services"},
        @{Name="DockerBuild (build)"; Description="Build or rebuild all services"},
        @{Name="DockerLogs (logs)"; Description="View logs from all services"},
        @{Name="DockerLogsApi (logs-api)"; Description="View API service logs only"},
        @{Name="DockerLogsWeb (logs-web)"; Description="View web service logs only"},
        @{Name="DockerLogsPostgres (logs-postgres)"; Description="View PostgreSQL service logs only"},
        @{Name="DockerLogsRedis (logs-redis)"; Description="View Redis service logs only"},
        @{Name="DockerLogsNginx (logs-nginx)"; Description="View Nginx service logs only"},
        @{Name="DockerShellApi (shell-api)"; Description="Access backend container shell"},
        @{Name="DockerShellWeb (shell-web)"; Description="Access frontend container shell"},
        @{Name="DockerShellPostgres (shell-postgres)"; Description="Access PostgreSQL container shell"},
        @{Name="DockerShellRedis (shell-redis)"; Description="Access Redis container shell"},
        @{Name="DockerPsql (psql)"; Description="Connect to PostgreSQL database"},
        @{Name="DockerRedisCli (redis-cli)"; Description="Connect to Redis CLI"},
        @{Name="DockerResetDb (reset-db)"; Description="Reset database to initial state"},
        @{Name="DockerResetRedis (reset-redis)"; Description="Reset Redis cache"},
        @{Name="DockerResetAll (reset-all)"; Description="Reset all data (database and cache)"},
        @{Name="DockerStatus (status)"; Description="Show status of all services"},
        @{Name="DockerHealth (health)"; Description="Check health of all services"},
        @{Name="DockerTest (docker-test)"; Description="Run tests in all services"},
        @{Name="DockerLint (docker-lint)"; Description="Run linting checks in containers"},
        @{Name="DockerBuildProd (build-prod)"; Description="Build production images"},
        @{Name="DockerClean (clean-docker)"; Description="Clean up Docker resources"},
        @{Name="DockerCleanAll (clean-all)"; Description="Clean up everything including volumes and images"},
        @{Name="DockerBackupDb (backup-db)"; Description="Backup database to file"},
        @{Name="DockerRestoreDb (restore-db)"; Description="Restore database from backup file"},
        @{Name="DockerUpdate (update)"; Description="Pull latest images and rebuild"},
        @{Name="DockerEnvCheck (env-check)"; Description="Check environment configuration"}
    )
    
    foreach ($task in $dockerTasks) {
        Write-Host "  $($task.Name.PadRight(35)) $($task.Description)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Usage examples:" -ForegroundColor Yellow
    Write-Host "  Invoke-psake DockerUp                 # Start all services" -ForegroundColor Gray
    Write-Host "  Invoke-psake up                       # Start all services (alias)" -ForegroundColor Gray
    Write-Host "  Invoke-psake DockerHealth             # Check service health" -ForegroundColor Gray
    Write-Host "  Invoke-psake shell-api                # Access API container shell" -ForegroundColor Gray
    Write-Host "  Invoke-psake DockerHelp               # Show this help" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Access the application at: http://localhost:3000" -ForegroundColor Green
    Write-Host "API health check: http://localhost:3000/api/health" -ForegroundColor Green
}
