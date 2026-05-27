# ServeQueue Backend Build Script
# This script uses 'pkg' to compile server.js into a standalone server.exe

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

Write-Host "Building server.exe..." -ForegroundColor Cyan
# Usage: npx pkg <entrypoint> --target <target> --output <output>
npx pkg . --targets node18-win-x64 --output dist/server.exe

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful! server.exe is located in the 'dist' folder." -ForegroundColor Green
} else {
    Write-Host "Build failed. Please check the error messages above." -ForegroundColor Red
}
