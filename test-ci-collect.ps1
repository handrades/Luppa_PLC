#!/usr/bin/env pwsh

# Test script to demonstrate the CICollectAll functionality
Write-Host "=== TESTING CI COLLECT ALL FUNCTIONALITY ===" -ForegroundColor Cyan
Write-Host ""

# Run the actual CICollectAll task
Write-Host "Running: Invoke-psake CICollectAll" -ForegroundColor Yellow
Write-Host ""

Import-Module psake -Force
try {
    Invoke-psake -buildFile "psakefile.ps1" -taskList "CICollectAll" -notr
    Write-Host ""
    Write-Host "✅ CICollectAll task completed successfully" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "❌ CICollectAll task failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== TEST COMPLETE ===" -ForegroundColor Cyan
