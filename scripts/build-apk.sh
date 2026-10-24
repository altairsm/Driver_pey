#!/bin/bash
set -e

# APK apenas para teste local. A distribuicao oficial e pelo Google Play.
# O versionCode/versionName sao gerados em frontend/scripts/set-version.js
# (rodado pelo "npm run build") e lidos pelo Gradle.

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

cd "$(dirname "$0")/../frontend"

echo -e "${CYAN}Build APK (somente teste local)${NC}"
npm run build
npx cap copy

cd android
./gradlew assembleRelease
cd ..

echo -e "${GREEN}APK de teste: frontend/android/app/build/outputs/apk/release/app-release.apk${NC}"
