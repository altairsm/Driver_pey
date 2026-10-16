#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Driver_Pey Deploy ===${NC}"

# Guardrail: impedir deploy caso este repositorio aponte para o projeto errado
# Normaliza a URL (remove scheme, usuario:senha e aceita forma SSH git@host:path)
EXPECTED_REPO="github.com/altairsm/Driver_pey.git"
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || true)
NORM_REMOTE=$(echo "$CURRENT_REMOTE" | sed -E 's#^git@#https://#; s#^[a-z]+://##; s#^[^@]+@##; s#:#/#')
if [ "$NORM_REMOTE" != "$EXPECTED_REPO" ]; then
  MASKED=$(echo "$CURRENT_REMOTE" | sed -E 's#(://)[^@]+@#\1***@#')
  echo -e "${RED}[!] Repositorio errado: origin=$MASKED${NC}"
  echo -e "${RED}[!] Esperado: $EXPECTED_REPO. Abortando para evitar mistura com Driver_PIX_SSW.${NC}"
  exit 1
fi

CONFIG_DIR="/etc/nginx/sites-available"
CONFIG_FILE="$CONFIG_DIR/driver-pey"

# 1. Verificar .env
if [ ! -f frontend/.env ]; then
  echo -e "${YELLOW}[!] frontend/.env não encontrado, criando...${NC}"
  echo "VITE_API_URL=/api" > frontend/.env
fi

# 2. Atualizar código
echo -e "${YELLOW}[1/8] Atualizando código...${NC}"
git pull
git fetch --tags --force

# Guardrail: a tabela de motoristas é 'matriculos_jad' (com "o").
# O typo 'matriculas_jad' (com "a") causa 500 em runtime e NÃO é detectado por build/lint.
if git grep -n "matriculas_jad" -- backend/src > /tmp/typo_jad.txt 2>/dev/null && [ -s /tmp/typo_jad.txt ]; then
  echo -e "${RED}[!] Typo 'matriculas_jad' (a tabela correta é 'matriculos_jad'). Deploy abortado:${NC}"
  cat /tmp/typo_jad.txt
  exit 1
fi
rm -f /tmp/typo_jad.txt

export COMMIT_HASH=$(git rev-parse --short HEAD)
export VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo unknown)
if [ "$VERSION" = "unknown" ]; then
  echo -e "${RED}[!] AVISO: VERSION ficou 'unknown' (git describe sem tags). Deploy continua, mas a toolbar mostrara unknown.${NC}"
fi

# 3. Reconstruir containers
echo -e "${YELLOW}[2/8] Reconstruindo containers...${NC}"
docker compose build --no-cache
docker compose up -d

# 4. Configurar nginx do host se existir
if [ -f "$CONFIG_FILE" ]; then
  echo -e "${YELLOW}[3/8] Verificando nginx do host...${NC}"
  CLIENT_SIZE=$(grep -c "client_max_body_size" "$CONFIG_FILE" || true)
  if [ "$CLIENT_SIZE" = "0" ]; then
    echo -e "${YELLOW}[!] Adicionando client_max_body_size ao nginx...${NC}"
    sudo sed -i 's/server_name/server_name\n    client_max_body_size 50M;/' "$CONFIG_FILE"
  fi
  sudo nginx -t && sudo systemctl reload nginx
fi

# 5. Verificar saúde
echo -e "${YELLOW}[4/8] Verificando saúde...${NC}"
sleep 3
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
  echo -e "${GREEN}[OK] Backend saudável (HTTP $HEALTH)${NC}"
else
  echo -e "${RED}[FAIL] Backend não respondeu (HTTP $HEALTH). Veja: docker compose logs backend${NC}"
fi

