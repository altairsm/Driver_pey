#!/bin/bash
set -e

# Cores
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}      BUILD COMPLETO DRIVER PIX         ${NC}"
echo -e "${CYAN}========================================${NC}"

# 1. Gera version.json com o commit atual
echo -e "\n${GREEN}[1/4] Gerando version.json...${NC}"
cd frontend
npm run prebuild

# 2. Build do frontend
echo -e "\n${GREEN}[2/4] Build Vite...${NC}"
npm run build

# 3. Gera APK release assinado
echo -e "\n${GREEN}[3/4] Build APK (Gradle assembleRelease)...${NC}"
cd android
./gradlew assembleRelease
cd ..

# 4. Copia APK para public e dist
echo -e "\n${GREEN}[4/4] Copiando DriverPix.apk...${NC}"
cp android/app/build/outputs/apk/release/app-release.apk public/DriverPix.apk
cp android/app/build/outputs/apk/release/app-release.apk dist/DriverPix.apk

echo -e "\n${CYAN}========================================${NC}"
echo -e "${CYAN}      BUILD CONCLUÍDO!                   ${NC}"
echo -e "${CYAN}========================================${NC}"
echo -e "  APK: public/DriverPix.apk"
echo -e "  APK: dist/DriverPix.apk"
echo -e "  Web: dist/ (link: /DriverPix.apk)"
echo -e "${CYAN}========================================${NC}"
