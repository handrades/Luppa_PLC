# Psake build script for Luppa PLC Project
# This script contains all build and linting tasks

# Properties that can be overridden
Properties {
  $MarkdownFix = $false
}

# Parameters that can be passed between tasks
$script:MarkdownFixMode = $false
$script:CollectAllErrors = $false
$script:CollectedErrors = @()
$script:CollectedWarnings = @()

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

# Error collection helper functions
function Add-TaskError {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TaskName,
    
    [Parameter(Mandatory = $true)]
    [string]$ErrorMessage,
    
    [string]$FilePath = "",
    [string]$LineNumber = "",
    [string]$ColumnNumber = "",
    [string]$ErrorCode = "",
    [string]$SuggestedFix = ""
  )
  
  $errorObject = @{
    TaskName = $TaskName
    ErrorMessage = $ErrorMessage
    FilePath = $FilePath
    LineNumber = $LineNumber
    ColumnNumber = $ColumnNumber
    ErrorCode = $ErrorCode
    SuggestedFix = $SuggestedFix
    Timestamp = Get-Date
  }
  
  $script:CollectedErrors += $errorObject
}

function Add-TaskWarning {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TaskName,
    
    [Parameter(Mandatory = $true)]
    [string]$WarningMessage,
    
    [string]$FilePath = "",
    [string]$LineNumber = "",
    [string]$ColumnNumber = "",
    [string]$WarningCode = "",
    [string]$SuggestedFix = ""
  )
  
  $warningObject = @{
    TaskName = $TaskName
    WarningMessage = $WarningMessage
    FilePath = $FilePath
    LineNumber = $LineNumber
    ColumnNumber = $ColumnNumber
    WarningCode = $WarningCode
    SuggestedFix = $SuggestedFix
    Timestamp = Get-Date
  }
  
  $script:CollectedWarnings += $warningObject
}

function Invoke-TaskWithErrorCollection {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TaskName,
    
    [Parameter(Mandatory = $true)]
    [scriptblock]$ScriptBlock
  )
  
  if ($script:CollectAllErrors) {
    try {
      Write-Host "Running $TaskName... " -ForegroundColor Cyan -NoNewline
      & $ScriptBlock
      Write-Host "✅ $TaskName" -ForegroundColor Green
      return $true
    }
    catch {
      Write-Host "❌ $TaskName (errors collected)" -ForegroundColor Red
      Add-TaskError -TaskName $TaskName -ErrorMessage $_.Exception.Message
      return $false
    }
  }
  else {
    # Normal execution - throw errors
    & $ScriptBlock
  }
}

function Format-LintError {
  param(
    [Parameter(Mandatory = $true)]
    [string]$TaskName,
    
    [Parameter(Mandatory = $true)]
    [string]$RawOutput
  )
  
  # Parse different linter output formats and extract structured error information
  $lines = $RawOutput -split "`n"
  
  foreach ($line in $lines) {
    if ($line -match "ERROR|WARN|FAIL") {
      # Try to extract file:line:column pattern
      if ($line -match "([^:\s]+):(\d+):(\d+)\s*(.*)") {
        $filePath = $matches[1]
        $lineNum = $matches[2]
        $colNum = $matches[3]
        $message = $matches[4]
        
        if ($line -match "ERROR|FAIL") {
          Add-TaskError -TaskName $TaskName -ErrorMessage $message -FilePath $filePath -LineNumber $lineNum -ColumnNumber $colNum
        }
        else {
          Add-TaskWarning -TaskName $TaskName -WarningMessage $message -FilePath $filePath -LineNumber $lineNum -ColumnNumber $colNum
        }
      }
      else {
        # Generic error without specific location
        if ($line -match "ERROR|FAIL") {
          Add-TaskError -TaskName $TaskName -ErrorMessage $line
        }
        else {
          Add-TaskWarning -TaskName $TaskName -WarningMessage $line
        }
      }
    }
  }
}

function Write-ComprehensiveErrorReport {
  if ($script:CollectedErrors.Count -eq 0 -and $script:CollectedWarnings.Count -eq 0) {
    Write-Host "`n🎉 ALL CHECKS PASSED! No errors or warnings found." -ForegroundColor Green
    return
  }

  Write-Host "`n=== COMPREHENSIVE ERROR REPORT ===" -ForegroundColor Cyan
  Write-Host ""

  # Group errors by task
  $errorsByTask = $script:CollectedErrors | Group-Object TaskName
  $warningsByTask = $script:CollectedWarnings | Group-Object TaskName

  # Display errors by category
  foreach ($taskGroup in $errorsByTask) {
    $taskName = $taskGroup.Name
    $errors = $taskGroup.Group
    
    Write-Host "🔴 $($taskName.ToUpper()) ERRORS ($($errors.Count)):" -ForegroundColor Red
    
    foreach ($error in $errors) {
      Write-Host "  ERROR: " -ForegroundColor Red -NoNewline
      
      if ($error.FilePath -and $error.LineNumber) {
        Write-Host "$($error.FilePath):$($error.LineNumber)" -ForegroundColor Yellow -NoNewline
        if ($error.ColumnNumber) {
          Write-Host ":$($error.ColumnNumber)" -ForegroundColor Yellow -NoNewline
        }
        if ($error.ErrorCode) {
          Write-Host " [$($error.ErrorCode)]" -ForegroundColor Magenta -NoNewline
        }
        Write-Host ""
        Write-Host "    $($error.ErrorMessage)" -ForegroundColor White
      }
      else {
        Write-Host "$($error.ErrorMessage)" -ForegroundColor White
      }
      
      if ($error.SuggestedFix) {
        Write-Host "    Fix: $($error.SuggestedFix)" -ForegroundColor Green
      }
      Write-Host ""
    }
  }

  # Display warnings by category
  foreach ($taskGroup in $warningsByTask) {
    $taskName = $taskGroup.Name
    $warnings = $taskGroup.Group
    
    Write-Host "⚠️ $($taskName.ToUpper()) WARNINGS ($($warnings.Count)):" -ForegroundColor Yellow
    
    foreach ($warning in $warnings) {
      Write-Host "  WARNING: " -ForegroundColor Yellow -NoNewline
      
      if ($warning.FilePath -and $warning.LineNumber) {
        Write-Host "$($warning.FilePath):$($warning.LineNumber)" -ForegroundColor Yellow -NoNewline
        if ($warning.ColumnNumber) {
          Write-Host ":$($warning.ColumnNumber)" -ForegroundColor Yellow -NoNewline
        }
        if ($warning.WarningCode) {
          Write-Host " [$($warning.WarningCode)]" -ForegroundColor Magenta -NoNewline
        }
        Write-Host ""
        Write-Host "    $($warning.WarningMessage)" -ForegroundColor White
      }
      else {
        Write-Host "$($warning.WarningMessage)" -ForegroundColor White
      }
      
      if ($warning.SuggestedFix) {
        Write-Host "    Fix: $($warning.SuggestedFix)" -ForegroundColor Green
      }
      Write-Host ""
    }
  }

  # Generate batch fix commands
  Write-Host "=== BATCH FIX COMMANDS ===" -ForegroundColor Cyan
  Write-Host ""

  $autoFixableCommands = @()
  $manualFixes = @()

  # Analyze errors for auto-fixable issues
  $markdownErrors = $script:CollectedErrors | Where-Object { $_.TaskName -eq "Markdown" }
  if ($markdownErrors.Count -gt 0) {
    $autoFixableCommands += "# Fix markdown issues"
    $autoFixableCommands += "markdownlint --fix **/*.md"
  }

  $formattingErrors = $script:CollectedErrors | Where-Object { $_.TaskName -eq "Formatting" }
  if ($formattingErrors.Count -gt 0) {
    $autoFixableCommands += "# Fix formatting issues"
    $autoFixableCommands += "pnpm format:fix"
  }

  $securityWarnings = $script:CollectedWarnings | Where-Object { $_.TaskName -eq "Security" -and $_.WarningMessage -match "vulnerabilit" }
  if ($securityWarnings.Count -gt 0) {
    $autoFixableCommands += "# Fix security vulnerabilities"
    $autoFixableCommands += "pnpm audit fix"
  }

  if ($autoFixableCommands.Count -gt 0) {
    Write-Host "📝 IMMEDIATE FIXES:" -ForegroundColor Green
    foreach ($cmd in $autoFixableCommands) {
      Write-Host "$cmd" -ForegroundColor Gray
    }
    Write-Host ""
  }

  # List manual fixes needed
  $codeErrors = $script:CollectedErrors | Where-Object { $_.FilePath -and $_.TaskName -in @("TypeScript", "Type Check", "Tests") }
  if ($codeErrors.Count -gt 0) {
    Write-Host "🔧 CODE FIXES NEEDED:" -ForegroundColor Yellow
    $fixNumber = 1
    foreach ($error in $codeErrors) {
      if ($error.FilePath -and $error.LineNumber) {
        Write-Host "$fixNumber. $($error.FilePath):$($error.LineNumber)" -ForegroundColor Yellow -NoNewline
        if ($error.ColumnNumber) {
          Write-Host ":$($error.ColumnNumber)" -ForegroundColor Yellow -NoNewline
        }
        Write-Host " - $($error.ErrorMessage)" -ForegroundColor White
        $fixNumber++
      }
    }
    Write-Host ""
  }

  # Summary
  Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
  $totalErrors = $script:CollectedErrors.Count
  $totalWarnings = $script:CollectedWarnings.Count
  $autoFixable = $autoFixableCommands.Count
  $manualFixes = $codeErrors.Count

  Write-Host "Total Issues: $totalErrors errors, $totalWarnings warnings" -ForegroundColor White
  if ($autoFixable -gt 0) {
    Write-Host "Auto-fixable: $autoFixable categories (formatting, markdown, vulnerabilities)" -ForegroundColor Green
  }
  if ($manualFixes -gt 0) {
    Write-Host "Manual fixes: $manualFixes (code changes, test fixes)" -ForegroundColor Yellow
  }
  Write-Host ""

  if ($totalErrors -gt 0) {
    Write-Host "Status: ❌ FAILED - $totalErrors errors need fixes" -ForegroundColor Red
    Write-Host "Next: Run batch fix commands above, then fix code issues manually" -ForegroundColor Yellow
  }
  elseif ($totalWarnings -gt 0) {
    Write-Host "Status: ⚠️ WARNINGS - $totalWarnings warnings to review" -ForegroundColor Yellow
    Write-Host "Next: Review warnings and apply fixes as needed" -ForegroundColor Cyan
  }
}

