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
            exec { markdownlint "**/*.md" --ignore node_modules --ignore .bmad-core --config config/.markdownlint.json --fix } "Markdown linting with fixes failed"
        } else {
            exec { markdownlint "**/*.md" --ignore node_modules --ignore .bmad-core --config config/.markdownlint.json } "Markdown linting failed"
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
    
    $jsonFiles = Get-ChildItem -Path $PSScriptRoot -Filter "*.json" -Recurse | 
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
                     $_.FullName -notlike "*\.git\*" -and
                     $_.FullName -notlike "*\dist\*" -and
                     $_.FullName -notlike "*\build\*" -and
                     $_.FullName -notlike "*\coverage\*"
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
                if ($actualVersion -ne $dep.Value) {
                    $versionIssues += "$($dep.Key): expected $($dep.Value), got $actualVersion"
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
        @{Name = "markdownlint"; Install = "npm install -g markdownlint-cli"; CheckCommand = "markdownlint"},
        @{Name = "jsonlint"; Install = "npm install -g jsonlint"; CheckCommand = "jsonlint"},
        @{Name = "yaml-lint"; Install = "pnpm install (included in dev dependencies)"; CheckCommand = "pnpm exec yaml-lint"},
        @{Name = "pnpm"; Install = "npm install -g pnpm"; CheckCommand = "pnpm"}
    )
    
    $missing = @()
    
    foreach ($tool in $tools) {
        $checkCommand = if ($tool.CheckCommand) { $tool.CheckCommand } else { $tool.Name }
        
        # Special handling for tools that need pnpm exec
        if ($checkCommand.StartsWith("pnpm exec")) {
            # Check if pnpm is available and the local package exists
            if ((Test-Command "pnpm") -and (Test-Path "package.json")) {
                try {
                    $null = & pnpm list $tool.Name --depth=0 2>$null
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "✓ $($tool.Name) is installed (local)" -ForegroundColor Green
                        continue
                    }
                } catch {
                    # Package not found locally
                }
            }
            Write-Host "✗ $($tool.Name) is NOT installed (local)" -ForegroundColor Red
            $missing += $tool
        } else {
            # Standard global command check
            if (Test-Command $checkCommand) {
                Write-Host "✓ $($tool.Name) is installed" -ForegroundColor Green
            } else {
                Write-Host "✗ $($tool.Name) is NOT installed" -ForegroundColor Red
                $missing += $tool
            }
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "`nTo install missing dependencies:" -ForegroundColor Yellow
        foreach ($tool in $missing) {
            Write-Host "  $($tool.Install)" -ForegroundColor Gray
        }
        throw "Missing required dependencies"
    }
    
    Write-Host "`nAll dependencies are installed! ✓" -ForegroundColor Green
}

# CI task for continuous integration
Task CI -Depends CheckDependencies, Lint -Description "Run all CI checks" {
    Write-Host "`nCI checks passed! ✓" -ForegroundColor Green
}
