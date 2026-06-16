#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Driver_Pey Deploy ===${NC}"

CONFIG_DIR="/etc/nginx/sites-available"
CONFIG_FILE="$CONFIG_DIR/driver-pey"

# 1. Verificar .env
if [ ! -f frontend/.env ]; then
  echo -e "${YELLOW}[!] frontend/.env não encontrado, criando...${NC}"
  echo "VITE_API_URL=/api" > frontend/.env
fi

# 2. Atualizar código
echo -e "${YELLOW}[1/5] Atualizando código...${NC}"
git pull

export COMMIT_HASH=$(git rev-parse --short HEAD)

# 3. Reconstruir containers
echo -e "${YELLOW}[2/5] Reconstruindo containers...${NC}"
docker compose build --no-cache
docker compose up -d

# 4. Configurar nginx do host se existir
if [ -f "$CONFIG_FILE" ]; then
  echo -e "${YELLOW}[3/5] Verificando nginx do host...${NC}"
  CLIENT_SIZE=$(grep -c "client_max_body_size" "$CONFIG_FILE" || true)
  if [ "$CLIENT_SIZE" -eq 0 ]; then
    echo -e "${YELLOW}[!] Adicionando client_max_body_size ao nginx...${NC}"
    sudo sed -i 's/server_name/server_name\n    client_max_body_size 50M;/' "$CONFIG_FILE"
  fi
  sudo nginx -t && sudo systemctl reload nginx
fi

# 5. Verificar saúde
echo -e "${YELLOW}[4/5] Verificando saúde...${NC}"
sleep 3
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
  echo -e "${GREEN}[OK] Backend saudável (HTTP $HEALTH)${NC}"
else
  echo -e "${RED}[FAIL] Backend não respondeu (HTTP $HEALTH)${NC}"
fi

# 6. Resumo
echo -e "${YELLOW}[5/5] Containers rodando:${NC}"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo -e "${GREEN}=== Deploy concluído ===${NC}"