# Default task
Task Default -Depends Lint

# Main linting task that runs all linters and tests (matches GitHub Actions lint job)
Task Lint -Depends LintMarkdown, LintJson, LintYaml, LintTypeScript, CheckFormatting, CheckNewlines, CheckSecurity, CheckApiHealth, Test {
  Write-Host "`nAll linting checks and tests completed! ✓" -ForegroundColor Green
}

# Type checking task (matches GitHub Actions type-check job)
Task TypeCheck {
  function Invoke-TypeCheckWithDetails {
    Write-Host "`nRunning TypeScript type checking..." -ForegroundColor Cyan
      
    if (-not (Test-Command "pnpm")) {
      throw "pnpm not found. Please install pnpm first."
    }
      
    Push-Location $PSScriptRoot
    try {
      $hasErrors = $false
      
      # Type check API (matches GitHub Actions)
      Write-Host "Type checking API..." -ForegroundColor Cyan
      $apiResult = Start-Process -FilePath "pnpm" -ArgumentList @("--filter", "./apps/api", "run", "type-check") -Wait -PassThru -NoNewWindow -RedirectStandardOutput "api-typecheck.log" -RedirectStandardError "api-typecheck-err.log"
      
      if ($apiResult.ExitCode -ne 0) {
        $hasErrors = $true
        if (Test-Path "api-typecheck-err.log") {
          $apiErrors = Get-Content "api-typecheck-err.log" -Raw
          if ($apiErrors -and $apiErrors.Trim()) {
            $lines = $apiErrors -split "`n"
            foreach ($line in $lines) {
              if ($line -match "^(.+?)\((\d+),(\d+)\): error (.+): (.+)$") {
                if ($script:CollectAllErrors) {
                  Add-TaskError -TaskName "TypeCheck" -ErrorMessage $Matches[5] -FilePath $Matches[1] -LineNumber $Matches[2] -ColumnNumber $Matches[3] -ErrorCode $Matches[4]
                } else {
                  Write-Host "❌ $($Matches[1]):$($Matches[2]):$($Matches[3]) - $($Matches[5])" -ForegroundColor Red
                }
              }
              elseif ($line.Trim() -and $line -notmatch "^$" -and $line -notmatch "Found \d+ error") {
                if ($script:CollectAllErrors) {
                  Add-TaskError -TaskName "TypeCheck" -ErrorMessage $line.Trim() -FilePath "API"
                } else {
                  Write-Host "❌ API: $($line.Trim())" -ForegroundColor Red
                }
              }
            }
          }
        }
        Write-Host "❌ API type check failed with exit code $($apiResult.ExitCode)" -ForegroundColor Red
      } else {
        Write-Host "✓ API type check passed" -ForegroundColor Green
      }
      
      # Clean up temp files
      if (Test-Path "api-typecheck.log") { Remove-Item "api-typecheck.log" -Force }
      if (Test-Path "api-typecheck-err.log") { Remove-Item "api-typecheck-err.log" -Force }
          
      # Type check Web (matches GitHub Actions)
      if (Test-Path "apps/web/package.json") {
        Write-Host "Type checking Web..." -ForegroundColor Cyan
        $webResult = Start-Process -FilePath "pnpm" -ArgumentList @("--filter", "./apps/web", "run", "type-check") -Wait -PassThru -NoNewWindow -RedirectStandardOutput "web-typecheck.log" -RedirectStandardError "web-typecheck-err.log"
        
        if ($webResult.ExitCode -ne 0) {
          $hasErrors = $true
          if (Test-Path "web-typecheck-err.log") {
            $webErrors = Get-Content "web-typecheck-err.log" -Raw
            if ($webErrors -and $webErrors.Trim()) {
              $lines = $webErrors -split "`n"
              foreach ($line in $lines) {
                if ($line -match "^(.+?)\((\d+),(\d+)\): error (.+): (.+)$") {
                  if ($script:CollectAllErrors) {
                    Add-TaskError -TaskName "TypeCheck" -ErrorMessage $Matches[5] -FilePath $Matches[1] -LineNumber $Matches[2] -ColumnNumber $Matches[3] -ErrorCode $Matches[4]
                  } else {
                    Write-Host "❌ $($Matches[1]):$($Matches[2]):$($Matches[3]) - $($Matches[5])" -ForegroundColor Red
                  }
                }
                elseif ($line.Trim() -and $line -notmatch "^$" -and $line -notmatch "Found \d+ error") {
                  if ($script:CollectAllErrors) {
                    Add-TaskError -TaskName "TypeCheck" -ErrorMessage $line.Trim() -FilePath "Web"
                  } else {
                    Write-Host "❌ Web: $($line.Trim())" -ForegroundColor Red
                  }
                }
              }
            }
          }
          Write-Host "❌ Web type check failed with exit code $($webResult.ExitCode)" -ForegroundColor Red
        } else {
          Write-Host "✓ Web type check passed" -ForegroundColor Green
        }
        
        # Clean up temp files
        if (Test-Path "web-typecheck.log") { Remove-Item "web-typecheck.log" -Force }
        if (Test-Path "web-typecheck-err.log") { Remove-Item "web-typecheck-err.log" -Force }
      }
      else {
        Write-Host "No web package found - skipping web type check" -ForegroundColor Yellow
      }
      
      if (-not $hasErrors) {
        Write-Host "✓ All type checks passed" -ForegroundColor Green
      } else {
        if (-not $script:CollectAllErrors) {
          throw "Type check failed - see errors above"
        }
      }
    }
    finally {
      Pop-Location
    }
  }

  if ($script:CollectAllErrors) {
    Invoke-TaskWithErrorCollection -TaskName "TypeCheck" -ScriptBlock {
      Invoke-TypeCheckWithDetails
    }
  } else {
    Invoke-TypeCheckWithDetails
  }
}

# Build task (matches GitHub Actions build job)
Task Build -Alias apps-build -Depends Lint, TypeCheck {
  Write-Host "`nBuilding applications..." -ForegroundColor Cyan
    
  if (-not (Test-Command "pnpm")) {
    throw "pnpm not found. Please install pnpm first."
  }
    
  Push-Location $PSScriptRoot
  try {
    # Build shared types first if they exist
    if (Test-Path "packages/shared-types/package.json") {
      Write-Host "Building shared types..." -ForegroundColor Cyan
      exec { pnpm --filter ./packages/shared-types run build } "Shared types build failed"
      Write-Host "✓ Shared types build passed" -ForegroundColor Green
    }
        
    # Build API (matches GitHub Actions)
    Write-Host "Building API..." -ForegroundColor Cyan
    exec { pnpm --filter ./apps/api run build } "API build failed"
    Write-Host "✓ API build passed" -ForegroundColor Green
        
    # Build Web (matches GitHub Actions)
    if (Test-Path "apps/web/package.json") {
      Write-Host "Building Web..." -ForegroundColor Cyan
      exec { pnpm --filter ./apps/web run build } "Web build failed"
      Write-Host "✓ Web build passed" -ForegroundColor Green
    }
    else {
      Write-Host "No web package found - skipping web build" -ForegroundColor Yellow
    }
        
    Write-Host "✓ All builds completed successfully" -ForegroundColor Green
  }
  finally {
    Pop-Location
  }
}

