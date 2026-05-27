# ServeQueue Backend Service Uninstallation Script

$serviceName = "ServeQueueBackend"

Write-Host "Stopping and removing '$serviceName'..." -ForegroundColor Cyan

if (Get-ScheduledTask -TaskName $serviceName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $serviceName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $serviceName -Confirm:$false
    Write-Host "Successfully removed background service: $serviceName" -ForegroundColor Green
} else {
    Write-Host "Service '$serviceName' was not found." -ForegroundColor Yellow
}
