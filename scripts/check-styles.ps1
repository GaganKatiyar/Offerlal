<#
.SYNOPSIS
  Fails the build when a component stylesheet hand-writes a width-based media query.

.DESCRIPTION
  The previous breakpoint system (styles/tokens/_breakpoints.scss) exported five
  mixins that were used exactly ZERO times. Components wrote raw media queries
  instead and drifted to off-scale one-offs at 480/640/700/900px, which is why
  nothing in the app adapted above 1024px. A design system that is merely
  available gets ignored; one that is enforced gets used.

  Width-based queries must go through `@include mq(...)` from src/styles/_mq.scss.
  Non-width queries (prefers-reduced-motion, hover, pointer, print) are
  unrestricted - they are feature detection, not layout.

  Migration is opportunistic, so this runs against a BASELINE of known
  violations recorded at the time the mixin landed. It fails on:
    - any violation in a file not listed in the baseline (new drift), or
    - a baseline file whose violation count has grown.
  A file whose count drops is reported so the baseline can be tightened.
  The baseline only ever shrinks. When it reaches zero, delete it.

.PARAMETER UpdateBaseline
  Rewrite the baseline from the current state. Use ONLY after deliberately
  migrating files - never to silence a failure.

.OUTPUTS
  Exit 0 = clean. Exit 1 = new or grown violations. Exit 2 = could not run.
#>

[CmdletBinding()]
param(
    [string]$Root = (Join-Path $PSScriptRoot '..' | Resolve-Path),
    [switch]$UpdateBaseline
)

$ErrorActionPreference = 'Stop'

$appSrc = Join-Path $Root 'Offerlal Fashon/src'
if (-not (Test-Path $appSrc)) {
    Write-Host "Cannot find $appSrc - is this the repo root?" -ForegroundColor Red
    exit 2
}

$baselinePath = Join-Path $PSScriptRoot 'style-baseline.json'

# Files that legitimately define the breakpoints themselves.
$allowlist = @(
    'src/styles/_mq.scss',
    'src/styles/_layout.scss',
    'src/styles/tokens/_breakpoints.scss',
    'src/styles.scss'
)

$pattern = '@media[^{]*\((?:min|max)-width'

# --- Collect current violations ----------------------------------------------
$current = [ordered]@{}
$details = @{}

Get-ChildItem -Path $appSrc -Filter '*.scss' -Recurse -File |
    Sort-Object FullName |
    ForEach-Object {
        $rel = "src/" + $_.FullName.Substring($appSrc.Length + 1).Replace('\', '/')
        if ($allowlist -contains $rel) { return }

        $hits = @()
        $lineNo = 0
        foreach ($line in (Get-Content -LiteralPath $_.FullName)) {
            $lineNo++
            if ($line -match $pattern) { $hits += "${lineNo}: $($line.Trim())" }
        }
        if ($hits.Count -gt 0) {
            $current[$rel] = $hits.Count
            $details[$rel] = $hits
        }
    }

# --- Update mode --------------------------------------------------------------
if ($UpdateBaseline) {
    $current | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $baselinePath -Encoding utf8
    $total = ($current.Values | Measure-Object -Sum).Sum
    if ($null -eq $total) { $total = 0 }
    Write-Host "Baseline rewritten: $($current.Count) files, $total violations." -ForegroundColor Yellow
    exit 0
}

# --- Load baseline ------------------------------------------------------------
$baseline = @{}
if (Test-Path $baselinePath) {
    $json = Get-Content -LiteralPath $baselinePath -Raw | ConvertFrom-Json
    foreach ($p in $json.PSObject.Properties) { $baseline[$p.Name] = [int]$p.Value }
}

# --- Compare ------------------------------------------------------------------
$new = @()
$grown = @()
$improved = @()

foreach ($file in $current.Keys) {
    if (-not $baseline.ContainsKey($file)) {
        $new += $file
    }
    elseif ($current[$file] -gt $baseline[$file]) {
        $grown += [pscustomobject]@{ File = $file; Was = $baseline[$file]; Now = $current[$file] }
    }
    elseif ($current[$file] -lt $baseline[$file]) {
        $improved += [pscustomobject]@{ File = $file; Was = $baseline[$file]; Now = $current[$file] }
    }
}
foreach ($file in $baseline.Keys) {
    if (-not $current.Contains($file)) {
        $improved += [pscustomobject]@{ File = $file; Was = $baseline[$file]; Now = 0 }
    }
}

foreach ($i in $improved) {
    Write-Host ("IMPROVED  {0}: {1} -> {2}" -f $i.File, $i.Was, $i.Now) -ForegroundColor Green
}
if ($improved.Count -gt 0) {
    Write-Host "Run with -UpdateBaseline to lock in the improvement." -ForegroundColor DarkGray
    Write-Host ""
}

if ($new.Count -eq 0 -and $grown.Count -eq 0) {
    $remaining = ($current.Values | Measure-Object -Sum).Sum
    if ($null -eq $remaining) { $remaining = 0 }
    Write-Host "No new raw media queries. $remaining baselined violation(s) left to migrate." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "NEW RAW MEDIA QUERIES" -ForegroundColor Red
Write-Host "Use the mq() mixin instead:" -ForegroundColor Yellow
Write-Host "    @use '<relative-path-to>/styles/mq' as *;"
Write-Host "    @include mq(lg) { ... }"
Write-Host ""

foreach ($f in $new) {
    Write-Host "  $f (not baselined)" -ForegroundColor Cyan
    foreach ($h in $details[$f]) { Write-Host "      $h" -ForegroundColor DarkGray }
}
foreach ($g in $grown) {
    Write-Host ("  {0} (was {1}, now {2})" -f $g.File, $g.Was, $g.Now) -ForegroundColor Cyan
    foreach ($h in $details[$g.File]) { Write-Host "      $h" -ForegroundColor DarkGray }
}
Write-Host ""
exit 1
