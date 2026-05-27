# ─── Base ─────────────────────────────────────────────────────────────────────
# node:22-slim (Debian) em vez de Alpine — compatibilidade nativa com sharp/libvips.
FROM node:22-slim AS base
WORKDIR /app

# Dependências nativas necessárias para compilar o sharp (libvips bindings)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# ─── Todas as dependências (dev + prod) ───────────────────────────────────────
FROM base AS all-deps
COPY package.json package-lock.json ./
RUN npm ci

# ─── Somente dependências de produção ─────────────────────────────────────────
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ─── Desenvolvimento (hot reload via ts-node-dev) ──────────────────────────────
# O docker-compose monta ./backend como volume e sobrescreve /app em runtime.
# O node_modules dentro do container (Linux) fica protegido por volume nomeado,
# evitando conflito com o node_modules Windows do host.
FROM base AS dev
COPY --from=all-deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
EXPOSE 3001
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]

# ─── Build TypeScript ──────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=all-deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ─── Produção ─────────────────────────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
# Apenas dependências de produção
COPY --from=prod-deps /app/node_modules ./node_modules
# Cliente Prisma gerado (node_modules/.prisma) precisa vir do builder
# porque prod-deps não rodou `prisma generate`
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
# Schema + migrations necessários para `prisma migrate deploy` no entrypoint
COPY prisma ./prisma
EXPOSE 3001
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
