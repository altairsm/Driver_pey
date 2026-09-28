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
echo -e "${YELLOW}[1/6] Atualizando código...${NC}"
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
echo -e "${YELLOW}[2/6] Reconstruindo containers...${NC}"
docker compose build --no-cache
docker compose up -d

# 4. Configurar nginx do host se existir
if [ -f "$CONFIG_FILE" ]; then
  echo -e "${YELLOW}[3/6] Verificando nginx do host...${NC}"
  CLIENT_SIZE=$(grep -c "client_max_body_size" "$CONFIG_FILE" || true)
  if [ "$CLIENT_SIZE" = "0" ]; then
    echo -e "${YELLOW}[!] Adicionando client_max_body_size ao nginx...${NC}"
    sudo sed -i 's/server_name/server_name\n    client_max_body_size 50M;/' "$CONFIG_FILE"
  fi
  sudo nginx -t && sudo systemctl reload nginx
fi

# 5. Verificar saúde
echo -e "${YELLOW}[4/6] Verificando saúde...${NC}"
sleep 3
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
  echo -e "${GREEN}[OK] Backend saudável (HTTP $HEALTH)${NC}"
else
  echo -e "${RED}[FAIL] Backend não respondeu (HTTP $HEALTH). Veja: docker compose logs backend${NC}"
fi

# 6. Verificar schema do webhook Pix (migration Step 9).
# Sem isso, colunas faltando só aparecem como 500 em runtime nas telas de admin.
echo -e "${YELLOW}[5/6] Verificando schema (colunas do webhook Pix)...${NC}"
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

# 7. Resumo
echo -e "${YELLOW}[6/6] Containers rodando:${NC}"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo -e "${GREEN}=== Deploy concluído ===${NC}"
