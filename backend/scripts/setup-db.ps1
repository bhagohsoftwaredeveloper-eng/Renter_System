param (
    [string]$SqlFile = ""
)

$ErrorActionPreference = "Continue"

# Log to a highly visible location
$logFile = "C:\ServeQueue_DB_Setup.log"
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $fullMsg = "[$ts] ${Level}: $Message"
    Write-Host $fullMsg
    try {
        Add-Content -Path $logFile -Value $fullMsg -ErrorAction SilentlyContinue
    } catch {
        # Fallback to local log if C:\ is protected
        $localLog = Join-Path $PSScriptRoot "db_setup.log"
        Add-Content -Path $localLog -Value $fullMsg -ErrorAction SilentlyContinue
    }
}

Write-Log "--- ServeQueue Database Setup Started ---"
Write-Log "Running as: $([Security.Principal.WindowsIdentity]::GetCurrent().Name)"
Write-Log "Script Location: $PSScriptRoot"
Write-Log "Argument SqlFile: $SqlFile"

# 1. Resolve init_db.sql path
$finalSqlFile = $SqlFile
if (-not (Test-Path $finalSqlFile)) {
    $finalSqlFile = Join-Path $PSScriptRoot "..\init_db.sql"
    Write-Log "SqlFile not found or empty, trying fallback: $finalSqlFile"
}

if (-not (Test-Path $finalSqlFile)) {
    Write-Log "CRITICAL: init_db.sql not found anywhere." "ERROR"
    exit 0
}

# 2. Detect .env and Load Credentials
$envPath = Join-Path $PSScriptRoot "..\.env"
if (-not (Test-Path $envPath)) { $envPath = Join-Path $PSScriptRoot "..\dist\.env" }

$DbUser = "postgres"
$DbPass = "123700"
$DbName = "renter_systems"

if (Test-Path $envPath) {
    Write-Log "Loading credentials from $envPath"
    $content = Get-Content $envPath
    foreach ($line in $content) {
        if ($line -match "^DB_USER=(.*)$") { $DbUser = $matches[1].Trim() }
        if ($line -match "^DB_PASSWORD=(.*)$") { $DbPass = $matches[1].Trim() }
        if ($line -match "^DB_NAME=(.*)$") { $DbName = $matches[1].Trim() }
    }
} else {
    Write-Log "Warning: .env not found. Using defaults." "WARN"
}

# 3. Find psql.exe
$psqlPath = "psql.exe"
if (!(Get-Command $psqlPath -ErrorAction SilentlyContinue)) {
    $searchPaths = @(
        "C:\Program Files\PostgreSQL\16\bin\psql.exe",
        "C:\Program Files\PostgreSQL\15\bin\psql.exe",
        "C:\Program Files\PostgreSQL\14\bin\psql.exe",
        "C:\Program Files\PostgreSQL\13\bin\psql.exe",
        "C:\Program Files\PostgreSQL\*\bin\psql.exe",
        "C:\Program Files (x86)\PostgreSQL\*\bin\psql.exe"
    )
    foreach ($p in $searchPaths) {
        $found = Resolve-Path $p -ErrorAction SilentlyContinue
        if ($found) {
            $psqlPath = $found[0].Path
            Write-Log "Located psql at: $psqlPath"
            break
        }
    }
}

if (!(Get-Command $psqlPath -ErrorAction SilentlyContinue)) {
    Write-Log "CRITICAL: psql.exe not found. Manual setup required." "ERROR"
    exit 0 
}

# 4. Service Readiness & Retries
Write-Log "Verifying PostgreSQL service..."
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Running' }
if (-not $pgService) {
    Write-Log "ERROR: PostgreSQL service is not in 'Running' state." "ERROR"
    exit 0
}
Write-Log "PostgreSQL service detected: $($pgService.Name)"

$env:PGPASSWORD = $DbPass
$maxRetries = 10
$retryDelay = 3
$connected = $false

for ($i = 1; $i -le $maxRetries; $i++) {
    Write-Log "Connection attempt $i of $maxRetries..."
    $test = & $psqlPath -U $DbUser -c "SELECT 1" 2>&1
    if ($LASTEXITCODE -eq 0) {
        $connected = $true
        Write-Log "Connected to PostgreSQL server."
        break
    }
    Write-Log "Connection failed. Retrying..." "WARN"
    Start-Sleep -Seconds $retryDelay
}

if (-not $connected) {
    Write-Log "CRITICAL: Could not connect to PostgreSQL. Check password or host." "ERROR"
    exit 0
}

# 5. Database Creation & Schema
try {
    Write-Log "Checking for database '$DbName'..."
    $dbList = & $psqlPath -U $DbUser -lqt
    if ($dbList -match "\b$DbName\b") {
        Write-Log "Database '$DbName' exists."
    } else {
        Write-Log "Creating database '$DbName'..."
        & $psqlPath -U $DbUser -c "CREATE DATABASE $DbName;"
        if ($LASTEXITCODE -ne 0) { throw "Database creation failed." }
    }

    Write-Log "Applying schema from $finalSqlFile..."
    $output = & $psqlPath -U $DbUser -d $DbName -f $finalSqlFile 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Log "SQL Execution Errors: $output" "ERROR"
    } else {
        Write-Log "Schema applied successfully."
    }
} catch {
    Write-Log "Exception: $_" "ERROR"
} finally {
    $env:PGPASSWORD = $null
}

Write-Log "--- ServeQueue Database Setup Finished ---"
