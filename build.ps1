# Build JournalLens .xpi
# Usage: powershell -ExecutionPolicy Bypass -File build.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

$manifest = Get-Content "$root\manifest.json" -Raw | ConvertFrom-Json
$version = $manifest.version
$outDir = Join-Path $root "build"
$xpi = Join-Path $outDir "journallens-$version.xpi"

New-Item -ItemType Directory -Force $outDir | Out-Null
if (Test-Path $xpi) { Remove-Item $xpi -Force }

# Files and directories included in the package
$include = @("manifest.json", "bootstrap.js", "prefs.js")
$includeDirs = @("content", "locale", "icons")

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($xpi, "Create")
try {
    foreach ($f in $include) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip, (Join-Path $root $f), $f) | Out-Null
    }
    foreach ($d in $includeDirs) {
        $base = Join-Path $root $d
        Get-ChildItem $base -Recurse -File | ForEach-Object {
            # Entry names must use forward slashes
            $rel = $_.FullName.Substring($root.Length + 1).Replace("\", "/")
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $zip, $_.FullName, $rel) | Out-Null
        }
    }
}
finally {
    $zip.Dispose()
}

Write-Host "Built $xpi"
