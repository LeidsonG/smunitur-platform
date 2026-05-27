# Referência Docker + WSL2 — SM Unitur

Referência avançada do ambiente Docker. Para o guia completo de primeiro setup (pré-requisitos, passo a passo, troubleshooting) veja o [`CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## Serviços

| Container | Porta | Imagem | Descrição |
|---|---|---|---|
| `smunitur_db` | 3306 | mysql:8.0 | MySQL — dados em volume `db_data` |
| `smunitur_backend` | 3001 | node:22-slim | API Express + Prisma (hot reload via ts-node-dev) |
| `smunitur_frontend` | 3000 | node:22-slim | Next.js dev server (hot reload) |

### Volumes

| Volume | Montado em | Finalidade |
|---|---|---|
| `db_data` | `/var/lib/mysql` | Dados do MySQL (persistidos entre `down/up`) |
| `backend_modules` | `/app/node_modules` | Módulos Linux do backend (isolados do host Windows) |
| `frontend_modules` | `/app/node_modules` | Módulos Linux do frontend |
| `frontend_next` | `/app/.next` | Cache de build do Next.js |
| `uploads` | `/app/uploads` | Imagens enviadas pelos usuários |

---

## Comandos do dia a dia

```bash
# Subir em background (containers já existentes)
docker compose up -d

# Subir e reconstruir as imagens (após alterar Dockerfile ou instalar deps)
docker compose up -d --build

# Ver status dos containers
docker compose ps

# Ver logs em tempo real
docker compose logs -f              # todos
docker compose logs -f backend      # só backend
docker compose logs -f frontend     # só frontend
docker compose logs -f db           # só MySQL

# Parar tudo (volumes preservados)
docker compose down

# Parar e APAGAR o banco (volumes removidos — uso em reset completo)
docker compose down -v
```

---

## Banco de dados

```bash
# Aplicar migrations pendentes
docker compose exec backend npm run db:migrate:deploy

# Criar nova migration após editar o schema.prisma
docker compose exec backend npm run db:migrate:dev -- --name nome-da-mudanca

# Ver status das migrations
docker compose exec backend npm run db:migrate:status

# Abrir o Prisma Studio (GUI em http://localhost:5555)
docker compose exec backend npm run db:studio

# Seed: criar admin inicial
docker compose exec backend npm run db:seed

# Seed: popular com dados de demonstração
docker compose exec backend npm run db:seed:demo

# Conectar ao MySQL via CLI
docker compose exec db mysql -u smunitur -p smunitur
```

---

## Gerenciando dependências npm

```bash
# Instalar pacote no backend
docker compose exec backend npm install <pacote>

# Instalar pacote de dev no frontend
docker compose exec frontend npm install -D <pacote>

# Rebuild após instalar (garante que a imagem reflete o lock file)
docker compose build backend
docker compose build frontend
```

> Os `node_modules` ficam em volumes nomeados separados do host. Isso evita que
> binários compilados para Linux (ex.: `sharp`, `bcrypt`) sejam substituídos por
> versões Windows quando o projeto é editado pelo Windows Explorer.

---

## Performance — WSL2 vs Windows

O desempenho do bind mount (código fonte ↔ container) depende de **onde o repositório está clonado**:

| Localização do repo | Hot reload | Recomendado? |
|---|---|---|
| `~/projetos/` (filesystem WSL2) | Rápido (inotify nativo) | ✅ Sim |
| `C:\projetos\` (filesystem Windows) | Lento (polling) | ⚠️ Evitar |

Quando o código está no Windows, o polling compensa a detecção de mudanças — mas consome mais CPU e tem latência maior. As variáveis `CHOKIDAR_USEPOLLING=true` e `WATCHPACK_POLLING=true` estão habilitadas por padrão no `docker-compose.yml` para esse cenário.

**Se o repositório estiver no WSL2**, você pode desativar o polling:

```yaml
# docker-compose.yml — seção environment do backend e do frontend
CHOKIDAR_USEPOLLING: "false"
WATCHPACK_POLLING:   "false"
```

---

## Build de produção

```bash
# Sobe em modo produção (Next.js compilado, sem hot reload)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Antes de rodar, defina no `.env`:
```env
NEXT_PUBLIC_API_URL_PROD=https://SEU_DOMINIO.com.br/api
```

> O deploy oficial é feito de forma nativa na VM (PM2 + Nginx), **não** com
> Docker em produção. Veja [`docs/2-deploy.md`](2-deploy.md).

---

## Reset completo

Use quando algo estiver quebrado e nenhum troubleshooting resolver:

```bash
docker compose down -v           # para tudo e remove os volumes (banco incluído)
docker compose build --no-cache  # reconstrói as imagens sem cache
docker compose up -d             # sobe tudo do zero
docker compose exec backend npm run db:seed   # recria o admin
```