# Markdown linting task
Task LintMarkdown {
  Invoke-TaskWithErrorCollection -TaskName "Markdown" -ScriptBlock {
    if (-not $script:CollectAllErrors) {
      Write-Host "`nChecking Markdown files..." -ForegroundColor Cyan
    }
      
    # Check if markdownlint is available via npx or globally
    $markdownLintAvailable = $false
    try {
      $null = & npx markdownlint-cli --version 2>$null
      if ($LASTEXITCODE -eq 0) {
        $markdownLintAvailable = $true
      }
    }
    catch {
      if (Test-Command "markdownlint") {
        $markdownLintAvailable = $true
      }
    }
      
    if (-not $markdownLintAvailable) {
      if ($script:CollectAllErrors) {
        Add-TaskError -TaskName "Markdown" -ErrorMessage "markdownlint not found" -SuggestedFix "npm install -g markdownlint-cli"
        return
      }
      else {
        throw "markdownlint not found. Install with: npm install -g markdownlint-cli"
      }
    }
      
    $mdFiles = Get-ChildItem -Path $PSScriptRoot -Filter "*.md" -Recurse | 
    Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.bmad-core*" }
      
    if ($mdFiles.Count -eq 0) {
      if (-not $script:CollectAllErrors) {
        Write-Host "No markdown files found to lint" -ForegroundColor Cyan
      }
      return
    }
      
    if (-not $script:CollectAllErrors) {
      Write-Host "Found $($mdFiles.Count) markdown files" -ForegroundColor Cyan
    }
      
    Push-Location $PSScriptRoot
    try {
      $output = ""
      $errorOutput = ""
      
      # Use the appropriate command (global or npx)
      if (Test-Command "markdownlint") {
        if ($script:MarkdownFixMode -or $MarkdownFix) {
          $output = & markdownlint "**/*.md" --ignore "**/node_modules/**" --ignore "**/.bmad-core/**" --ignore "infrastructure/__tests__/node_modules/**" --config config/.markdownlint.json --fix 2>&1
        }
        else {
          $output = & markdownlint "**/*.md" --ignore "**/node_modules/**" --ignore "**/.bmad-core/**" --ignore "infrastructure/__tests__/node_modules/**" --config config/.markdownlint.json 2>&1
        }
      }
      else {
        if ($script:MarkdownFixMode -or $MarkdownFix) {
          $output = & npx markdownlint-cli "**/*.md" --ignore "**/node_modules/**" --ignore "**/.bmad-core/**" --ignore "infrastructure/__tests__/node_modules/**" --config config/.markdownlint.json --fix 2>&1
        }
        else {
          $output = & npx markdownlint-cli "**/*.md" --ignore "**/node_modules/**" --ignore "**/.bmad-core/**" --ignore "infrastructure/__tests__/node_modules/**" --config config/.markdownlint.json 2>&1
        }
      }
      
      if ($LASTEXITCODE -ne 0) {
        if ($script:CollectAllErrors) {
          # Parse markdownlint output for structured errors
          $lines = $output -split "`n"
          foreach ($line in $lines) {
            if ($line -match "^([^:]+):(\d+):?(\d+)?\s+(.+?)\s+(.+)$") {
              $filePath = $matches[1]
              $lineNum = $matches[2]
              $colNum = if ($matches[3]) { $matches[3] } else { "1" }
              $errorCode = $matches[4]
              $message = $matches[5]
              
              Add-TaskError -TaskName "Markdown" -ErrorMessage $message -FilePath $filePath -LineNumber $lineNum -ColumnNumber $colNum -ErrorCode $errorCode -SuggestedFix "markdownlint --fix $filePath"
            }
            elseif ($line -match "^([^:]+):(\d+)\s+(.+)$") {
              $filePath = $matches[1]
              $lineNum = $matches[2]
              $message = $matches[3]
              
              Add-TaskError -TaskName "Markdown" -ErrorMessage $message -FilePath $filePath -LineNumber $lineNum -SuggestedFix "markdownlint --fix $filePath"
            }
            elseif ($line.Trim() -and -not ($line -match "^npm")) {
              Add-TaskError -TaskName "Markdown" -ErrorMessage $line.Trim()
            }
          }
        }
        else {
          throw "Markdown linting failed"
        }
      }
      else {
        if (-not $script:CollectAllErrors) {
          Write-Host "✓ Markdown linting passed" -ForegroundColor Green
        }
      }
    }
    finally {
      Pop-Location
    }
  }
}

# JSON linting task
Task LintJson {
  Invoke-TaskWithErrorCollection -TaskName "JSON" -ScriptBlock {
    if (-not $script:CollectAllErrors) {
      Write-Host "`nChecking JSON files..." -ForegroundColor Cyan
    }
      
    # Check if jsonlint is available via npx or globally
    $jsonlintAvailable = $false
    try {
      $null = & npx jsonlint --version 2>$null
      if ($LASTEXITCODE -eq 0) {
        $jsonlintAvailable = $true
      }
    }
    catch {
      if (Test-Command "jsonlint") {
        $jsonlintAvailable = $true
      }
    }
      
    if (-not $jsonlintAvailable) {
      if ($script:CollectAllErrors) {
        Add-TaskError -TaskName "JSON" -ErrorMessage "jsonlint not found" -SuggestedFix "npm install -g jsonlint"
        return
      }
      else {
        throw "jsonlint not found. Install with: npm install -g jsonlint"
      }
    }
      
    $jsonFiles = Get-ChildItem -Path $PSScriptRoot -Filter "*.json" -Recurse -File | 
    Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.bmad-core*" }
      
    if ($jsonFiles.Count -eq 0) {
      if (-not $script:CollectAllErrors) {
        Write-Host "No JSON files found to lint" -ForegroundColor Cyan
      }
      return
    }
      
    if (-not $script:CollectAllErrors) {
      Write-Host "Found $($jsonFiles.Count) JSON files" -ForegroundColor Cyan
    }
      
    $hasErrors = $false
    foreach ($file in $jsonFiles) {
      try {
        $output = ""
        if (Test-Command "jsonlint") {
          $output = & jsonlint $file.FullName -q 2>&1
        }
        else {
          $output = & npx jsonlint $file.FullName -q 2>&1
        }
        
        if ($LASTEXITCODE -ne 0) {
          $hasErrors = $true
          if ($script:CollectAllErrors) {
            Add-TaskError -TaskName "JSON" -ErrorMessage "Invalid JSON syntax" -FilePath $file.FullName -SuggestedFix "Check JSON syntax in $($file.Name)"
          }
          else {
            Write-Host "✗ $($file.Name)" -ForegroundColor Red
          }
        }
        else {
          if (-not $script:CollectAllErrors) {
            Write-Host "✓ $($file.Name)" -ForegroundColor DarkGreen
          }
        }
      }
      catch {
        $hasErrors = $true
        if ($script:CollectAllErrors) {
          Add-TaskError -TaskName "JSON" -ErrorMessage $_.Exception.Message -FilePath $file.FullName
        }
        else {
          Write-Host "✗ $($file.Name)" -ForegroundColor Red
        }
      }
    }
      
    if ($hasErrors -and -not $script:CollectAllErrors) {
      throw "JSON linting failed for one or more files"
    }
      
    if (-not $hasErrors -and -not $script:CollectAllErrors) {
      Write-Host "✓ JSON linting passed" -ForegroundColor Green
    }
  }
}

# YAML linting task
Task LintYaml {
  Invoke-TaskWithErrorCollection -TaskName "YAML" -ScriptBlock {
    if (-not $script:CollectAllErrors) {
      Write-Host "`nChecking YAML files..." -ForegroundColor Cyan
    }
      
    # Use a more robust approach to find YAML files including hidden directories
    $yamlFiles = @()
    $yamlFiles += Get-ChildItem -Path $PSScriptRoot -Filter "*.yml" -Recurse -Force
    $yamlFiles += Get-ChildItem -Path $PSScriptRoot -Filter "*.yaml" -Recurse -Force
    $yamlFiles = $yamlFiles | Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.bmad-core*" }
      
    if ($yamlFiles.Count -eq 0) {
      if (-not $script:CollectAllErrors) {
        Write-Host "No YAML files found to lint" -ForegroundColor Cyan
      }
      return
    }
      
    if (-not $script:CollectAllErrors) {
      Write-Host "Found $($yamlFiles.Count) YAML files" -ForegroundColor Cyan
      Write-Host "Files found:" -ForegroundColor Cyan
      $yamlFiles | ForEach-Object { Write-Host "  $($_.FullName)" -ForegroundColor Gray }
    }
      
    $fileList = $yamlFiles | ForEach-Object { $_.FullName }
      
    Push-Location $PSScriptRoot
    try {
      # Run yaml-lint with config file to catch all issues
      $arguments = @("yaml-lint", "--config-file", "config/.yaml-lint.json") + $fileList
      $output = & npx $arguments 2>&1
      
      if ($LASTEXITCODE -ne 0) {
        if ($script:CollectAllErrors) {
          # Parse yaml-lint output for structured errors
          $lines = $output -split "`n"
          foreach ($line in $lines) {
            if ($line -match "^([^:]+):(\d+):(\d+)\s+(.+)$") {
              $filePath = $matches[1]
              $lineNum = $matches[2]
              $colNum = $matches[3]
              $message = $matches[4]
              
              if ($message -match "error") {
                Add-TaskError -TaskName "YAML" -ErrorMessage $message -FilePath $filePath -LineNumber $lineNum -ColumnNumber $colNum -SuggestedFix "Check YAML syntax in $filePath"
              }
              else {
                Add-TaskWarning -TaskName "YAML" -WarningMessage $message -FilePath $filePath -LineNumber $lineNum -ColumnNumber $colNum -SuggestedFix "Review YAML formatting in $filePath"
              }
            }
            elseif ($line.Trim() -and -not ($line -match "^npm|^>")) {
              Add-TaskError -TaskName "YAML" -ErrorMessage $line.Trim()
            }
          }
        }
        else {
          throw "YAML linting failed"
        }
      }
      else {
        if (-not $script:CollectAllErrors) {
          Write-Host "✓ YAML linting passed" -ForegroundColor Green
        }
      }
    }
    finally {
      Pop-Location
    }
  }
}

