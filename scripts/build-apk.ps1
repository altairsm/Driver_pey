$ROOT = Split-Path -Parent $PSScriptRoot
$FRONTEND = Join-Path $ROOT "frontend"
$ANDROID = Join-Path $FRONTEND "android"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     BUILD APK (SOMENTE TESTE LOCAL)    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "O APK nao e mais distribuido: a instalacao oficial e pelo Google Play." -ForegroundColor Yellow

# 1. Build web. O npm roda o prebuild automaticamente, que gera
#    android/version.properties (versionCode/versionName).
Write-Host "`n[1/3] Build Vite (+ version.properties)..." -ForegroundColor Green
Set-Location $FRONTEND
npm run build
if (-not $?) { throw "build failed" }

# 2. Copia os assets web para o projeto Android
Write-Host "`n[2/3] Copiando assets para Android..." -ForegroundColor Green
npx cap copy
if (-not $?) { throw "cap copy failed" }

# 3. Gera APK assinado, apenas para testes em aparelho
Write-Host "`n[3/3] Build APK (Gradle assembleRelease)..." -ForegroundColor Green
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
Set-Location $ANDROID
.\gradlew.bat assembleRelease
if (-not $?) { throw "gradle failed" }

Set-Location $ROOT
$APK = Join-Path $ANDROID "app\build\outputs\apk\release\app-release.apk"
Write-Host "`nAPK de teste: $APK" -ForegroundColor Cyan
