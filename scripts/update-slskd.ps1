# Updates slskd\bin\slskd.exe to the latest GitHub release.
# Stop slskd before running: the exe cannot be replaced while it is running.

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$binDir = Join-Path $root "slskd\bin"
$backupDir = Join-Path $binDir "previous"

if (Get-Process slskd -ErrorAction SilentlyContinue) {
    Write-Error "slskd is running. Stop it first, then re-run this script."
}

Write-Host "Checking latest slskd release..."
$release = Invoke-RestMethod "https://api.github.com/repos/slskd/slskd/releases/latest"
$asset = $release.assets | Where-Object { $_.name -like "*win-x64.zip" } | Select-Object -First 1
if (-not $asset) { Write-Error "No win-x64 asset found in release $($release.tag_name)" }

$currentVersion = $null
$exe = Join-Path $binDir "slskd.exe"
if (Test-Path $exe) {
    $currentVersion = (Get-Item $exe).VersionInfo.ProductVersion
}

Write-Host "Latest: $($release.tag_name)  |  Installed: $($currentVersion ?? 'none')"
if ($currentVersion -and $release.tag_name.TrimStart("v") -eq $currentVersion.Split("+")[0]) {
    Write-Host "Already up to date."
    exit 0
}

$zipPath = Join-Path $env:TEMP $asset.name
Write-Host "Downloading $($asset.name)..."
Invoke-WebRequest $asset.browser_download_url -OutFile $zipPath

if (Test-Path $exe) {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    Write-Host "Backing up current binary to slskd\bin\previous\"
    Move-Item $exe (Join-Path $backupDir "slskd.exe") -Force
}

Write-Host "Extracting..."
Expand-Archive $zipPath -DestinationPath $binDir -Force
Remove-Item $zipPath

Write-Host "Done. slskd updated to $($release.tag_name)."
Write-Host "Restart it with: .\slskd\bin\slskd.exe --app-dir `"$root\slskd\app`""