# 6. Verificar schema (migration Step 9 + versao_apk.versao).
# Sem isso, colunas faltando só aparecem como 500 em runtime nas telas de admin.
echo -e "${YELLOW}[5/8] Verificando schema (colunas do webhook Pix)...${NC}"
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  COLS=$(docker exec driver-pey-db psql -U postgres -d jadlog -tAc \
    "SELECT count(*) FROM information_schema.columns
     WHERE table_name='solicitacoes_pagamento'
       AND column_name IN ('webhook_http_status','webhook_erro','webhook_tentativas','ultimo_webhook_em','pix_enviado_em')" 2>/dev/null || echo "")
  [ "$COLS" = "5" ] && break
  sleep 3
done
if [ "$COLS" = "5" ]; then
  echo -e "${GREEN}[OK] solicitacoes_pagamento com 5/5 colunas de webhook${NC}"
else
  echo -e "${RED}[!] Step 9 incompleto: ${COLS:-0}/5 colunas em solicitacoes_pagamento.${NC}"
  echo -e "${RED}[!] Consultas ao webhook vao falhar com 500. Veja: docker compose logs backend | grep -i migration${NC}"
  exit 1
fi

# versao_apk.versao e gravada no upload do APK (POST /admin/upload-apk).
# Ausente = todo upload responde 500 e nenhum APK pode ser publicado.
VCOL=$(docker exec driver-pey-db psql -U postgres -d jadlog -tAc \
  "SELECT count(*) FROM information_schema.columns
   WHERE table_name='versao_apk' AND column_name='versao'" 2>/dev/null || echo "0")
if [ "$VCOL" = "1" ]; then
  echo -e "${GREEN}[OK] versao_apk.versao presente${NC}"
else
  echo -e "${RED}[!] versao_apk.versao ausente: POST /admin/upload-apk vai responder 500.${NC}"
  exit 1
fi

# Fuso do dia da operacao. As regras de adiantamento (regra 05, taxa e
# "Aguarde 24h apos a baixa") usam o dia civil do Brasil; o Postgres precisa do
# mesmo fuso para o CURRENT_DATE do SQL concordar com o calculo em JS.
echo -e "${YELLOW}[6/8] Verificando fuso da operação...${NC}"
BE_TZ=$(docker exec driver-pey-backend sh -c 'printenv TZ' 2>/dev/null || echo "")
DB_TZ=$(docker exec driver-pey-db psql -U postgres -d jadlog -tAc "SHOW TimeZone" 2>/dev/null || echo "")
if [ "$BE_TZ" = "America/Sao_Paulo" ] && [ "$DB_TZ" = "America/Sao_Paulo" ]; then
  echo -e "${GREEN}[OK] backend e Postgres em America/Sao_Paulo${NC}"
else
  echo -e "${RED}[!] Fuso divergente (backend='${BE_TZ:-vazio}', postgres='${DB_TZ:-vazio}').${NC}"
  echo -e "${RED}[!] As regras de adiantamento passam a usar o dia UTC. Confira TZ/PGTZ no docker-compose.yml.${NC}"
  exit 1
fi

# 7. Persistencia do APK.
# O backend grava o APK em /app/uploads, que precisa ser o volume nomeado
# 'apkdata'. Se o volume nao estiver montado nesse caminho, o APK se perde a
# cada "up -d" e o download passa a responder 404 sem erro visivel.
echo -e "${YELLOW}[7/8] Verificando persistencia do APK...${NC}"
if docker exec driver-pey-backend sh -c 'mount | grep -q " /app/uploads "' 2>/dev/null; then
  echo -e "${GREEN}[OK] volume apkdata montado em /app/uploads${NC}"
else
  echo -e "${RED}[!] /app/uploads NAO e um volume montado: o APK enviado sera perdido no proximo deploy.${NC}"
  echo -e "${RED}[!] Confira o volume do servico backend no docker-compose.yml.${NC}"
  exit 1
fi

# O download chega em /api/download/DriverPix.apk. Se o nginx nao der
# precedencia ao location /api/ frente a regex .apk, o pedido morre com 404
# antes de chegar ao backend - foi exatamente o que quebrou em v3.7.1.
if docker exec driver-pey-frontend nginx -t >/dev/null 2>&1; then
  echo -e "${GREEN}[OK] nginx do frontend com configuracao valida${NC}"
else
  echo -e "${RED}[!] nginx do frontend com config invalida: docker exec driver-pey-frontend nginx -t${NC}"
  exit 1
fi

if docker exec driver-pey-backend sh -c 'test -f /app/uploads/DriverPix.apk' 2>/dev/null; then
  APK_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/api/download/DriverPix.apk" || echo "000")
  if [ "$APK_CODE" = "200" ]; then
    echo -e "${GREEN}[OK] download do APK respondendo 200${NC}"
  else
    echo -e "${RED}[!] download do APK respondeu HTTP $APK_CODE. O motorista nao consegue atualizar o app.${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}[!] Nenhum APK em /app/uploads ainda: envie pelo Admin -> Versao.${NC}"
fi

# 8. Resumo
echo -e "${YELLOW}[8/8] Containers rodando:${NC}"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo -e "${GREEN}=== Deploy concluído ===${NC}"
