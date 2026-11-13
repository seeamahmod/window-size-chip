# Builds the ZIP to upload to the Chrome Web Store (and Edge Add-ons).
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File store\build-zip.ps1
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$version = (Get-Content "$root\manifest.json" -Raw | ConvertFrom-Json).version
$dist = Join-Path $root "dist"
New-Item -ItemType Directory -Force $dist | Out-Null
$zipPath = Join-Path $dist "shrink-window-$version.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Only the files the extension needs at runtime.
$files = @(
  "manifest.json", "background.js", "content.js", "inject.js", "presets.js",
  "popup.html", "popup.css", "popup.js",
  "view.html", "view.css", "view.js",
  "icons/icon16.png", "icons/icon32.png", "icons/icon48.png", "icons/icon128.png",
  "LICENSE"
)

# Entry names use forward slashes; the store rejects backslash paths.
$zip = [IO.Compression.ZipFile]::Open($zipPath, [IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($f in $files) {
    $src = Join-Path $root $f
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $src, $f, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally {
  $zip.Dispose()
}
Write-Output "Built $zipPath ($([math]::Round((Get-Item $zipPath).Length / 1KB, 1)) KB)"
