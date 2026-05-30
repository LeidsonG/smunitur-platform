#!/bin/bash
# Deploy da aplicação SM Unitur no servidor de produção.
# Uso: ./scripts/deploy.sh [--branch <nome>]
#
# Padrão: faz deploy da branch atual.
# Opções:
#   --branch main     deploy de produção (padrão)
#   --branch staging  deploy do ambiente de testes

set -euo pipefail

BRANCH="${2:-$(git rev-parse --abbrev-ref HEAD)}"
APP_DIR="/var/www/smunitur"
BACKUP_DIR="/var/backups/smunitur"
LOG_TAG="[deploy]"

# Processar flags
if [[ "${1:-}" == "--branch" ]]; then
  BRANCH="$2"
fi

echo ""
echo "======================================="
echo " $LOG_TAG SM Unitur Deploy"
echo " Branch: $BRANCH"
echo " Data:   $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================="
echo ""

# ── 1. Verificar que estamos no diretório certo ─────────────────────────────
if [ ! -d "$APP_DIR" ]; then
  echo "$LOG_TAG Erro: diretório $APP_DIR não encontrado."
  echo "$LOG_TAG Execute este script a partir da VM de produção."
  exit 1
fi

cd "$APP_DIR"

# ── 2. Snapshot preventivo do banco ─────────────────────────────────────────
echo "$LOG_TAG Fazendo backup do banco antes do deploy..."
mkdir -p "$BACKUP_DIR"

URL=$(grep -E '^DATABASE_URL=' backend/.env | cut -d= -f2- | tr -d '"')
DB_USER=$(echo "$URL" | sed -E 's|^mysql://([^:]+):.*|\1|')
DB_PASS=$(echo "$URL" | sed -E 's|^mysql://[^:]+:([^@]+)@.*|\1|')
DB_NAME=$(echo "$URL" | sed -E 's|.*/([^?]+).*|\1|')
STAMP=$(date +%Y%m%d-%H%M%S)

mysqldump --single-transaction --quick \
  -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  | gzip > "$BACKUP_DIR/pre-deploy-$STAMP.sql.gz"

echo "$LOG_TAG Backup salvo: pre-deploy-$STAMP.sql.gz"

# ── 3. Criar tag git antes de atualizar ─────────────────────────────────────
TAG="deploy-$STAMP"
git tag "$TAG"
echo "$LOG_TAG Tag criada: $TAG"

# ── 4. Puxar código ──────────────────────────────────────────────────────────
echo ""
echo "$LOG_TAG Atualizando código ($BRANCH)..."
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# ── 5. Backend ───────────────────────────────────────────────────────────────
echo ""
echo "$LOG_TAG Backend — instalando dependências e compilando..."
cd "$APP_DIR/backend"
npm ci --omit=dev
npx prisma migrate deploy
npm run build

# ── 6. Frontend ──────────────────────────────────────────────────────────────
echo ""
echo "$LOG_TAG Frontend — instalando dependências e compilando..."
cd "$APP_DIR/frontend"
npm ci --omit=dev
npm run build

# ── 7. Reiniciar processos sem downtime ──────────────────────────────────────
echo ""
echo "$LOG_TAG Recarregando processos PM2..."
pm2 reload smunitur-api
pm2 reload smunitur-web

# ── 8. Verificação rápida ────────────────────────────────────────────────────
echo ""
echo "$LOG_TAG Verificando healthcheck..."
sleep 3

STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")

if [ "$STATUS" = "200" ]; then
  echo ""
  echo "======================================="
  echo " $LOG_TAG Deploy concluído com sucesso!"
  echo " Tag de rollback: $TAG"
  echo "======================================="
  echo ""
else
  echo ""
  echo "======================================="
  echo " $LOG_TAG ATENÇÃO: healthcheck retornou $STATUS"
  echo " Verifique os logs: pm2 logs smunitur-api"
  echo " Para rollback: git checkout $TAG && ./scripts/deploy.sh"
  echo "======================================="
  echo ""
  exit 1
fi
