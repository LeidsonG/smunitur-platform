# Como Rodar o Projeto — SM Unitur

O ambiente de desenvolvimento roda em **Docker + WSL2 (Ubuntu)**. Todos os
serviços (MySQL, backend e frontend) sobem em containers — não é preciso
instalar MySQL nem XAMPP na máquina.

> Guia detalhado de Docker (comandos, performance no WSL2, troubleshooting):
> [`docs/DOCKER.md`](docs/DOCKER.md).

---

## Pré-requisitos

- **Docker Desktop** com integração **WSL2** habilitada (Settings → Resources → WSL Integration).
- **Ubuntu no WSL2** (recomendado: clonar o repositório dentro do filesystem do
  Ubuntu, em `~/projetos/`, para hot reload rápido — ver `docs/DOCKER.md`).
- **Node.js 22 LTS** no host (opcional): só é necessário para rodar ferramentas
  fora do container (ex.: lint no editor). A versão está fixada em [`.nvmrc`](.nvmrc).

> **Verificar a versão do Node no host:** `node -v`
> **Trocar com nvm:** `nvm install 22 && nvm use 22` (o `.nvmrc` permite só `nvm use`).
> Baixe o nvm: [nvm.sh](https://github.com/nvm-sh/nvm) (Linux/WSL2).

---

## Setup rápido (Docker)

```bash
# 1. Na raiz do projeto, crie o .env a partir do modelo
cp .env.docker.example .env

# 2. Edite o .env e preencha as senhas e o JWT_SECRET
#    Gere um JWT_SECRET forte com:
#    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Suba todos os serviços
docker compose up -d
```

Na primeira execução o Docker instala as dependências, gera o cliente Prisma e
aplica as migrations automaticamente (via `docker-entrypoint.sh`). Quando os
containers estiverem de pé:

- **Site:** http://localhost:3000
- **Painel admin:** http://localhost:3000/admin
- **API:** http://localhost:3001 — health em http://localhost:3001/api/health

Para popular dados iniciais (admin padrão + linhas):

```bash
docker compose exec backend npm run db:seed
```

### Credenciais padrão do admin

| Campo  | Valor                   |
| ------ | ----------------------- |
| E-mail | `admin@smunitur.com.br` |
| Senha  | `admin123`              |

> **Altere a senha após o primeiro acesso** (em `/admin/perfil`). Em produção,
> defina `SEED_ADMIN_PASSWORD` no `.env` — o sistema recusa subir com senha fraca.

---

## Migrations (Prisma)

O projeto usa **migrations versionadas** (commitadas em
`backend/prisma/migrations/`). Não usamos `prisma db push`.

| Situação | Comando | O que faz |
| --- | --- | --- |
| Criar uma migration após mudar o `schema.prisma` | `docker compose exec backend npm run db:migrate:dev -- --name descricao` | Gera o SQL versionado e aplica no banco de dev |
| Aplicar migrations existentes (dev recém-clonado / produção) | `docker compose exec backend npm run db:migrate:deploy` | Aplica as migrations pendentes em ordem |
| Conferir o estado | `docker compose exec backend npm run db:migrate:status` | Mostra migrations aplicadas/pendentes |

---

## Comandos úteis

```bash
# Logs em tempo real
docker compose logs -f backend
docker compose logs -f frontend

# Abrir o Prisma Studio (GUI do banco) em http://localhost:5555
docker compose exec backend npm run db:studio

# Instalar uma dependência nova
docker compose exec backend npm install <pacote>
docker compose exec frontend npm install <pacote>

# Parar tudo
docker compose down

# Parar e APAGAR o banco (volumes)
docker compose down -v
```

---

## Estrutura de Rotas (Frontend)

| Rota                  | Descrição                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `/`                 | Landing page (Hero, Sobre, Modelos, Serviços, FAQ, Orçamento) |
| `/#orcamento`       | Formulário de orçamento (3 etapas)                             |
| `/#acompanhar`      | Acompanhamento de produção por número                         |
| `/admin/login`      | Login do painel                                                  |
| `/admin/dashboard`  | Dashboard com estatísticas                                      |
| `/admin/orcamentos` | Gestão de orçamentos                                           |
| `/admin/producao`   | Painel de produção                                             |
| `/admin/linhas` | CRUD de linhas                                               |
| `/admin/especificacoes`  | Biblioteca global de especificações e variações                        |
| `/admin/modelos`   | CRUD de modelos + associação de especificações                     |
| `/admin/usuarios`   | Gestão de usuários admin                                       |
| `/admin/perfil`     | Perfil, senha e foto do usuário logado                          |

---

## API Endpoints

### Autenticação

| Método | Rota                          | Auth | Descrição                            |
| ------- | ----------------------------- | ---- | -------------------------------------- |
| POST    | `/api/auth/login`           | —   | Login, retorna JWT                     |
| GET     | `/api/auth/me`              | ✓   | Dados do usuário logado (inclui foto) |
| PATCH   | `/api/auth/change-password` | ✓   | Trocar senha                           |
| PUT     | `/api/auth/me/foto`         | ✓   | Upload de foto de perfil               |

### Linhas

| Método | Rota                    | Auth | Descrição                                                          |
| ------- | ----------------------- | ---- | -------------------------------------------------------------------- |
| GET     | `/api/linhas`     | —   | Linhas com modelos ativos.`?todos=true` retorna todas (admin) |
| POST    | `/api/linhas`     | ✓   | Criar linha                                                      |
| PUT     | `/api/linhas/:id` | ✓   | Editar nome/slug/ativo                                               |

### Especificações (biblioteca global)

| Método | Rota                               | Auth | Descrição                          |
| ------- | ---------------------------------- | ---- | ------------------------------------ |
| GET     | `/api/especificacoes`                 | —   | Todos as especificações com suas variações |
| POST    | `/api/especificacoes`                 | ✓   | Criar especificação global                |
| PUT     | `/api/especificacoes/:id`             | ✓   | Editar nome da especificação              |
| DELETE  | `/api/especificacoes/:id`             | ✓   | Excluir especificação (e suas variações)   |
| POST    | `/api/especificacoes/:id/variacoes`      | ✓   | Adicionar variação à especificação        |
| PATCH   | `/api/especificacoes/variacoes/:variacaoId` | ✓   | Editar variação                       |
| DELETE  | `/api/especificacoes/variacoes/:variacaoId` | ✓   | Excluir variação                      |

### Modelos

| Método | Rota                                  | Auth | Descrição                                               |
| ------- | ------------------------------------- | ---- | --------------------------------------------------------- |
| GET     | `/api/modelos`                     | —   | Listar modelos ativos.`?apenasAtivos=false` para admin |
| GET     | `/api/modelos/:id`                 | —   | Detalhes do modelo                                       |
| POST    | `/api/modelos`                     | ✓   | Criar modelo (multipart/form-data)                       |
| PUT     | `/api/modelos/:id`                 | ✓   | Editar modelo                                            |
| PATCH   | `/api/modelos/:id/toggle`          | ✓   | Ativar / desativar                                        |
| DELETE  | `/api/modelos/:id`                 | ✓   | Excluir modelo                                           |
| GET     | `/api/modelos/:id/especificacoes`       | —   | Especificações do modelo com variações habilitadas             |
| POST    | `/api/modelos/:id/especificacoes`       | ✓   | Associar especificação global ao modelo                       |
| PUT     | `/api/modelos/:id/especificacoes/:meId` | ✓   | Atualizar variações habilitadas / obrigatoriedade          |
| DELETE  | `/api/modelos/:id/especificacoes/:meId` | ✓   | Remover especificação do modelo                               |
| POST    | `/api/modelos/:id/especificacoes/copiar` | ✓  | Copiar especificações de outro modelo                          |

### Orçamentos

| Método | Rota                                   | Auth | Descrição                               |
| ------- | -------------------------------------- | ---- | ----------------------------------------- |
| POST    | `/api/orcamentos`                    | —   | Criar orçamento (público)               |
| POST    | `/api/orcamentos/acompanhar`         | —   | Consulta pública (número + e-mail)      |
| GET     | `/api/orcamentos`                    | ✓   | Listar orçamentos (filtros, paginação) |
| GET     | `/api/orcamentos/:id`                | ✓   | Detalhes completos                        |
| PATCH   | `/api/orcamentos/:id/status`         | ✓   | Atualizar status                          |
| PATCH   | `/api/orcamentos/:id/valor`          | ✓   | Definir valor                             |
| PUT     | `/api/orcamentos/:id/layout-final`   | ✓   | Upload do layout final aprovado           |

### Produção

| Método | Rota                            | Auth | Descrição                    |
| ------- | ------------------------------- | ---- | ------------------------------ |
| GET     | `/api/producao`               | ✓   | Orçamentos em produção      |
| GET     | `/api/producao/:id/historico` | ✓   | Linha do tempo de status       |

### Admin

| Método | Rota                              | Auth        | Descrição          |
| ------- | --------------------------------- | ----------- | -------------------- |
| GET     | `/api/admin/dashboard`          | ✓          | Estatísticas gerais |
| GET     | `/api/admin/usuarios`           | admin+      | Listar usuários     |
| POST    | `/api/admin/usuarios`           | super_admin | Criar usuário       |
| PUT     | `/api/admin/usuarios/:id`       | super_admin | Editar usuário      |
| PATCH   | `/api/admin/usuarios/:id/senha` | super_admin | Redefinir senha      |
| PATCH   | `/api/admin/usuarios/:id/toggle`| super_admin | Ativar / desativar   |
| DELETE  | `/api/admin/usuarios/:id`       | super_admin | Excluir usuário     |

---

## Observações Importantes

- O número WhatsApp em `frontend/src/lib/whatsapp.ts` (`WHATSAPP_NUMBER`) é
  **temporário para testes** — substituir pelo oficial antes do deploy
  (ver [`docs/1-checklist-pre-producao.md`](docs/1-checklist-pre-producao.md)).
- A pasta `backend/uploads/` armazena imagens localmente (volume Docker em dev).
  Em produção, considerar CDN ou bucket externo.
- Em **produção** o deploy é nativo (PM2 na VM Ubuntu) — Docker é usado apenas em
  desenvolvimento. Ver [`docs/2-deploy.md`](docs/2-deploy.md).
