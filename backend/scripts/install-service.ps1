# ServeQueue Backend Service Installation Script
# This script registers the ServeQueue backend as a Windows Scheduled Task
# that runs at system startup in the background.

# Check for Administrator privileges
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    Write-Host "Please right-click on PowerShell and select 'Run as Administrator'."
    exit 1
}

$serviceName = "ServeQueueBackend"
$scriptDir = $PSScriptRoot

# Detect the executable location
$executablePath = Join-Path $scriptDir "..\dist\server.exe"
$workingDirectory = Join-Path $scriptDir "..\dist"

# Fallback 1: Check for server.exe in the same folder as scripts
if (-not (Test-Path $executablePath)) {
    $executablePath = Join-Path $scriptDir "server.exe"
    $workingDirectory = $scriptDir
}

# Fallback 2: Check for server.exe in the parent folder (Common for deployment)
if (-not (Test-Path $executablePath)) {
    $executablePath = Join-Path $scriptDir "..\server.exe"
    $workingDirectory = Join-Path $scriptDir ".."
}

if (-not (Test-Path $executablePath)) {
    Write-Host "ERROR: Could not find server.exe at $executablePath" -ForegroundColor Red
    Write-Host "Please ensure server.exe exists in the backend/dist folder or the same folder as this script."
    exit 1
}

Write-Host "Registering '$serviceName' to run $executablePath in the background..." -ForegroundColor Cyan

# Create Task Action
$action = New-ScheduledTaskAction -Execute $executablePath -WorkingDirectory $workingDirectory

# Create Task Trigger (At Startup)
$trigger = New-ScheduledTaskTrigger -AtStartup

# Create Task Principal (Run as SYSTEM for background execution without login)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Set Settings (Restart if fails, don't stop on battery)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

# Register the Task
Register-ScheduledTask -TaskName $serviceName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force

Write-Host "Successfully registered '$serviceName' as a Windows Scheduled Task." -ForegroundColor Green
Write-Host "It will now start automatically whenever the computer boots up (even before login)."
Write-Host "Starting the service now..." -ForegroundColor Cyan

Start-ScheduledTask -TaskName $serviceName

if ((Get-ScheduledTask -TaskName $serviceName).State -eq "Running") {
    Write-Host "Service started successfully." -ForegroundColor Green
} else {
    Write-Host "Service registered but could not be started immediately. It will try again on boot." -ForegroundColor Yellow
}
