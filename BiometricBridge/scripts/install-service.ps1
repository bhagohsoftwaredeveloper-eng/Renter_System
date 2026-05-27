# ServeQueue Biometric Bridge Service Installation Script
# This script registers the Biometric Bridge as a Windows Scheduled Task
# that runs at system startup in the background.

# Check for Administrator privileges
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    Write-Host "Please right-click on PowerShell and select 'Run as Administrator'."
    exit 1
}

$serviceName = "ServeQueueBridge"
$scriptDir = $PSScriptRoot

# Detect the executable location - consistent with net9.0 win-x64 publish path
$executablePath = Join-Path $scriptDir "..\bin\Release\net9.0\win-x64\publish\BiometricBridge.exe"
$workingDirectory = Join-Path $scriptDir "..\bin\Release\net9.0\win-x64\publish"

# Fallback 1: Check for BiometricBridge.exe in the same folder as scripts (Common for portable deployment)
if (-not (Test-Path $executablePath)) {
    $executablePath = Join-Path $scriptDir "BiometricBridge.exe"
    $workingDirectory = $scriptDir
}

# Fallback 2: Check for BiometricBridge.exe in the parent folder
if (-not (Test-Path $executablePath)) {
    $executablePath = Join-Path $scriptDir "..\BiometricBridge.exe"
    $workingDirectory = Join-Path $scriptDir ".."
}

if (-not (Test-Path $executablePath)) {
    Write-Host "ERROR: Could not find BiometricBridge.exe at $executablePath" -ForegroundColor Red
    Write-Host "Please ensure the project is built and the executable exists."
    exit 1
}

Write-Host "Registering '$serviceName' to run $executablePath in the background..." -ForegroundColor Cyan

# Create Task Action
$action = New-ScheduledTaskAction -Execute $executablePath -WorkingDirectory $workingDirectory

# Create Task Trigger (At Startup)
$trigger = New-ScheduledTaskTrigger -AtStartup

# Create Task Principal (Run as SYSTEM for hardware access and background execution)
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
    Write-Host "Biometric Bridge service started successfully." -ForegroundColor Green
} else {
    Write-Host "Service registered but could not be started immediately. It will try again on boot." -ForegroundColor Yellow
}