# TypeScript/JavaScript linting task
Task LintTypeScript {
  Invoke-TaskWithErrorCollection -TaskName "TypeScript" -ScriptBlock {
    if (-not $script:CollectAllErrors) {
      Write-Host "`nChecking TypeScript/JavaScript files..." -ForegroundColor Cyan
    }
      
    # Check if we have a package.json and pnpm workspace
    if (Test-Path "package.json") {
      $packageJson = Get-Content "package.json" | ConvertFrom-Json
          
      # Check if lint script exists in package.json
      if ($packageJson.scripts -and $packageJson.scripts.lint) {
        if (-not $script:CollectAllErrors) {
          Write-Host "Using pnpm workspace lint script..." -ForegroundColor Cyan
        }
              
        # Use npm run lint as fallback if pnpm is not available
        $lintCommand = if (Test-Command "pnpm") { "pnpm" } else { "npm run" }
              
        Push-Location $PSScriptRoot
        try {
          $output = ""
          if ($lintCommand -eq "pnpm") {
            $output = & pnpm lint 2>&1
          }
          else {
            $output = & npm run lint 2>&1
          }
          
          if ($LASTEXITCODE -ne 0) {
            if ($script:CollectAllErrors) {
              # Parse ESLint/TypeScript output for structured errors
              $lines = $output -split "`n"
              $currentFile = ""
              foreach ($line in $lines) {
                # Track current file being processed (ESLint format: /path/to/file.ts or relative path)
                # Also match lines that end with TypeScript/JavaScript extensions (common ESLint format)
                if ($line -match "^(/[^:]+\.(?:ts|js|tsx|jsx))$" -or $line -match "^([a-zA-Z]:[^:]+\.(?:ts|js|tsx|jsx))$" -or $line -match "^((?:src/|apps/|\.\.?/)[^:]+\.(?:ts|js|tsx|jsx))$" -or $line -match "^([^/\\\s:]+\.(?:ts|js|tsx|jsx))$" -or $line -match "^(.*\.(?:ts|js|tsx|jsx))$") {
                  $currentFile = $matches[1].Trim()
                  # Convert relative paths to full paths for consistency
                  if (-not ([System.IO.Path]::IsPathRooted($currentFile))) {
                    $currentFile = Join-Path $PSScriptRoot $currentFile
                    $currentFile = [System.IO.Path]::GetFullPath($currentFile)
                  }
                  continue
                }
                if ($line -match "^([^:]+):(\d+):(\d+):\s+(error|warning)\s+(.+?)\s+(.+)$") {
                  $filePath = $matches[1]
                  $lineNum = $matches[2]
                  $colNum = $matches[3]
                  $severity = $matches[4]
                  $message = $matches[5]
                  $ruleCode = $matches[6]
                  
                  if ($severity -eq "error") {
                    Add-TaskError -TaskName "TypeScript" -ErrorMessage $message -FilePath $filePath -LineNumber $lineNum -ColumnNumber $colNum -ErrorCode $ruleCode -SuggestedFix "Review ESLint rule: $ruleCode"
                  }
                  else {
                    Add-TaskWarning -TaskName "TypeScript" -WarningMessage $message -FilePath $filePath -LineNumber $lineNum -ColumnNumber $colNum -WarningCode $ruleCode -SuggestedFix "Review ESLint rule: $ruleCode"
                  }
                }
                elseif ($line -match "^\s*(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(@[\w-]+/[\w-]+|\w+)$") {
                  # ESLint error format without file path: line:col  error  message  @rule-name
                  $lineNum = $matches[1]
                  $colNum = $matches[2]
                  $severity = $matches[3]
                  $message = $matches[4]
                  $ruleCode = $matches[5]
                  
                  # Use currentFile if available, otherwise try to parse more contexts
                  $filePath = if ($currentFile) { $currentFile } else { "Unknown file" }
                  
                  if ($severity -eq "error") {
                    Add-TaskError -TaskName "TypeScript" -ErrorMessage $message -FilePath $filePath -LineNumber $lineNum -ColumnNumber $colNum -ErrorCode $ruleCode -SuggestedFix "Review ESLint rule: $ruleCode"
                  }
                  else {
                    Add-TaskWarning -TaskName "TypeScript" -WarningMessage $message -FilePath $filePath -LineNumber $lineNum -ColumnNumber $colNum -WarningCode $ruleCode -SuggestedFix "Review ESLint rule: $ruleCode"
                  }
                }
                elseif ($line -match "^([^(]+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$") {
                  # TypeScript compiler error format: src/file.ts(line,col): error TSxxxx: message
                  $filePath = $matches[1]
                  $lineNum = $matches[2] 
                  $colNum = $matches[3]
                  $errorCode = $matches[4]
                  $message = $matches[5]
                  
                  Add-TaskError -TaskName "TypeScript" -ErrorMessage $message -FilePath $filePath -LineNumber $lineNum -ColumnNumber $colNum -ErrorCode $errorCode -SuggestedFix "Fix TypeScript error: $errorCode"
                }
                elseif ($line -match "error TS\d+") {
                  # Fallback for other TypeScript error formats
                  Add-TaskError -TaskName "TypeScript" -ErrorMessage $line.Trim()
                }
                elseif ($line.Trim() -and -not ($line -match "^>|^npm|^\s*$|found \d+ error")) {
                  if ($line -match "error|failed") {
                    Add-TaskError -TaskName "TypeScript" -ErrorMessage $line.Trim()
                  }
                }
              }
            }
            else {
              throw "TypeScript/JavaScript linting failed"
            }
          }
          else {
            if (-not $script:CollectAllErrors) {
              Write-Host "✓ TypeScript/JavaScript linting passed" -ForegroundColor Green
            }
          }
        }
        finally {
          Pop-Location
        }
      }
      else {
        if (-not $script:CollectAllErrors) {
          Write-Host "No lint script found in package.json - skipping TypeScript/JavaScript linting" -ForegroundColor Yellow
        }
      }
    }
    else {
      if (-not $script:CollectAllErrors) {
        Write-Host "No package.json found - skipping TypeScript/JavaScript linting" -ForegroundColor Yellow
      }
    }
  }
}

# Prettier formatting check task (matches GitHub Actions exactly)
Task CheckFormatting {
  Invoke-TaskWithErrorCollection -TaskName "Formatting" -ScriptBlock {
    if (-not $script:CollectAllErrors) {
      Write-Host "`nChecking code formatting with Prettier..." -ForegroundColor Cyan
    }
      
    # Check if we have a package.json and pnpm workspace
    if (Test-Path "package.json") {
      $packageJson = Get-Content "package.json" | ConvertFrom-Json
          
      # Check if format:check script exists in package.json
      if ($packageJson.scripts -and $packageJson.scripts."format:check") {
        if (-not $script:CollectAllErrors) {
          Write-Host "Running Prettier format check..." -ForegroundColor Cyan
        }
              
        # Use npm run format:check as fallback if pnpm is not available
        $formatCommand = if (Test-Command "pnpm") { "pnpm" } else { "npm run" }
              
        Push-Location $PSScriptRoot
        try {
          $output = ""
          if ($formatCommand -eq "pnpm") {
            $output = & pnpm format:check 2>&1
          }
          else {
            $output = & npm run format:check 2>&1
          }
          
          if ($LASTEXITCODE -ne 0) {
            if ($script:CollectAllErrors) {
              # Parse Prettier output for files that need formatting
              $lines = $output -split "`n"
              $needsFormatting = @()
              foreach ($line in $lines) {
                if ($line -match "\.(ts|js|tsx|jsx|json|md)$" -and -not ($line -match "node_modules")) {
                  $needsFormatting += $line.Trim()
                }
              }
              
              if ($needsFormatting.Count -gt 0) {
                Add-TaskError -TaskName "Formatting" -ErrorMessage "Files need formatting: $($needsFormatting -join ', ')" -SuggestedFix "pnpm format:fix"
              }
              else {
                Add-TaskError -TaskName "Formatting" -ErrorMessage "Prettier format check failed" -SuggestedFix "pnpm format:fix"
              }
            }
            else {
              throw "Prettier format check failed"
            }
          }
          else {
            if (-not $script:CollectAllErrors) {
              Write-Host "✓ Code formatting check passed" -ForegroundColor Green
            }
          }
        }
        finally {
          Pop-Location
        }
      }
      else {
        if (-not $script:CollectAllErrors) {
          Write-Host "No format:check script found in package.json - skipping formatting check" -ForegroundColor Yellow
        }
      }
    }
    else {
      if (-not $script:CollectAllErrors) {
        Write-Host "No package.json found - skipping formatting check" -ForegroundColor Yellow
      }
    }
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
  }
  else {
    Write-Host "✓ All files end with newlines" -ForegroundColor Green
  }
}

