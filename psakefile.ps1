# Psake build script for Luppa PLC Project
# This script contains all build and linting tasks

# Properties that can be overridden
Properties {
    $MarkdownFix = $false
}

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

# Main linting task that runs all linters
Task Lint -Depends LintMarkdown, LintJson, LintYaml {
    Write-Host "`nAll linting checks completed! ✓" -ForegroundColor Green
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
        if ($MarkdownFix) {
            exec { markdownlint "**/*.md" --ignore node_modules --fix } "Markdown linting with fixes failed"
        } else {
            exec { markdownlint "**/*.md" --ignore node_modules } "Markdown linting failed"
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

# Individual convenience tasks
Task Markdown -Alias md -Description "Run only markdown linting" -Depends LintMarkdown
Task Json -Description "Run only JSON linting" -Depends LintJson
Task Yaml -Alias yml -Description "Run only YAML linting" -Depends LintYaml

# Fix task for markdown
Task FixMarkdown -Alias fix-md -Description "Run markdown linting with auto-fix" {
    $script:MarkdownFix = $true
    Invoke-Task LintMarkdown
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
        @{Name = "yamllint"; Install = "pip install yamllint"}
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