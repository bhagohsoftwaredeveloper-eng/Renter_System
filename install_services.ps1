# ServeQueue Service & Startup Installation Script
# Run this script as Administrator to register background services.

$currentDir = $PSScriptRoot
if (-not $currentDir) { $currentDir = Get-Location }

# Detection logic for both Dev and Installed environments
$bridgeInstallScript = Join-Path $currentDir "BiometricBridge\scripts\install-service.ps1"
if (-not (Test-Path $bridgeInstallScript)) {
    $bridgeInstallScript = Join-Path $currentDir "Bridge\scripts\install-service.ps1"
}

$backendInstallScript = Join-Path $currentDir "backend\scripts\install-service.ps1"
if (-not (Test-Path $backendInstallScript)) {
    $backendInstallScript = Join-Path $currentDir "Backend\scripts\install-service.ps1"
}

Write-Host "--- ServeQueue Background Setup ---" -ForegroundColor Cyan

# 0. Setup Database (v1.2.0)
$dbSetupScript = Join-Path $currentDir "backend\scripts\setup-db.ps1"
if (-not (Test-Path $dbSetupScript)) {
    $dbSetupScript = Join-Path $currentDir "Backend\scripts\setup-db.ps1"
}

if (Test-Path $dbSetupScript) {
    $sqlFile = Join-Path $currentDir "backend\init_db.sql"
    if (-not (Test-Path $sqlFile)) { $sqlFile = Join-Path $currentDir "Backend\init_db.sql" }
    
    Write-Host "Configuring Database Schema..." -ForegroundColor Cyan
    & $dbSetupScript -SqlFile $sqlFile
} else {
    Write-Host "Note: Database setup script not found. Skipping auto-initialization." -ForegroundColor Gray
}

# 1. Setup Biometric Bridge (Note: Handled via Startup Folder in v1.2.0)
Write-Host "Biometric Bridge will be managed via Startup Folder for hardware access." -ForegroundColor Gray

# 2. Register Backend
if (Test-Path $backendInstallScript) {
    Write-Host "`nConfiguring Backend Server..." -ForegroundColor Cyan
    & $backendInstallScript
} else {
    Write-Host "Warning: Backend installation script not found." -ForegroundColor Yellow
}

Write-Host "`nSetup Complete." -ForegroundColor Cyan