# Security checks for dependencies and code
Task CheckSecurity {
  Invoke-TaskWithErrorCollection -TaskName "Security" -ScriptBlock {
    if (-not $script:CollectAllErrors) {
      Write-Host "`nRunning security checks..." -ForegroundColor Cyan
    }
      
    Push-Location $PSScriptRoot
    try {
      # Check for npm audit if pnpm is available
      if ((Test-Path "package.json") -and (Test-Command "pnpm")) {
        if (-not $script:CollectAllErrors) {
          Write-Host "Checking for security vulnerabilities in dependencies..." -ForegroundColor Cyan
        }
              
        try {
          $auditOutput = & pnpm audit --audit-level moderate 2>&1
          if ($LASTEXITCODE -ne 0) {
            if ($script:CollectAllErrors) {
              Add-TaskWarning -TaskName "Security" -WarningMessage "Security vulnerabilities found in dependencies" -SuggestedFix "pnpm audit fix"
            }
            else {
              Write-Host "⚠️  Security vulnerabilities found. Run 'pnpm audit' for details." -ForegroundColor Yellow
            }
          }
          else {
            if (-not $script:CollectAllErrors) {
              Write-Host "✓ No security vulnerabilities found in dependencies" -ForegroundColor Green
            }
          }
        }
        catch {
          if ($script:CollectAllErrors) {
            Add-TaskWarning -TaskName "Security" -WarningMessage "Could not run security audit" -SuggestedFix "Check pnpm installation and try manual audit"
          }
          else {
            Write-Host "⚠️  Security vulnerabilities found. Run 'pnpm audit' for details." -ForegroundColor Yellow
          }
        }
      }
          
      # Check for common security anti-patterns in code
      if (-not $script:CollectAllErrors) {
        Write-Host "Scanning for security anti-patterns..." -ForegroundColor Cyan
      }
      
      $securityIssues = @()
          
      # Look for hardcoded secrets patterns (exclude test and dist files)
      $secretPatterns = @(
        "password\s*[:=]\s*[`"'].*[`"']",
        "secret\s*[:=]\s*[`"'].*[`"']",
        "api_key\s*[:=]\s*[`"'].*[`"']",
        "apikey\s*[:=]\s*[`"'].*[`"']",
        "private_key\s*[:=]\s*[`"'].*[`"']",
        "access_token\s*[:=]\s*[`"'].*[`"']"
      )
          
      $codeFiles = Get-ChildItem -Path $PSScriptRoot -Include "*.ts", "*.js", "*.tsx", "*.jsx" -Recurse |
      Where-Object { 
        $_.FullName -notlike "*node_modules*" -and 
        $_.FullName -notlike "*.bmad-core*" -and 
        $_.FullName -notlike "*\dist\*" -and
        $_.FullName -notlike "*\build\*" -and
        $_.FullName -notlike "*test*" -and
        $_.FullName -notlike "*\.test\.*" -and
        $_.FullName -notlike "*\.spec\.*" -and
        $_.FullName -notlike "*storybook*"
      }
          
      foreach ($file in $codeFiles) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if ($content) {
          foreach ($pattern in $secretPatterns) {
            if ($content -match $pattern) {
              $relativePath = $file.FullName.Replace($PSScriptRoot, "").TrimStart("\", "/")
              if ($script:CollectAllErrors) {
                Add-TaskWarning -TaskName "Security" -WarningMessage "Potential hardcoded secret detected" -FilePath $relativePath -WarningCode "hardcoded-secret" -SuggestedFix "Move sensitive data to environment variables or config files"
              }
              else {
                $securityIssues += "Potential hardcoded secret in $relativePath matches pattern '$pattern'"
              }
            }
          }
        }
      }
          
      if (-not $script:CollectAllErrors) {
        if ($securityIssues.Count -gt 0) {
          Write-Host "⚠️  Security issues found:" -ForegroundColor Yellow
          # Only show first 5 to avoid spam
          $displayIssues = if ($securityIssues.Count -gt 5) { $securityIssues[0..4] + "... and $($securityIssues.Count - 5) more" } else { $securityIssues }
          foreach ($issue in $displayIssues) {
            Write-Host "  $issue" -ForegroundColor Yellow
          }
          Write-Host "Please review and ensure no real secrets are hardcoded" -ForegroundColor Yellow
        }
        else {
          Write-Host "✓ No security anti-patterns detected" -ForegroundColor Green
        }
      }
    }
    finally {
      Pop-Location
    }
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
        # Use tsc directly instead of pnpm type-check to avoid dependency issues
        $tscPath = Join-Path $PSScriptRoot "node_modules/.bin/tsc"
        $tsConfigPath = Join-Path $PSScriptRoot "config/tsconfig.json"
        exec { & $tscPath --project $tsConfigPath --noEmit } "TypeScript type checking failed"
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
      "helmet"  = "^7.1.0"
      "cors"    = "^2.8.5"
    }
        
    $versionIssues = @()
    foreach ($dep in $requiredDeps.GetEnumerator()) {
      if ($packageJson.dependencies -and $packageJson.dependencies.($dep.Key)) {
        $actualVersion = $packageJson.dependencies.($dep.Key)
        # Check if actual version satisfies the required range
        # This is a simplified check - for full semver support, use a proper parser
        if (-not ($actualVersion -match "^\^?\d+\.\d+\.\d+")) {
          $versionIssues += "$($dep.Key): invalid version format $actualVersion"
        }
        elseif ($dep.Value.StartsWith("^") -and -not $actualVersion.StartsWith("^")) {
          # Allow exact versions that would satisfy the caret range
          $requiredMajor = $dep.Value.Substring(1).Split('.')[0]
          $actualMajor = $actualVersion.Split('.')[0]
          if ($actualMajor -ne $requiredMajor) {
            $versionIssues += "$($dep.Key): major version mismatch - expected $($dep.Value), got $actualVersion"
          }
        }
      }
      else {
        $versionIssues += "$($dep.Key): missing dependency"
      }
    }
        
    if ($versionIssues.Count -gt 0) {
      Write-Host "⚠️  Dependency version issues:" -ForegroundColor Yellow
      foreach ($issue in $versionIssues) {
        Write-Host "  $issue" -ForegroundColor Yellow
      }
    }
    else {
      Write-Host "✓ All core dependencies have correct versions" -ForegroundColor Green
    }
        
  }
  finally {
    Pop-Location
  }
}

