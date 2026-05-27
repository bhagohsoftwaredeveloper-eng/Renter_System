# Biometric Bridge Service Uninstallation Script

$serviceName = "ServeQueueBridge"

# Check for Administrator privileges
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    exit 1
}

Write-Host "Stopping and removing '$serviceName'..." -ForegroundColor Cyan

if (Get-ScheduledTask -TaskName $serviceName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $serviceName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $serviceName -Confirm:$false
    Write-Host "Successfully removed the '$serviceName' background task." -ForegroundColor Green
} else {
    Write-Host "Task '$serviceName' not found." -ForegroundColor Yellow
}

# Also cleanup legacy Startup shortcuts if they exist
$startupFolder = [System.IO.Path]::Combine($env:APPDATA, "Microsoft\Windows\Start Menu\Programs\Startup")
$shortcutPath = Join-Path $startupFolder "ServeQueueBridge.lnk"
if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Host "Removed legacy startup shortcut." -ForegroundColor Green
}
