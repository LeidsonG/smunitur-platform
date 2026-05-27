#!/bin/bash
# Prepara o ambiente de desenvolvimento do zero com um único comando.
# Uso: ./scripts/setup-dev.sh [--demo]
#
# Flags:
#   --demo   Popula também com dados de demonstração (linhas, modelos, etc.)

set -e

WITH_DEMO=false
for arg in "$@"; do
  [ "$arg" = "--demo" ] && WITH_DEMO=true
done

# ── 1. Verificar pré-requisitos ──────────────────────────────────────────────
echo "Verificando pré-requisitos..."

if ! command -v docker &>/dev/null; then
  echo "Erro: Docker não encontrado. Instale o Docker Desktop primeiro."
  exit 1
fi

if [ ! -f ".env" ]; then
  echo ""
  echo "Arquivo .env não encontrado."
  echo "Copie o exemplo e preencha as variáveis:"
  echo "  cp .env.docker.example .env"
  echo ""
  exit 1
fi

# ── 2. Build e subida dos containers ────────────────────────────────────────
echo ""
echo "Subindo containers (isso pode demorar alguns minutos na primeira vez)..."
docker compose up -d --build

# ── 3. Aguardar o backend estar pronto ──────────────────────────────────────
echo ""
echo "Aguardando o backend ficar pronto..."

for i in $(seq 1 60); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    break
  fi
  printf "."
  sleep 3
done
echo ""

if [ "$STATUS" != "200" ]; then
  echo "Erro: o backend não ficou disponível. Verifique os logs:"
  echo "  docker compose logs backend"
  exit 1
fi

# ── 4. Seed padrão ──────────────────────────────────────────────────────────
echo "Criando usuário admin..."
docker compose exec backend npm run db:seed

# ── 5. Seed de demonstração (opcional) ──────────────────────────────────────
if [ "$WITH_DEMO" = true ]; then
  echo ""
  echo "Populando dados de demonstração..."
  docker compose exec backend npm run db:seed:demo
fi

# ── 6. Resultado ────────────────────────────────────────────────────────────
echo ""
echo "========================================="
echo " Ambiente pronto!"
echo "========================================="
echo " Site:    http://localhost:3000"
echo " API:     http://localhost:3001/api/health"
echo " Admin:   http://localhost:3000/admin/login"
echo "-----------------------------------------"
echo " Login:   admin@smunitur.com.br"
echo " Senha:   admin123"
echo "========================================="
echo ""
echo "Troque a senha em /admin/perfil após logar."
