# ─── Base ─────────────────────────────────────────────────────────────────────
FROM node:22-slim AS base
WORKDIR /app

# ─── Todas as dependências (dev + prod) ───────────────────────────────────────
FROM base AS all-deps
COPY package.json package-lock.json ./
RUN npm ci

# ─── Somente dependências de produção ─────────────────────────────────────────
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ─── Desenvolvimento (Next.js dev server com hot reload) ──────────────────────
# O docker-compose monta ./frontend como volume em runtime.
# node_modules fica protegido por volume nomeado (binários Linux).
# WATCHPACK_POLLING permite que o Next.js detecte mudanças de arquivos via
# polling — necessário quando o código está no filesystem Windows (/mnt/c/).
# Se você trabalha direto do filesystem do WSL2 (~/) pode desativar.
FROM base AS dev
COPY --from=all-deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ─── Build de produção ─────────────────────────────────────────────────────────
# NEXT_PUBLIC_API_URL é embutida no bundle em tempo de build — passe via
# build-arg no docker-compose.prod.yml com a URL pública real.
FROM base AS builder
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=all-deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ─── Produção ─────────────────────────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json ./
EXPOSE 3000
CMD ["npm", "start"]