# Test task
Task Test -Description "Run workspace configuration tests" {
  Invoke-TaskWithErrorCollection -TaskName "Tests" -ScriptBlock {
    if (-not $script:CollectAllErrors) {
      Write-Host "`nRunning workspace configuration tests..." -ForegroundColor Cyan
    }
      
    Push-Location $PSScriptRoot
    try {
      # Run Jest tests if available
      if (Test-Path "package.json") {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
              
        if ($packageJson.scripts -and $packageJson.scripts.test) {
          if (-not $script:CollectAllErrors) {
            Write-Host "Running Jest tests..." -ForegroundColor Cyan
          }
                  
          if (-not (Test-Command "pnpm")) {
            if ($script:CollectAllErrors) {
              Add-TaskError -TaskName "Tests" -ErrorMessage "pnpm not found" -SuggestedFix "Install pnpm: npm install -g pnpm"
              return
            }
            else {
              throw "pnpm not found. Please install pnpm first."
            }
          }
          
          # Run tests with suppressed output when in collect mode
          $output = ""
          if ($script:CollectAllErrors) {
            # Run tests silently and capture output
            $output = & pnpm test --passWithNoTests --silent 2>&1
          }
          else {
            $output = & pnpm test 2>&1
          }
          
          if ($LASTEXITCODE -ne 0) {
            if ($script:CollectAllErrors) {
              # Parse test output for specific failures
              $lines = $output -split "`n"
              $testFailures = @()
              foreach ($line in $lines) {
                if ($line -match "FAIL (.+)") {
                  $testFailures += $matches[1]
                }
                elseif ($line -match "● (.+)") {
                  $testDetails = $matches[1]
                  Add-TaskError -TaskName "Tests" -ErrorMessage "Test failed: $testDetails" -SuggestedFix "Review test logic and fix failing tests"
                }
                elseif ($line -match "Error: (.+)") {
                  Add-TaskError -TaskName "Tests" -ErrorMessage $matches[1] -SuggestedFix "Check test setup and dependencies"
                }
              }
              if ($testFailures.Count -gt 0) {
                Add-TaskError -TaskName "Tests" -ErrorMessage "Failed test files: $($testFailures -join ', ')" -SuggestedFix "Run individual test files to debug issues"
              }
            }
            else {
              throw "Jest tests failed"
            }
          }
          else {
            if (-not $script:CollectAllErrors) {
              Write-Host "✓ Jest tests passed" -ForegroundColor Green
            }
          }
        }
      }
          
      # Run validation script
      if (Test-Path "__tests__/workspace-validation.js") {
        if (-not $script:CollectAllErrors) {
          Write-Host "Running workspace validation script..." -ForegroundColor Cyan
        }
              
        if (-not (Test-Command "node")) {
          if ($script:CollectAllErrors) {
            Add-TaskError -TaskName "Tests" -ErrorMessage "Node.js not found" -SuggestedFix "Install Node.js from https://nodejs.org"
            return
          }
          else {
            throw "Node.js not found. Please install Node.js first."
          }
        }
        
        $output = ""
        if ($script:CollectAllErrors) {
          $output = & node "__tests__/workspace-validation.js" 2>&1
        }
        else {
          $output = & node "__tests__/workspace-validation.js" 2>&1
        }
        
        if ($LASTEXITCODE -ne 0) {
          if ($script:CollectAllErrors) {
            Add-TaskError -TaskName "Tests" -ErrorMessage "Workspace validation failed" -FilePath "__tests__/workspace-validation.js" -SuggestedFix "Check workspace configuration and file structure"
          }
          else {
            throw "Workspace validation failed"
          }
        }
        else {
          if (-not $script:CollectAllErrors) {
            Write-Host "✓ Workspace validation passed" -ForegroundColor Green
          }
        }
      }
          
      # Run API tests with coverage (matches GitHub Actions)
      if (Test-Path "apps/api/package.json") {
        if (-not $script:CollectAllErrors) {
          Write-Host "Running API tests with coverage..." -ForegroundColor Cyan
        }
              
        Push-Location "apps/api"
        try {
          if (Test-Command "pnpm") {
            $output = ""
            if ($script:CollectAllErrors) {
              $output = & pnpm test:coverage --passWithNoTests --silent 2>&1
            }
            else {
              $output = & pnpm test:coverage --passWithNoTests 2>&1
            }
            
            if ($LASTEXITCODE -ne 0) {
              if ($script:CollectAllErrors) {
                Add-TaskError -TaskName "Tests" -ErrorMessage "API tests failed" -FilePath "apps/api" -SuggestedFix "Review API test failures and fix issues"
              }
              else {
                throw "API tests failed"
              }
            }
            else {
              if (-not $script:CollectAllErrors) {
                Write-Host "✓ API tests passed" -ForegroundColor Green
              }
            }
          }
        }
        finally {
          Pop-Location
        }
      }

      # Run Web tests with coverage (matches GitHub Actions)
      if ((Test-Path "apps/web/package.json") -and (Test-Path "apps/web")) {
        if (-not $script:CollectAllErrors) {
          Write-Host "Running Web tests with coverage..." -ForegroundColor Cyan
        }
              
        Push-Location "apps/web"
        try {
          if (Test-Command "pnpm") {
            $output = ""
            if ($script:CollectAllErrors) {
              $output = & pnpm test:coverage --passWithNoTests --silent 2>&1
            }
            else {
              $output = & pnpm test:coverage --passWithNoTests 2>&1
            }
            
            if ($LASTEXITCODE -ne 0) {
              if ($script:CollectAllErrors) {
                Add-TaskError -TaskName "Tests" -ErrorMessage "Web tests failed" -FilePath "apps/web" -SuggestedFix "Review web test failures and fix issues"
              }
              else {
                throw "Web tests failed"
              }
            }
            else {
              if (-not $script:CollectAllErrors) {
                Write-Host "✓ Web tests passed" -ForegroundColor Green
              }
            }
          }
        }
        finally {
          Pop-Location
        }
      }
      else {
        if (-not $script:CollectAllErrors) {
          Write-Host "No web package found - skipping web tests" -ForegroundColor Yellow
        }
      }
          
      if (-not $script:CollectAllErrors) {
        Write-Host "✓ All tests passed" -ForegroundColor Green
      }
    }
    finally {
      Pop-Location
    }
  }
}

# Strict test task that matches GitHub Actions exactly (no --silent flag)
Task TestStrict -Description "Run workspace tests exactly like GitHub Actions - no --silent flag" {
  Invoke-TaskWithErrorCollection -TaskName "Tests" -ScriptBlock {
    if (-not $script:CollectAllErrors) {
      Write-Host "`nRunning workspace tests (strict mode - matches GitHub Actions)..." -ForegroundColor Cyan
    }
      
    Push-Location $PSScriptRoot
    try {
      # Run Jest tests if available
      if (Test-Path "package.json") {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
              
        if ($packageJson.scripts -and $packageJson.scripts.test) {
          if (-not $script:CollectAllErrors) {
            Write-Host "Running Jest tests..." -ForegroundColor Cyan
          }
                  
          if (-not (Test-Command "pnpm")) {
            if ($script:CollectAllErrors) {
              Add-TaskError -TaskName "Tests" -ErrorMessage "pnpm not found" -SuggestedFix "Install pnpm: npm install -g pnpm"
              return
            }
            else {
              throw "pnpm not found. Please install pnpm first."
            }
          }
          
          # Run tests - suppress output when collecting errors, show when running directly
          $output = ""
          if ($script:CollectAllErrors) {
            # Silent mode for CICollectAll - capture output but don't display
            $output = & pnpm test --passWithNoTests --silent 2>&1
          }
          else {
            # Verbose mode when run directly - matches GitHub Actions exactly
            $output = & pnpm test 2>&1
          }
          
          if ($LASTEXITCODE -ne 0) {
            if ($script:CollectAllErrors) {
              # Parse test output for specific failures
              $lines = $output -split "`n"
              $testFailures = @()
              foreach ($line in $lines) {
                if ($line -match "FAIL (.+)") {
                  $testFailures += $matches[1]
                }
                elseif ($line -match "● (.+)") {
                  $testDetails = $matches[1]
                  Add-TaskError -TaskName "Tests" -ErrorMessage "Test failed: $testDetails" -SuggestedFix "Review test logic and fix failing tests"
                }
                elseif ($line -match "Error: (.+)") {
                  Add-TaskError -TaskName "Tests" -ErrorMessage $matches[1] -SuggestedFix "Check test setup and dependencies"
                }
              }
              if ($testFailures.Count -gt 0) {
                Add-TaskError -TaskName "Tests" -ErrorMessage "Failed test files: $($testFailures -join ', ')" -SuggestedFix "Run individual test files to debug issues"
              }
            }
            else {
              throw "Jest tests failed"
            }
          }
          else {
            if (-not $script:CollectAllErrors) {
              Write-Host "✓ Jest tests passed" -ForegroundColor Green
            }
          }
        }
      }
          
      # Run validation script
      if (Test-Path "__tests__/workspace-validation.js") {
        if (-not $script:CollectAllErrors) {
          Write-Host "Running workspace validation script..." -ForegroundColor Cyan
        }
              
        if (-not (Test-Command "node")) {
          if ($script:CollectAllErrors) {
            Add-TaskError -TaskName "Tests" -ErrorMessage "Node.js not found" -SuggestedFix "Install Node.js from https://nodejs.org"
            return
          }
          else {
            throw "Node.js not found. Please install Node.js first."
          }
        }
        
        $output = ""
        if ($script:CollectAllErrors) {
          $output = & node "__tests__/workspace-validation.js" 2>&1
        }
        else {
          $output = & node "__tests__/workspace-validation.js" 2>&1
        }
        
        if ($LASTEXITCODE -ne 0) {
          if ($script:CollectAllErrors) {
            Add-TaskError -TaskName "Tests" -ErrorMessage "Workspace validation failed" -FilePath "__tests__/workspace-validation.js" -SuggestedFix "Check workspace configuration and file structure"
          }
          else {
            throw "Workspace validation failed"
          }
        }
        else {
          if (-not $script:CollectAllErrors) {
            Write-Host "✓ Workspace validation passed" -ForegroundColor Green
          }
        }
      }
          
      # Run API tests with coverage (matches GitHub Actions exactly)
      if (Test-Path "apps/api/package.json") {
        if (-not $script:CollectAllErrors) {
          Write-Host "Running API tests with coverage..." -ForegroundColor Cyan
        }
              
        Push-Location "apps/api"
        try {
          if (Test-Command "pnpm") {
            $output = ""
            # Use exact same command as GitHub Actions (no --silent to catch failures)
            $output = & pnpm test:coverage --passWithNoTests 2>&1
            
            if ($LASTEXITCODE -ne 0) {
              if ($script:CollectAllErrors) {
                # Parse test output for specific failures
                $lines = $output -split "`n"
                $testFailures = @()
                $hasModuleErrors = $false
                
                foreach ($line in $lines) {
                  if ($line -match "FAIL (.+)") {
                    $testFailures += $matches[1]
                  }
                  elseif ($line -match "Cannot find module '(.+)'" -or $line -match "Module not found: (.+)") {
                    $hasModuleErrors = $true
                    Add-TaskError -TaskName "Tests" -ErrorMessage "Missing module: $($matches[1])" -FilePath "apps/api" -SuggestedFix "Install missing dependencies or create missing files"
                  }
                  elseif ($line -match "● (.+)") {
                    $testDetails = $matches[1]
                    Add-TaskError -TaskName "Tests" -ErrorMessage "Test failed: $testDetails" -FilePath "apps/api" -SuggestedFix "Review test logic and fix failing tests"
                  }
                  elseif ($line -match "Error: (.+)" -and $line -notmatch "npm|pnpm") {
                    Add-TaskError -TaskName "Tests" -ErrorMessage $matches[1] -FilePath "apps/api" -SuggestedFix "Check test setup and dependencies"
                  }
                }
                
                if ($testFailures.Count -gt 0) {
                  Add-TaskError -TaskName "Tests" -ErrorMessage "Failed test files: $($testFailures -join ', ')" -FilePath "apps/api" -SuggestedFix "Run individual test files to debug issues"
                }
                
                if (-not $hasModuleErrors -and $testFailures.Count -eq 0) {
                  Add-TaskError -TaskName "Tests" -ErrorMessage "API tests failed - see output above for details" -FilePath "apps/api" -SuggestedFix "Review API test failures and fix issues"
                }
              }
              else {
                throw "API tests failed"
              }
            }
            else {
              if (-not $script:CollectAllErrors) {
                Write-Host "✓ API tests passed" -ForegroundColor Green
              }
            }
          }
        }
        finally {
          Pop-Location
        }
      }

      # Run Web tests with coverage (matches GitHub Actions exactly)
      if ((Test-Path "apps/web/package.json") -and (Test-Path "apps/web")) {
        if (-not $script:CollectAllErrors) {
          Write-Host "Running Web tests with coverage..." -ForegroundColor Cyan
        }
              
        Push-Location "apps/web"
        try {
          if (Test-Command "pnpm") {
            $output = ""
            # Use exact same command as GitHub Actions but suppress output during collection
            # Web tests pass but have verbose warnings, use --silent always
            $output = & pnpm test:coverage --passWithNoTests --silent 2>&1
            
            if ($LASTEXITCODE -ne 0) {
              if ($script:CollectAllErrors) {
                Add-TaskError -TaskName "Tests" -ErrorMessage "Web tests failed" -FilePath "apps/web" -SuggestedFix "Review web test failures and fix issues"
              }
              else {
                throw "Web tests failed"
              }
            }
            else {
              if (-not $script:CollectAllErrors) {
                Write-Host "✓ Web tests passed" -ForegroundColor Green
              }
            }
          }
        }
        finally {
          Pop-Location
        }
      }
      else {
        if (-not $script:CollectAllErrors) {
          Write-Host "No web package found - skipping web tests" -ForegroundColor Yellow
        }
      }
          
      if (-not $script:CollectAllErrors) {
        Write-Host "✓ All tests passed" -ForegroundColor Green
      }
    }
    finally {
      Pop-Location
    }
  }
}

