<#
.SYNOPSIS
  Stops the running API, rebuilds it, and starts it again.

.DESCRIPTION
  A running Kestrel process holds a lock on OfferlalFashion.Api.exe, so any
  build while it is up fails with MSB3027/MSB3021 - which reads like a code
  error but is not one. This does the stop/build/start dance in one step.

.PARAMETER NoStart
  Stop and build only; leave the API down.
#>
[CmdletBinding()]
param(
    [int]$Port = 5210,
    [switch]$NoStart
)

$ErrorActionPreference = 'Stop'
$api = Join-Path $PSScriptRoot '..\OfferlalFashion.Api' | Resolve-Path

Get-Process -Name 'OfferlalFashion.Api' -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "Stopping API (pid $($_.Id))" -ForegroundColor DarkGray
    Stop-Process -Id $_.Id -Force
}
Start-Sleep -Milliseconds 800

Push-Location $api
try {
    dotnet build --nologo | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'BUILD FAILED' -ForegroundColor Red
        dotnet build --nologo
        exit 1
    }
    Write-Host 'Build succeeded.' -ForegroundColor Green

    if (-not $NoStart) {
        $log = Join-Path $env:TEMP 'offerlal-api.log'
        # Bind 0.0.0.0, not localhost. The Ionic app installed on a phone
        # reaches this over the LAN, and a loopback binding refuses those
        # connections with no server-side log line at all - the request never
        # arrives, so the failure looks like a bug in the app.
        # (A comment cannot sit between backtick-continued lines below: the
        # backtick continues to the NEXT line, and a comment there breaks it.)
        Start-Process -FilePath 'dotnet' `
            -ArgumentList @('run', '--no-build', '--urls', "http://0.0.0.0:$Port") `
            -WorkingDirectory $api -RedirectStandardOutput $log `
            -RedirectStandardError "$log.err" -WindowStyle Hidden | Out-Null

        # Poll readiness rather than sleeping a fixed guess.
        $deadline = (Get-Date).AddSeconds(60)
        do {
            Start-Sleep -Milliseconds 700
            try {
                $r = Invoke-WebRequest "http://localhost:$Port/health/ready" -UseBasicParsing -TimeoutSec 3
                if ($r.StatusCode -eq 200) { Write-Host "API ready on $Port" -ForegroundColor Green; exit 0 }
            } catch { }
        } while ((Get-Date) -lt $deadline)

        Write-Host "API did not become ready within 60s - see $log" -ForegroundColor Red
        exit 1
    }
}
finally { Pop-Location }
