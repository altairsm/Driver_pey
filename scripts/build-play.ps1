$ROOT = Split-Path -Parent $PSScriptRoot
$FRONTEND = Join-Path $ROOT "frontend"
$ANDROID = Join-Path $FRONTEND "android"
$PLAY_OUT = Join-Path $FRONTEND "play"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "     BUILD AAB PARA O GOOGLE PLAY       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Build web. O npm roda o prebuild automaticamente, que gera
#    android/version.properties (versionCode/versionName).
Write-Host "`n[1/4] Build Vite (+ version.properties)..." -ForegroundColor Green
Set-Location $FRONTEND
npm run build
if (-not $?) { throw "build failed" }

# 2. Copia os assets web para o projeto Android
Write-Host "`n[2/4] Copiando assets para Android..." -ForegroundColor Green
npx cap copy
if (-not $?) { throw "cap copy failed" }

# 3. Gera o Android App Bundle assinado (formato exigido pelo Play)
Write-Host "`n[3/4] Build AAB (Gradle bundleRelease)..." -ForegroundColor Green
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
Set-Location $ANDROID
.\gradlew.bat bundleRelease
if (-not $?) { throw "gradle failed" }

# 4. Copia o AAB para frontend/play
Write-Host "`n[4/4] Copiando AAB..." -ForegroundColor Green
$AAB = Join-Path $ANDROID "app\build\outputs\bundle\release\app-release.aab"
if (-not (Test-Path $AAB)) { throw "AAB nao encontrado em $AAB" }
New-Item -ItemType Directory -Force -Path $PLAY_OUT | Out-Null
Copy-Item $AAB (Join-Path $PLAY_OUT "DriverPix.aab") -Force

$props = Get-Content (Join-Path $ANDROID "version.properties") -Raw
$vcode = ([regex]::Match($props, 'versionCode=(\d+)')).Groups[1].Value
$vname = ([regex]::Match($props, 'versionName=(.+)')).Groups[1].Value.Trim()

Set-Location $ROOT

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "      AAB CONCLUIDO!                    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AAB: frontend\play\DriverPix.aab"
Write-Host "  versionCode: $vcode"
Write-Host "  versionName: $vname"
Write-Host ""
Write-Host "  Proximo passo: Play Console -> Teste interno -> Enviar AAB"
Write-Host "========================================" -ForegroundColor Cyan
