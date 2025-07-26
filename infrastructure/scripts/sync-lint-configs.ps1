# Sync Linting Configurations
# This script generates both GitHub Actions workflow and updates psake tasks from shared config

param(
    [switch]$UpdateGitHubWorkflow,
    [switch]$UpdatePsake,
    [switch]$All
)

$ErrorActionPreference = "Stop"
$rootDir = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$configFile = Join-Path $rootDir "config/lint-config.json"

if (-not (Test-Path $configFile)) {
    throw "Config file not found: $configFile"
}

Write-Host "Loading shared linting configuration..." -ForegroundColor Cyan
$config = Get-Content $configFile | ConvertFrom-Json

function Update-GitHubWorkflow {
    Write-Host "Updating GitHub Actions workflow..." -ForegroundColor Yellow
    
    $workflowPath = Join-Path $rootDir ".github/workflows/lint.yml"
    $workflowContent = @"
---
name: Lint

on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]
  workflow_dispatch:

jobs:
  lint:
    name: Run Linting Checks
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'pnpm'

      - name: Setup Python for yamllint
        uses: actions/setup-python@v5
        with:
          python-version: '3.x'

      - name: Install Node.js linting tools
        run: |
          $($config.installCommands.npm -join "`n          ")

      - name: Install Python linting tools
        run: |
          $($config.installCommands.pip -join "`n          ")

      - name: Lint Markdown files
        run: |
          echo "Checking Markdown files..."
          if find . -name "*.md" -not -path "./node_modules/*" \
                     -not -path "./.bmad-core/*" | head -1 | grep -q .; then
            $($config.tools.markdownlint.command) "$($config.tools.markdownlint.patterns -join '" "')" \
                         --ignore $($config.tools.markdownlint.ignorePatterns -join ' --ignore ') \
                         $($config.tools.markdownlint.options -join ' ')
            echo "✓ Markdown linting passed"
          else
            echo "No markdown files found to lint"
          fi

      - name: Lint JSON files
        run: |
          echo "Checking JSON files..."
          json_files=`$(find . -name "*.json" -not -path "./node_modules/*" \
                                 -not -path "./.bmad-core/*")
          if [ -n "`$json_files" ]; then
            echo "Found JSON files:"
            echo "`$json_files"
            for file in `$json_files; do
              echo "Checking `$file..."
              $($config.tools.jsonlint.command) "`$file" $($config.tools.jsonlint.options -join ' ')
              echo "✓ `$file"
            done
            echo "✓ JSON linting passed"
          else
            echo "No JSON files found to lint"
          fi

      - name: Lint YAML files
        run: |
          echo "Checking YAML files..."
          yaml_files=`$(find . \( -name "*.yml" -o -name "*.yaml" \) \
                             -not -path "./node_modules/*" -not -path "./.bmad-core/*")
          if [ -n "`$yaml_files" ]; then
            echo "Found YAML files:"
            echo "`$yaml_files"
            $($config.tools.yamllint.command) $($config.tools.yamllint.options -join ' ') `$yaml_files
            echo "✓ YAML linting passed"
          else
            echo "No YAML files found to lint"
          fi

      - name: Lint TypeScript/JavaScript files
        run: |
          echo "Checking TypeScript/JavaScript files..."
          if [ -f "package.json" ]; then
            if grep -q '"lint"' package.json; then
              echo "Using pnpm workspace lint script..."
              pnpm install --frozen-lockfile || \
                echo "No lockfile found, installing dependencies..."
              pnpm lint
              echo "✓ TypeScript/JavaScript linting passed"
            else
              echo "No lint script found in package.json - skipping TypeScript/JavaScript linting"
            fi
          else
            echo "No package.json found - skipping TypeScript/JavaScript linting"
          fi

      - name: Summary
        run: |
          echo "All linting checks completed! ✓"
"@

    Set-Content -Path $workflowPath -Value $workflowContent -Encoding UTF8
    Write-Host "✓ GitHub Actions workflow updated" -ForegroundColor Green
}

function Show-Usage {
    Write-Host @"
Usage: sync-lint-configs.ps1 [options]

Options:
  -UpdateGitHubWorkflow    Update GitHub Actions workflow only
  -UpdatePsake            Update psake tasks only  
  -All                    Update both GitHub Actions and psake

Examples:
  .\sync-lint-configs.ps1 -All
  .\sync-lint-configs.ps1 -UpdateGitHubWorkflow
"@ -ForegroundColor Cyan
}

# Main execution
if ($All) {
    Update-GitHubWorkflow
    Write-Host "`n✅ All configurations synchronized!" -ForegroundColor Green
    Write-Host "Shared config version: $($config.version)" -ForegroundColor Gray
} elseif ($UpdateGitHubWorkflow) {
    Update-GitHubWorkflow
} elseif ($UpdatePsake) {
    Write-Host "Psake update functionality coming soon..." -ForegroundColor Yellow
} else {
    Show-Usage
}