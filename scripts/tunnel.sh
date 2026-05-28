#!/bin/bash
# Expõe o projeto via Cloudflare Tunnel com um único comando.
# Uso: ./scripts/tunnel.sh

set -e

FRONTEND_PORT=3000
BACKEND_PORT=3001

echo "Iniciando tunnels..."

# Inicia tunnel do backend em background e captura o link
BACKEND_LOG=$(mktemp)
cloudflared tunnel --url http://localhost:$BACKEND_PORT --no-autoupdate 2>"$BACKEND_LOG" &
BACKEND_PID=$!

# Inicia tunnel do frontend em background e captura o link
FRONTEND_LOG=$(mktemp)
cloudflared tunnel --url http://localhost:$FRONTEND_PORT --no-autoupdate 2>"$FRONTEND_LOG" &
FRONTEND_PID=$!

echo "Aguardando links serem gerados..."

TUNNEL_BACKEND=""
TUNNEL_FRONTEND=""

for i in $(seq 1 30); do
  sleep 1
  [ -z "$TUNNEL_BACKEND" ] && TUNNEL_BACKEND=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$BACKEND_LOG" 2>/dev/null | head -1)
  [ -z "$TUNNEL_FRONTEND" ] && TUNNEL_FRONTEND=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$FRONTEND_LOG" 2>/dev/null | head -1)
  [ -n "$TUNNEL_BACKEND" ] && [ -n "$TUNNEL_FRONTEND" ] && break
done

if [ -z "$TUNNEL_BACKEND" ] || [ -z "$TUNNEL_FRONTEND" ]; then
  echo "Erro: não foi possível obter os links dos tunnels."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit 1
fi

echo ""
echo "Reiniciando containers com as URLs corretas..."

docker compose stop frontend backend

export FRONTEND_URL=$TUNNEL_FRONTEND
export NEXT_PUBLIC_API_URL=$TUNNEL_BACKEND/api
docker compose up backend -d
docker compose up frontend -d
unset FRONTEND_URL NEXT_PUBLIC_API_URL

echo ""
echo "=================================="
echo " Tunnels ativos!"
echo "=================================="
echo " Frontend: $TUNNEL_FRONTEND"
echo " Backend:  $TUNNEL_BACKEND"
echo "=================================="
echo ""
echo "Compartilhe o link do FRONTEND com quem for testar."
echo "Pressione Ctrl+C para encerrar os tunnels."
echo ""

# Mantém o script rodando até Ctrl+C
trap "echo 'Encerrando...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait
