$ROOT = Split-Path -Parent $PSScriptRoot
$FRONTEND = Join-Path $ROOT "frontend"
$ANDROID = Join-Path $FRONTEND "android"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "      BUILD COMPLETO DRIVER PIX         " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Gera version.json com o commit atual
Write-Host "`n[1/4] Gerando version.json..." -ForegroundColor Green
Set-Location $FRONTEND
npm run prebuild
if (-not $?) { throw "prebuild failed" }

# 2. Build do frontend
Write-Host "`n[2/4] Build Vite..." -ForegroundColor Green
npm run build
if (-not $?) { throw "build failed" }

# 3. Gera APK release assinado
Write-Host "`n[3/4] Build APK (Gradle assembleRelease)..." -ForegroundColor Green
Set-Location $ANDROID
.\gradlew assembleRelease
if (-not $?) { throw "gradle failed" }

# 4. Copia APK para public e dist
Write-Host "`n[4/4] Copiando DriverPix.apk..." -ForegroundColor Green
$APK_SRC = Join-Path $ANDROID "app\build\outputs\apk\release\app-release.apk"
Copy-Item $APK_SRC (Join-Path $FRONTEND "public\DriverPix.apk") -Force
Copy-Item $APK_SRC (Join-Path $FRONTEND "dist\DriverPix.apk") -Force

Set-Location $ROOT

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "      BUILD CONCLUÍDO!                   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  APK: frontend\public\DriverPix.apk"
Write-Host "  APK: frontend\dist\DriverPix.apk"
Write-Host "  Web: dist/ (link: /DriverPix.apk)"
Write-Host "========================================" -ForegroundColor Cyan