# Individual convenience tasks
Task Markdown -Alias md -Description "Run only markdown linting" -Depends LintMarkdown
Task Json -Description "Run only JSON linting" -Depends LintJson
Task Yaml -Alias yml -Description "Run only YAML linting" -Depends LintYaml
Task TypeScript -Alias ts -Description "Run only TypeScript/JavaScript linting" -Depends LintTypeScript
Task Formatting -Alias format -Description "Run only Prettier formatting check" -Depends CheckFormatting
Task Newlines -Description "Check that all files end with newlines" -Depends CheckNewlines
Task Security -Description "Run only security checks" -Depends CheckSecurity
Task ApiHealth -Description "Run only API health checks" -Depends CheckApiHealth

# Test-only task equivalent to 'pnpm -r test --if-present'
Task TestWorkspaces -Alias test-all -Description "Run tests in all workspaces (equivalent to 'pnpm -r test --if-present')" -Depends TestStrict

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
  Write-Host "  Invoke-psake CICollectAll       # Run all CI checks, collect all errors (LLM-friendly)" -ForegroundColor Green
  Write-Host "  Invoke-psake ci-collect-all     # Same as above (alias)" -ForegroundColor Green
  Write-Host "  Invoke-psake CI                 # Run CI checks (stops on first error)" -ForegroundColor Gray
  Write-Host "  Invoke-psake Test               # Run tests (with --silent for CI collect mode)" -ForegroundColor Gray
  Write-Host "  Invoke-psake TestStrict         # Run tests exactly like GitHub Actions (no --silent)" -ForegroundColor Yellow
  Write-Host "  Invoke-psake TestWorkspaces     # Run tests in all workspaces (pnpm -r test --if-present)" -ForegroundColor Yellow
  Write-Host "  Invoke-psake Markdown           # Run only markdown linting" -ForegroundColor Gray
  Write-Host "  Invoke-psake FixMarkdown        # Run markdown linting with auto-fix" -ForegroundColor Gray
  Write-Host "  Invoke-psake ?                  # Show this help" -ForegroundColor Gray
}

# Task to ensure dependencies are installed
Task CheckDependencies -Description "Check if all linting tools are installed" {
  Write-Host "`nChecking dependencies..." -ForegroundColor Cyan
    
  $tools = @(
    @{Name = "markdownlint"; Install = "npm install -g markdownlint-cli"; CheckCommand = "markdownlint"; Alternative = "npx markdownlint-cli" },
    @{Name = "jsonlint"; Install = "npm install -g jsonlint"; CheckCommand = "jsonlint"; Alternative = "npx jsonlint" },
    @{Name = "yaml-lint"; Install = "pnpm install (included in dev dependencies)"; CheckCommand = "npx yaml-lint"; IsLocal = $true },
    @{Name = "pnpm"; Install = "npm install -g pnpm"; CheckCommand = "pnpm"; Alternative = "npm" },
    @{Name = "docker"; Install = "Install Docker Desktop from https://docs.docker.com/desktop/"; CheckCommand = "docker"; IsDocker = $true },
    @{Name = "docker-compose"; Install = "Included with Docker Desktop or install separately"; CheckCommand = "docker compose version"; IsDockerCompose = $true }
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
      }
      catch {
        # Tool not available through npx
      }
    }
    elseif ($tool.IsDocker) {
      # Special handling for Docker
      if (Test-Command "docker") {
        Write-Host "✓ $($tool.Name) is installed" -ForegroundColor Green
        $available = $true
      }
    }
    elseif ($tool.IsDockerCompose) {
      # Special handling for Docker Compose - check modern plugin first
      try {
        $null = & docker compose version 2>$null
        if ($LASTEXITCODE -eq 0) {
          Write-Host "✓ $($tool.Name) is available (Docker Compose plugin)" -ForegroundColor Green
          $available = $true
        }
      }
      catch {
        # Try standalone docker-compose
        if (Test-Command "docker-compose") {
          Write-Host "✓ $($tool.Name) is available (standalone docker-compose)" -ForegroundColor Green
          $available = $true
        }
      }
    }
    else {
      # Check primary command
      if (Test-Command $checkCommand) {
        Write-Host "✓ $($tool.Name) is installed" -ForegroundColor Green
        $available = $true
      }
      elseif ($tool.Alternative) {
        # Check alternative command (like npx version)
        try {
          $testCmd = $tool.Alternative.Split(' ')[0]
          if (Test-Command $testCmd) {
            Write-Host "✓ $($tool.Name) is available (via $($tool.Alternative))" -ForegroundColor Green
            $available = $true
          }
        }
        catch {
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
  }
  else {
    Write-Host "`nAll dependencies are available! ✓" -ForegroundColor Green
  }
}

# CI task for continuous integration (matches GitHub Actions workflow exactly)
Task CI -Depends CheckDependencies, Lint, TypeCheck, Build -Description "Run all CI checks exactly like GitHub Actions" {
  Write-Host "`nCI checks completed successfully! ✓" -ForegroundColor Green
  Write-Host "All GitHub Actions workflow steps passed locally." -ForegroundColor Green
}

# CI task that collects all errors without stopping (LLM-friendly output)
Task CICollectAll -Alias ci-collect-all -Description "Run all CI checks and collect all errors/warnings without stopping" {
  Write-Host "=== RUNNING ALL CI CHECKS ===" -ForegroundColor Cyan
  Write-Host "Running all checks and collecting errors..." -ForegroundColor Yellow
  Write-Host ""
  
  # Enable error collection mode
  $script:CollectAllErrors = $true
  $script:CollectedErrors = @()
  $script:CollectedWarnings = @()
  
  # Run all checks, collecting errors instead of stopping
  try {
    # Dependencies check
    try {
      Invoke-Task CheckDependencies
    }
    catch {
      # Dependencies failure is captured in the task
    }
    
    # Linting tasks
    try {
      Invoke-Task LintMarkdown
    }
    catch {
      # Errors captured in task
    }
    
    try {
      Invoke-Task LintJson
    }
    catch {
      # Errors captured in task
    }
    
    try {
      Invoke-Task LintYaml
    }
    catch {
      # Errors captured in task
    }
    
    try {
      Invoke-Task LintTypeScript
    }
    catch {
      # Errors captured in task
    }
    
    try {
      Invoke-Task CheckFormatting
    }
    catch {
      # Errors captured in task
    }
    
    try {
      Invoke-Task CheckNewlines
    }
    catch {
      # Errors captured in task
    }
    
    try {
      Invoke-Task CheckSecurity
    }
    catch {
      # Errors captured in task
    }
    
    try {
      Invoke-Task CheckApiHealth
    }
    catch {
      # Errors captured in task
    }
    
    try {
      Invoke-Task TypeCheck
    }
    catch {
      # Errors captured in task
    }
    
    try {
      Invoke-Task TestStrict
    }
    catch {
      # Errors captured in task
    }
    
    # Generate comprehensive report
    Write-ComprehensiveErrorReport
    
    # Exit with non-zero code if errors were collected
    if ($script:CollectedErrors.Count -gt 0) {
      Write-Host "❌ CICollectAll found $($script:CollectedErrors.Count) errors." -ForegroundColor Red
      exit 1
    }
    
  }
  finally {
    # Reset error collection mode
    $script:CollectAllErrors = $false
  }
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
    [Parameter(Mandatory = $true)]
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
    [Parameter(Mandatory = $true)]
    [string]$Service,
        
    [Parameter(Mandatory = $true)]
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
Task DockerBuild -Alias docker-build -Description "Build or rebuild all services" {
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
      }
      else {
        Write-Host "✗ API: UNHEALTHY" -ForegroundColor Red
      }
    }
    else {
      # Fallback using PowerShell
      try {
        $response = Invoke-WebRequest -Uri "http://localhost:3010/health" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
          Write-Host "✓ API: HEALTHY" -ForegroundColor Green
        }
        else {
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
      }
      else {
        Write-Host "✗ Nginx: UNHEALTHY" -ForegroundColor Red
      }
    }
    else {
      # Fallback using PowerShell
      try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
          Write-Host "✓ Nginx: HEALTHY" -ForegroundColor Green
        }
        else {
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
    
  # Create temporary file path inside the container
  $tempFile = "/tmp/backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
    
  # Copy backup file into the postgres container
  Write-Host "Copying backup file to container..." -ForegroundColor Cyan
  Invoke-DockerCompose -Arguments @("cp", $BackupFile, "postgres:$tempFile") -ErrorMessage "Failed to copy backup file to container"
    
  # Restore database from the file inside the container
  Write-Host "Executing restore command..." -ForegroundColor Cyan
  Invoke-DockerComposeExec -Service "postgres" -Command @("psql", "-U", "postgres", "-d", "luppa_dev", "-f", $tempFile) -Interactive:$false -ErrorMessage "Failed to restore database"
    
  # Clean up temporary file in container
  Write-Host "Cleaning up temporary file..." -ForegroundColor Cyan
  try {
    Invoke-DockerComposeExec -Service "postgres" -Command @("rm", $tempFile) -Interactive:$false -ErrorMessage "Failed to clean up temporary file"
  }
  catch {
    Write-Host "Warning: Could not clean up temporary file $tempFile" -ForegroundColor Yellow
  }
    
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
  }
  else {
    Write-Host "✗ .env file missing" -ForegroundColor Red
    Write-Host "  Copy .env.example to .env and configure your settings" -ForegroundColor Yellow
  }
    
  Write-Host ""
  Write-Host "Required directories:" -ForegroundColor Yellow
    
  if (Test-Path "infrastructure/docker") {
    Write-Host "✓ infrastructure/docker exists" -ForegroundColor Green
  }
  else {
    Write-Host "✗ infrastructure/docker missing" -ForegroundColor Red
  }
    
  if (Test-Path "infrastructure/docker/postgres/init.sql") {
    Write-Host "✓ PostgreSQL init script exists" -ForegroundColor Green
  }
  else {
    Write-Host "✗ PostgreSQL init script missing" -ForegroundColor Red
  }
    
  if (Test-Path "infrastructure/docker/nginx.conf") {
    Write-Host "✓ Nginx configuration exists" -ForegroundColor Green
  }
  else {
    Write-Host "✗ Nginx configuration missing" -ForegroundColor Red
  }
    
  if (Test-Path $script:ComposeFile) {
    Write-Host "✓ Docker Compose file exists" -ForegroundColor Green
  }
  else {
    Write-Host "✗ Docker Compose file missing" -ForegroundColor Red
  }
}

