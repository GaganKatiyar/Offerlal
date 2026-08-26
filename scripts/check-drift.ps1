<#
.SYNOPSIS
    Fails if the EF Core model has drifted from the migrations.

.DESCRIPTION
    Catches the most common code-first mistake: editing an entity class and
    forgetting to add the corresponding migration.

    Exit code 0 = model matches migrations.
    Exit code 1 = drift detected; run `dotnet ef migrations add <Name>`.

    Intended for CI, and worth running before any commit that touches Models/.

.EXAMPLE
    .\scripts\check-drift.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$apiDir   = Join-Path $repoRoot "OfferlalFashion.Api"

Push-Location $apiDir
try {
    # Build first and separately. `has-pending-model-changes` also returns
    # non-zero when the project simply fails to compile (a locked binary from a
    # running API is the common case), and reporting that as "schema drift"
    # sends you hunting for a migration that was never missing.
    dotnet build --nologo | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "BUILD FAILED - cannot check for drift." -ForegroundColor Red
        Write-Host "This is a compile error, not a schema problem." -ForegroundColor Yellow
        Write-Host "If the API is running, stop it first (it locks the output binary)." -ForegroundColor Yellow
        exit 2
    }

    dotnet ef migrations has-pending-model-changes --no-build
    $code = $LASTEXITCODE
}
finally { Pop-Location }

if ($code -ne 0) {
    Write-Host ""
    Write-Host "SCHEMA DRIFT DETECTED." -ForegroundColor Red
    Write-Host "The entity model no longer matches the migrations." -ForegroundColor Red
    Write-Host "Fix with:  dotnet ef migrations add <DescriptiveName>" -ForegroundColor Yellow
    exit 1
}

Write-Host "No schema drift - model matches migrations." -ForegroundColor Green
exit 0
