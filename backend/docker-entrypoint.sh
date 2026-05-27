#!/bin/sh
# Entrypoint do container backend (dev e produção).
# Roda antes do CMD — garante que o cliente Prisma esteja gerado e as
# migrations aplicadas antes de iniciar o servidor.
set -e

echo "▶ gerando cliente prisma..."
npx prisma generate

echo "▶ aplicando migrations pendentes..."
npx prisma migrate deploy

echo "▶ iniciando aplicação..."
exec "$@"
