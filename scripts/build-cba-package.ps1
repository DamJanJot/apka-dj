param(
    [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string]$Message)
    Write-Host "[build-cba] $Message"
}

Write-Step "Repo root: $RepoRoot"
Set-Location $RepoRoot

$sourcePublic = Join-Path $RepoRoot "dist"
$sourceApi = Join-Path $RepoRoot "dj-api"
$targetRoot = Join-Path $RepoRoot "cba_upload_package"
$targetPublic = Join-Path $targetRoot "public_html"
$targetCore = Join-Path $targetRoot "laravel_core"

if (!(Test-Path $sourcePublic)) {
    throw "Brak folderu dist/. Najpierw uruchom: npm run build"
}

if (!(Test-Path $sourceApi)) {
    throw "Brak folderu dj-api/."
}

Write-Step "Czyszczenie katalogow docelowych"
if (Test-Path $targetPublic) { Remove-Item $targetPublic -Recurse -Force }
if (Test-Path $targetCore) { Remove-Item $targetCore -Recurse -Force }
New-Item -ItemType Directory -Path $targetPublic | Out-Null
New-Item -ItemType Directory -Path $targetCore | Out-Null

Write-Step "Kopiowanie frontendu do public_html"
Copy-Item (Join-Path $sourcePublic "*") $targetPublic -Recurse -Force

Write-Step "Kopiowanie plikow Laravel do laravel_core"
Copy-Item (Join-Path $sourceApi "*") $targetCore -Recurse -Force

Write-Step "Usuwanie katalogow niepotrzebnych na produkcji"
$removeFromCore = @(
    ".git",
    "tests",
    "public",
    "node_modules"
)

foreach ($item in $removeFromCore) {
    $path = Join-Path $targetCore $item
    if (Test-Path $path) {
        Remove-Item $path -Recurse -Force
    }
}

Write-Step "Doklejanie index.php i .htaccess pod layout CBA"
Copy-Item (Join-Path $sourceApi "public\index.php") (Join-Path $targetPublic "index.php") -Force
Copy-Item (Join-Path $sourceApi "public\.htaccess") (Join-Path $targetPublic ".htaccess") -Force
if (Test-Path (Join-Path $sourceApi "public\favicon.ico")) {
    Copy-Item (Join-Path $sourceApi "public\favicon.ico") (Join-Path $targetPublic "favicon.ico") -Force
}

Write-Step "Podmiana sciezek index.php -> ../laravel_core"
$indexPath = Join-Path $targetPublic "index.php"
$indexContent = Get-Content $indexPath -Raw
$indexContent = $indexContent -replace "\.\./vendor/autoload\.php", "../laravel_core/vendor/autoload.php"
$indexContent = $indexContent -replace "\.\./bootstrap/app\.php", "../laravel_core/bootstrap/app.php"
Set-Content -Path $indexPath -Value $indexContent -Encoding UTF8

Write-Step "Pakowanie zip"
$zipPublic = Join-Path $targetRoot "public_html.zip"
$zipCoreNoVendor = Join-Path $targetRoot "laravel_core_no_vendor.zip"
$zipCoreVendor = Join-Path $targetRoot "laravel_core_vendor.zip"

if (Test-Path $zipPublic) { Remove-Item $zipPublic -Force }
if (Test-Path $zipCoreNoVendor) { Remove-Item $zipCoreNoVendor -Force }
if (Test-Path $zipCoreVendor) { Remove-Item $zipCoreVendor -Force }

Compress-Archive -Path (Join-Path $targetPublic "*") -DestinationPath $zipPublic -Force

Get-ChildItem $targetCore -Exclude "vendor" | Compress-Archive -DestinationPath $zipCoreNoVendor -Force

$vendorPath = Join-Path $targetCore "vendor"
if (Test-Path $vendorPath) {
    Compress-Archive -Path (Join-Path $vendorPath "*") -DestinationPath $zipCoreVendor -Force
}

Write-Step "Gotowe. Rozmiary paczek:"
Get-ChildItem (Join-Path $targetRoot "*.zip") |
    Select-Object Name, @{Name = "MB"; Expression = { [math]::Round($_.Length / 1MB, 2) }} |
    Format-Table -AutoSize

Write-Step "Koniec"
