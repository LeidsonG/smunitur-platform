# Guia Docker + WSL2 — SM Unitur

Ambiente de desenvolvimento completo rodando no Ubuntu via WSL2 + Docker Desktop.

---

## Pré-requisitos

| Ferramenta | Versão mínima | Notas |
|---|---|---|
| Docker Desktop | 4.x | Habilitar integração WSL2 nas configurações |
| WSL2 | Ubuntu 22.04+ | Recomendado: manter o código no filesystem WSL2 (`~/`) |

---

## Serviços

| Container | Porta | Descrição |
|---|---|---|
| `smunitur_db` | 3306 | MySQL 8.0 |
| `smunitur_backend` | 3001 | API Node.js/Express (hot reload) |
| `smunitur_frontend` | 3000 | Next.js dev server (hot reload) |

---

## Primeiro uso

### 1. Configure as variáveis de ambiente

```bash
# Na raiz do projeto
cp .env.docker.example .env
```

Edite o `.env` criado e preencha:
- `DB_ROOT_PASSWORD` — senha root do MySQL (uso interno)
- `DB_PASSWORD` — senha do usuário da aplicação
- `JWT_SECRET` — gere com o comando abaixo:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 2. Suba os containers

```bash
docker compose up -d
```

Na primeira execução o Docker vai:
1. Baixar as imagens base (node:22-slim, mysql:8.0)
2. Instalar as dependências npm dentro dos containers
3. Gerar o cliente Prisma
4. Aguardar o MySQL ficar pronto (healthcheck)
5. Rodar as migrations automaticamente

### 3. Verifique se está tudo rodando

```bash
docker compose ps
```

Acesse:
- **Frontend** → http://localhost:3000
- **API** → http://localhost:3001/api/health
- **Admin** → http://localhost:3000/admin/login

---

## Comandos do dia a dia

```bash
# Subir em background
docker compose up -d

# Ver logs em tempo real (todos os serviços)
docker compose logs -f

# Ver logs de um serviço específico
docker compose logs -f backend
docker compose logs -f frontend

# Parar tudo
docker compose down

# Parar e remover volumes (APAGA O BANCO)
docker compose down -v

# Rebuild de um serviço (após instalar nova dependência npm)
docker compose build backend
docker compose build frontend
```

---

## Banco de dados

```bash
# Rodar migrations manualmente
docker compose exec backend npx prisma migrate deploy

# Abrir o Prisma Studio (GUI do banco)
docker compose exec backend npx prisma studio

# Popular banco com dados de exemplo
docker compose exec backend npm run db:seed:demo

# Popular banco com seed inicial (admin)
docker compose exec backend npm run db:seed

# Conectar ao MySQL direto
docker compose exec db mysql -u smunitur -p smunitur
```

---

## Instalar nova dependência npm

```bash
# Backend
docker compose exec backend npm install <pacote>

# Frontend
docker compose exec frontend npm install <pacote>

# Depois rebuild para atualizar a imagem (opcional mas recomendado)
docker compose build backend
```

---

## Performance — WSL2

> **Dica importante**: a performance de bind mounts é muito melhor quando o
> código está no filesystem do WSL2 (`~/projetos/`) e não no Windows (`/mnt/c/`).

### Cenário ideal (máxima performance)

```bash
# Dentro do terminal WSL2 (Ubuntu)
cd ~/projetos
git clone <repo> web-system-unitur
cd web-system-unitur
docker compose up -d
```

### Cenário atual (código em C:\...)

Funciona, mas o hot reload é via **polling** (mais lento).
Os flags `WATCHPACK_POLLING=true` e `CHOKIDAR_USEPOLLING=true` estão
habilitados por padrão no `docker-compose.yml` para garantir que mudanças
de arquivo sejam detectadas mesmo através da barreira WSL2 ↔ Windows.

Para **desativar o polling** (quando no filesystem WSL2):

```yaml
# docker-compose.yml — na seção environment do backend/frontend
CHOKIDAR_USEPOLLING: "false"
WATCHPACK_POLLING: "false"
```

---

## Produção

```bash
# Build e subida em modo produção
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Antes de rodar em produção, defina no `.env`:
```
NEXT_PUBLIC_API_URL_PROD=https://SEU_DOMINIO.com.br/api
```

---

## Solução de problemas

### Container do backend não inicia

Verifique se o MySQL está saudável:
```bash
docker compose ps db
docker compose logs db
```

### Erro `EACCES` nos uploads

O volume `uploads` precisa de permissão de escrita:
```bash
docker compose exec backend chmod -R 777 /app/uploads
```

### Hot reload não funciona

Se os arquivos estão em `C:\...` (Windows), confirme que o polling está ativo:
```bash
docker compose exec frontend env | grep POLLING
docker compose exec backend env | grep POLLING
```

### Rebuild limpo (quando algo estiver muito errado)

```bash
docker compose down -v           # remove volumes também
docker compose build --no-cache  # rebuild sem cache
docker compose up -d
```

### sharp / node-gyp falhou no build

O `Dockerfile` usa `node:22-slim` (Debian) e instala `python3 make g++`
para compilar binários nativos. Se o build falhar, rode:
```bash
docker compose build --no-cache backend
```
