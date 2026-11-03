<#
.SYNOPSIS
    Builds an installable debug APK of the Ionic app, pointed at the dev API.

.DESCRIPTION
    Four steps that must happen in this order: build the web bundle, copy it
    into the native project, then assemble the APK.

    The result talks to the development API over the LAN, so three things have
    to line up or the app installs and then shows an empty shop:

      1. src/environments/environment.ts must hold THIS machine's LAN address.
         The script checks it and refuses to build a bundle that points
         somewhere unreachable, because that failure is invisible on the phone.
      2. The API must be listening on 0.0.0.0, not loopback. api-restart.ps1
         does this.
      3. CAP_DEV=1, so the WebView is allowed to load http content. Without it
         every request is blocked as mixed content with no error shown.

.PARAMETER SkipWeb
    Reuse the existing www/ bundle. Useful when only native config changed.
#>
[CmdletBinding()]
param(
    [switch]$SkipWeb,
    [int]$ApiPort = 5210
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$mobile = Join-Path $root 'OfferlalMobile'
$envFile = Join-Path $mobile 'src/environments/environment.ts'

# --- 1. Does the configured API address match this machine? ------------------
$lanIp = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -like '192.168.*' } |
    Select-Object -First 1).IPAddress

if (-not $lanIp) {
    Write-Warning 'No 192.168.* address found. Are you on the LAN?'
} else {
    $configured = Select-String -Path $envFile -Pattern 'apiBaseUrl:\s*''http://([0-9.]+):' |
        ForEach-Object { $_.Matches[0].Groups[1].Value }

    if ($configured -and $configured -ne $lanIp) {
        Write-Host ''
        Write-Host "  environment.ts points at $configured" -ForegroundColor Yellow
        Write-Host "  this machine is        $lanIp" -ForegroundColor Yellow
        Write-Host ''
        Write-Host '  The phone would not reach the API. Update environment.ts first.' -ForegroundColor Yellow
        exit 1
    }
    Write-Host "API address: http://$lanIp`:$ApiPort  (matches environment.ts)" -ForegroundColor Green
}

# --- 2. Is the API actually reachable on that address? -----------------------
if ($lanIp) {
    try {
        $null = Invoke-WebRequest -Uri "http://$lanIp`:$ApiPort/api/categories" -TimeoutSec 5 -UseBasicParsing
        Write-Host 'API is reachable on the LAN.' -ForegroundColor Green
    } catch {
        Write-Warning "API not reachable at http://$lanIp`:$ApiPort - run scripts/api-restart.ps1 before testing on the phone."
    }
}

# --- 3. Web bundle -----------------------------------------------------------
Push-Location $mobile
try {
    if (-not $SkipWeb) {
        Write-Host 'Building the web bundle...' -ForegroundColor Cyan
        # Development configuration on purpose: it is environment.ts, with the
        # LAN address, that a test build needs.
        & npx ng build --configuration development
        if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
    }

    Write-Host 'Copying into the Android project...' -ForegroundColor Cyan
    $env:CAP_DEV = '1'
    & npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed.' }

    # --- 4. APK ---------------------------------------------------------------
    Write-Host 'Assembling the APK...' -ForegroundColor Cyan
    $jdk = Join-Path $root 'tools/jdk-21'
    if (Test-Path $jdk) { $env:JAVA_HOME = $jdk }

    Push-Location (Join-Path $mobile 'android')
    try {
        & ./gradlew.bat assembleDebug --no-daemon
        if ($LASTEXITCODE -ne 0) { throw 'Gradle build failed.' }
    } finally {
        Pop-Location
    }
} finally {
    Remove-Item Env:\CAP_DEV -ErrorAction SilentlyContinue
    Pop-Location
}

$apk = Join-Path $mobile 'android/app/build/outputs/apk/debug/app-debug.apk'
if (Test-Path $apk) {
    $size = [math]::Round((Get-Item $apk).Length / 1MB, 1)
    Write-Host ''
    Write-Host "APK ready: $apk ($size MB)" -ForegroundColor Green
    Write-Host 'Install with: adb install -r "<path>"  (or copy it to the phone)' -ForegroundColor Gray
    Write-Host "The phone must be on the same Wi-Fi as this machine ($lanIp)." -ForegroundColor Gray
} else {
    throw "Build reported success but no APK at $apk"
}
