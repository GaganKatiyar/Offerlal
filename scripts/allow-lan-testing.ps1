<#
.SYNOPSIS
    Opens the two dev ports a phone needs. Run once, as Administrator.

.DESCRIPTION
    Windows Firewall blocks inbound connections by default, so a phone on the
    same Wi-Fi cannot reach the dev API even though Kestrel is listening on
    0.0.0.0. Nothing logs a refusal - the request simply never arrives, which
    looks exactly like a bug in the app.

    Two ports:
      5210  the API the installed app calls
      9100  the little static server that hands the APK to the phone

    Scoped to the Private profile only, so this applies on a home or office
    network and NOT when the machine is on a public one. Undo with
    -Remove when you are finished testing.

.EXAMPLE
    powershell -File scripts/allow-lan-testing.ps1
    powershell -File scripts/allow-lan-testing.ps1 -Remove
#>
[CmdletBinding()]
param(
    [switch]$Remove
)

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host ''
    Write-Host '  This needs an elevated PowerShell.' -ForegroundColor Yellow
    Write-Host '  Right-click PowerShell -> Run as administrator, then:' -ForegroundColor Yellow
    Write-Host ''
    Write-Host "    powershell -File `"$PSCommandPath`"" -ForegroundColor Cyan
    Write-Host ''
    exit 1
}

$rules = @(
    @{ Name = 'Offerlal API (dev LAN)'; Port = 5210 },
    @{ Name = 'Offerlal APK download (dev LAN)'; Port = 9100 }
)

foreach ($r in $rules) {
    $existing = Get-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue

    if ($Remove) {
        if ($existing) {
            Remove-NetFirewallRule -DisplayName $r.Name
            Write-Host "Removed: $($r.Name)" -ForegroundColor Green
        } else {
            Write-Host "Not present: $($r.Name)" -ForegroundColor Gray
        }
        continue
    }

    if ($existing) {
        Write-Host "Already allowed: $($r.Name) (port $($r.Port))" -ForegroundColor Gray
        continue
    }

    New-NetFirewallRule `
        -DisplayName $r.Name `
        -Direction Inbound `
        -LocalPort $r.Port `
        -Protocol TCP `
        -Action Allow `
        -Profile Private | Out-Null

    Write-Host "Allowed: $($r.Name) on port $($r.Port) (Private networks only)" -ForegroundColor Green
}

if (-not $Remove) {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -like '192.168.*' } |
        Select-Object -First 1).IPAddress
    Write-Host ''
    Write-Host "This machine is $ip on the LAN." -ForegroundColor Cyan
    Write-Host "Phone must be on the same Wi-Fi. Check from the phone's browser:" -ForegroundColor Gray
    Write-Host "  http://$ip`:5210/api/categories   (should return JSON)" -ForegroundColor Gray
}
