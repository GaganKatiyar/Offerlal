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
    dotnet ef migrations has-pending-model-changes
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
