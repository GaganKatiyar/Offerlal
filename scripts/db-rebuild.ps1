<#
.SYNOPSIS
    Rebuilds the local Offerlal_Dev database from EF Core migrations + seed data.

.DESCRIPTION
    Drops the database, recreates it by applying all EF Core migrations, re-seeds
    it from database/seed.sql, then verifies the expected row counts.

    Safe to run any time on a LOCAL DEV database. It is destructive — it will
    refuse to run unless the connection string points at a local server.

.EXAMPLE
    .\scripts\db-rebuild.ps1
#>
[CmdletBinding()]
param(
    [string]$Server   = ".",
    [string]$Database = "Offerlal_Dev",
    [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$apiDir   = Join-Path $repoRoot "OfferlalFashion.Api"

# Seed scripts run in order. seed.sql loads the flat demo catalogue;
# seed-catalog-structure.sql derives the category tree and promotes the
# legacy SubCategory free text into real child categories.
$seedFiles = @(
    Join-Path $repoRoot "Offerlal Fashon\database\seed.sql"
    Join-Path $repoRoot "Offerlal Fashon\database\seed-catalog-structure.sql"
)

# --- Guard: refuse to run against anything that isn't local -------------------
if ($Server -notin @(".", "localhost", "(local)", "127.0.0.1", "$env:COMPUTERNAME")) {
    throw "Refusing to run: '$Server' does not look like a local server. This script is destructive."
}

Write-Host "Rebuilding $Database on $Server" -ForegroundColor Cyan

# --- Optional safety backup ---------------------------------------------------
if (-not $SkipBackup) {
    $exists = sqlcmd -S $Server -E -h -1 -W -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name = '$Database';"
    if ($exists -match '1') {
        $backupDir = (sqlcmd -S $Server -E -h -1 -W -Q "SET NOCOUNT ON; SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(4000));" |
                      Where-Object { $_ -and $_.Trim() } | Select-Object -First 1).Trim()
        $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $bak   = Join-Path $backupDir "$Database-prerebuild-$stamp.bak"
        Write-Host "  Backing up to $bak" -ForegroundColor DarkGray
        sqlcmd -S $Server -E -Q "BACKUP DATABASE [$Database] TO DISK = N'$bak' WITH INIT, COMPRESSION;" | Out-Null
    }
}

# --- Drop / migrate / seed ----------------------------------------------------
Push-Location $apiDir
try {
    Write-Host "  Dropping..." -ForegroundColor DarkGray
    dotnet ef database drop --force | Out-Null

    Write-Host "  Applying migrations..." -ForegroundColor DarkGray
    dotnet ef database update
    if ($LASTEXITCODE -ne 0) { throw "dotnet ef database update failed." }
}
finally { Pop-Location }

foreach ($seed in $seedFiles) {
    Write-Host "  Seeding $(Split-Path $seed -Leaf)..." -ForegroundColor DarkGray
    sqlcmd -S $Server -E -d $Database -i $seed -b
    if ($LASTEXITCODE -ne 0) { throw "Seeding failed: $(Split-Path $seed -Leaf)" }
}

# --- Verify -------------------------------------------------------------------
# Categories = 10 roots + 9 children promoted from the legacy SubCategory column.
$expected = @{
    Products = 60; ProductSkus = 241; ProductVariants = 60; ProductImages = 120
    Orders = 37; OrderItems = 41; OrderStatusHistory = 224
    Customers = 20; Addresses = 20; Categories = 19; Coupons = 10; Reviews = 15
    Brands = 1
}

Write-Host "Verifying row counts..." -ForegroundColor Cyan
$failed = $false
foreach ($table in $expected.Keys | Sort-Object) {
    $actual = (sqlcmd -S $Server -E -d $Database -h -1 -W -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM dbo.$table;" |
               Where-Object { $_ -match '^\d+$' } | Select-Object -First 1)
    if ([int]$actual -ne $expected[$table]) {
        Write-Host ("  FAIL  {0,-20} expected {1,5}, got {2,5}" -f $table, $expected[$table], $actual) -ForegroundColor Red
        $failed = $true
    } else {
        Write-Host ("  ok    {0,-20} {1,5}" -f $table, $actual) -ForegroundColor DarkGreen
    }
}

if ($failed) { throw "Row count verification FAILED." }
Write-Host "Database rebuilt and verified." -ForegroundColor Green