# Run application using Docker (alias for DockerUp)
Task Run -Alias docker-run -Description "Start all development services with Docker" {
  Invoke-Task DockerUp
}

# Run individual services
Task RunApi -Alias run-api -Description "Start only the API service" {
  Write-Host "`nStarting API service..." -ForegroundColor Cyan
  
  Invoke-DockerCompose -Arguments @("up", "-d", "postgres", "redis", "api")
  
  Write-Host "API service started!" -ForegroundColor Green
  Write-Host "API health check: http://localhost:3010/health" -ForegroundColor Yellow
}

Task RunWeb -Alias run-web -Description "Start only the web service" {
  Write-Host "`nStarting web service..." -ForegroundColor Cyan
  
  Invoke-DockerCompose -Arguments @("up", "-d", "web")
  
  Write-Host "Web service started!" -ForegroundColor Green
  Write-Host "Web service available at: http://localhost:5174" -ForegroundColor Yellow
}

Task RunPostgres -Alias run-postgres -Description "Start only PostgreSQL service" {
  Write-Host "`nStarting PostgreSQL service..." -ForegroundColor Cyan
  
  Invoke-DockerCompose -Arguments @("up", "-d", "postgres")
  
  Write-Host "PostgreSQL service started!" -ForegroundColor Green
  Write-Host "PostgreSQL available at: localhost:5433" -ForegroundColor Yellow
}

Task RunRedis -Alias run-redis -Description "Start only Redis service" {
  Write-Host "`nStarting Redis service..." -ForegroundColor Cyan
  
  Invoke-DockerCompose -Arguments @("up", "-d", "redis")
  
  Write-Host "Redis service started!" -ForegroundColor Green
  Write-Host "Redis available at: localhost:6380" -ForegroundColor Yellow
}

Task RunNginx -Alias run-nginx -Description "Start only Nginx service" {
  Write-Host "`nStarting Nginx service..." -ForegroundColor Cyan
  
  Invoke-DockerCompose -Arguments @("up", "-d", "nginx")
  
  Write-Host "Nginx service started!" -ForegroundColor Green
  Write-Host "Nginx available at: http://localhost:3011" -ForegroundColor Yellow
}

# Docker help - show available Docker commands
Task DockerHelp -Alias docker-help -Description "Show available Docker commands" {
  Write-Host "`nLuppa Inventory System - Docker Management" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Available Docker commands:" -ForegroundColor Yellow
  Write-Host ""
    
  $dockerTasks = @(
    @{Name = "Run (docker-run)"; Description = "Start all development services with Docker" },
    @{Name = "DockerUp (up)"; Description = "Start all development services" },
    @{Name = "DockerDown (down)"; Description = "Stop and remove all containers" },
    @{Name = "DockerRestart (restart)"; Description = "Restart all services" },
    @{Name = "RunApi (run-api)"; Description = "Start only the API service" },
    @{Name = "RunWeb (run-web)"; Description = "Start only the web service" },
    @{Name = "RunPostgres (run-postgres)"; Description = "Start only PostgreSQL service" },
    @{Name = "RunRedis (run-redis)"; Description = "Start only Redis service" },
    @{Name = "RunNginx (run-nginx)"; Description = "Start only Nginx service" },
    @{Name = "DockerBuild (docker-build)"; Description = "Build or rebuild all services" },
    @{Name = "DockerLogs (logs)"; Description = "View logs from all services" },
    @{Name = "DockerLogsApi (logs-api)"; Description = "View API service logs only" },
    @{Name = "DockerLogsWeb (logs-web)"; Description = "View web service logs only" },
    @{Name = "DockerLogsPostgres (logs-postgres)"; Description = "View PostgreSQL service logs only" },
    @{Name = "DockerLogsRedis (logs-redis)"; Description = "View Redis service logs only" },
    @{Name = "DockerLogsNginx (logs-nginx)"; Description = "View Nginx service logs only" },
    @{Name = "DockerShellApi (shell-api)"; Description = "Access backend container shell" },
    @{Name = "DockerShellWeb (shell-web)"; Description = "Access frontend container shell" },
    @{Name = "DockerShellPostgres (shell-postgres)"; Description = "Access PostgreSQL container shell" },
    @{Name = "DockerShellRedis (shell-redis)"; Description = "Access Redis container shell" },
    @{Name = "DockerPsql (psql)"; Description = "Connect to PostgreSQL database" },
    @{Name = "DockerRedisCli (redis-cli)"; Description = "Connect to Redis CLI" },
    @{Name = "DockerResetDb (reset-db)"; Description = "Reset database to initial state" },
    @{Name = "DockerResetRedis (reset-redis)"; Description = "Reset Redis cache" },
    @{Name = "DockerResetAll (reset-all)"; Description = "Reset all data (database and cache)" },
    @{Name = "DockerStatus (status)"; Description = "Show status of all services" },
    @{Name = "DockerHealth (health)"; Description = "Check health of all services" },
    @{Name = "DockerTest (docker-test)"; Description = "Run tests in all services" },
    @{Name = "DockerLint (docker-lint)"; Description = "Run linting checks in containers" },
    @{Name = "DockerBuildProd (build-prod)"; Description = "Build production images" },
    @{Name = "DockerClean (clean-docker)"; Description = "Clean up Docker resources" },
    @{Name = "DockerCleanAll (clean-all)"; Description = "Clean up everything including volumes and images" },
    @{Name = "DockerBackupDb (backup-db)"; Description = "Backup database to file" },
    @{Name = "DockerRestoreDb (restore-db)"; Description = "Restore database from backup file" },
    @{Name = "DockerUpdate (update)"; Description = "Pull latest images and rebuild" },
    @{Name = "DockerEnvCheck (env-check)"; Description = "Check environment configuration" }
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
