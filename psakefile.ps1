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
Task Lint -Depends LintMarkdown, LintJson, LintYaml, LintTypeScript, Test {
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
            exec { markdownlint "**/*.md" --ignore node_modules --config config/.markdownlint.json --fix } "Markdown linting with fixes failed"
        } else {
            exec { markdownlint "**/*.md" --ignore node_modules --config config/.markdownlint.json } "Markdown linting failed"
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
    
    if (-not (Test-Command "yamllint")) {
        throw "yamllint not found. Install with: pip install yamllint"
    }
    
    $yamlFiles = Get-ChildItem -Path $PSScriptRoot -Include "*.yml", "*.yaml" -Recurse | 
                 Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.bmad-core*" }
    
    if ($yamlFiles.Count -eq 0) {
        Write-Host "No YAML files found to lint" -ForegroundColor Cyan
        return
    }
    
    Write-Host "Found $($yamlFiles.Count) YAML files" -ForegroundColor Cyan
    
    $fileList = $yamlFiles | ForEach-Object { $_.FullName }
    
    Push-Location $PSScriptRoot
    try {
        exec { yamllint $fileList } "YAML linting failed"
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
        @{Name = "markdownlint"; Install = "npm install -g markdownlint-cli"},
        @{Name = "jsonlint"; Install = "npm install -g jsonlint"},
        @{Name = "yamllint"; Install = "pip install yamllint"},
        @{Name = "pnpm"; Install = "npm install -g pnpm"}
    )
    
    $missing = @()
    
    foreach ($tool in $tools) {
        if (Test-Command $tool.Name) {
            Write-Host "✓ $($tool.Name) is installed" -ForegroundColor Green
        } else {
            Write-Host "✗ $($tool.Name) is NOT installed" -ForegroundColor Red
            $missing += $tool
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