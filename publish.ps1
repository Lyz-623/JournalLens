# One-shot publish script: creates the GitHub repo (first run), pushes,
# and publishes a release with the built XPI.
# Prerequisite: gh auth login   (run once, interactive)
# Usage: powershell -ExecutionPolicy Bypass -File publish.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Set-Location $root

$gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) { $gh = "gh" }

$manifest = Get-Content "$root\manifest.json" -Raw | ConvertFrom-Json
$version = $manifest.version
$tag = "v$version"
$xpi = "$root\build\journallens-$version.xpi"

# Build if needed
if (-not (Test-Path $xpi)) {
    powershell -ExecutionPolicy Bypass -File "$root\build.ps1"
}

# Create repo + set remote on first run
$hasRemote = git remote | Select-String -Quiet "origin"
if (-not $hasRemote) {
    & $gh repo create JournalLens --public --source . --remote origin `
        --description "Zotero plugin: follow journals and browse latest articles with abstracts, figures and captions"
}

git push -u origin main

# Create the release with the XPI attached
& $gh release create $tag $xpi --title "JournalLens $version" --notes @"
JournalLens $version — follow journals inside Zotero.

**Install:** download ``journallens-$version.xpi`` below, then in Zotero: Tools -> Plugins -> gear icon -> Install Plugin From File.

**安装方法:** 下载下方的 ``journallens-$version.xpi``,在 Zotero 中: 工具 -> 插件 -> 齿轮图标 -> 从文件安装插件。
"@

Write-Host ""
Write-Host "Published $tag. Release page:"
& $gh release view $tag --web
