# Como Rodar o Projeto — SM Unitur

## Pré-requisitos

- Node.js 18+
- XAMPP com MySQL rodando
- npm

---

## 1. Banco de Dados

1. Abra o XAMPP e inicie o **MySQL**
2. Acesse o **phpMyAdmin** em `http://localhost/phpmyadmin`
3. Crie o banco:
   ```sql
   CREATE DATABASE smunitur CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
4. As tabelas são criadas pelo Prisma no próximo passo

---

## 2. Backend

```bash
cd backend

# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env
# Ajuste DATABASE_URL, JWT_SECRET, etc. no .env

# Gerar o cliente Prisma
npm run db:generate

# Aplicar schema no banco (desenvolvimento)
npx prisma db push

# Popular dados iniciais (admin padrão)
npm run db:seed

# Rodar em desenvolvimento
npm run dev
```

API disponível em `http://localhost:3001`  
Health check: `http://localhost:3001/api/health`

### Credenciais padrão do admin

| Campo | Valor |
|---|---|
| E-mail | `admin@smunitur.com.br` |
| Senha | `admin123` |

> **Altere a senha após o primeiro acesso.**

### Sobre migrations

| Ambiente | Comando | Comportamento |
|---|---|---|
| Desenvolvimento | `npx prisma db push` | Aplica o schema sem criar histórico de migration |
| Produção | `npm run db:migrate:deploy` | Aplica migrations versionadas |

Para criar uma nova migration antes do deploy:
```bash
npm run db:migrate:dev -- --name descricao_da_mudanca
```

---

## 3. Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.local.example .env.local
# Ajuste NEXT_PUBLIC_API_URL se necessário

# Rodar em desenvolvimento
npm run dev
```

Site disponível em `http://localhost:3000`  
Painel admin em `http://localhost:3000/admin`

---

## Estrutura de Rotas (Frontend)

| Rota | Descrição |
|---|---|
| `/` | Landing page (Hero, Sobre, Produtos, Serviços, FAQ, Orçamento) |
| `/#orcamento` | Formulário de orçamento (3 etapas) |
| `/#acompanhar` | Acompanhamento de produção por número |
| `/admin/login` | Login do painel |
| `/admin/dashboard` | Dashboard com estatísticas |
| `/admin/orcamentos` | Gestão de orçamentos |
| `/admin/producao` | Painel de produção |
| `/admin/categorias` | CRUD de categorias |
| `/admin/atributos` | Biblioteca global de atributos e opções |
| `/admin/produtos` | CRUD de produtos + associação de atributos |
| `/admin/usuarios` | Gestão de usuários admin |
| `/admin/perfil` | Perfil, senha e foto do usuário logado |

---

## API Endpoints

### Autenticação

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/auth/login` | — | Login, retorna JWT |
| GET | `/api/auth/me` | ✓ | Dados do usuário logado (inclui foto) |
| PATCH | `/api/auth/change-password` | ✓ | Trocar senha |
| PUT | `/api/auth/me/foto` | ✓ | Upload de foto de perfil |

### Categorias

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/categorias` | — | Categorias com produtos ativos. `?todos=true` retorna todas (admin) |
| POST | `/api/categorias` | ✓ | Criar categoria |
| PUT | `/api/categorias/:id` | ✓ | Editar nome/slug/ativo |

### Atributos (biblioteca global)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/atributos` | — | Todos os atributos com suas opções |
| POST | `/api/atributos` | ✓ | Criar atributo global |
| PUT | `/api/atributos/:id` | ✓ | Editar nome do atributo |
| DELETE | `/api/atributos/:id` | ✓ | Excluir atributo (e suas opções) |
| POST | `/api/atributos/:id/opcoes` | ✓ | Adicionar opção ao atributo |
| PATCH | `/api/atributos/opcoes/:opcaoId` | ✓ | Editar opção |
| DELETE | `/api/atributos/opcoes/:opcaoId` | ✓ | Excluir opção |

### Produtos

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/produtos` | — | Listar produtos ativos. `?apenasAtivos=false` para admin |
| GET | `/api/produtos/:id` | — | Detalhes do produto |
| POST | `/api/produtos` | ✓ | Criar produto (multipart/form-data) |
| PUT | `/api/produtos/:id` | ✓ | Editar produto |
| PATCH | `/api/produtos/:id/toggle` | ✓ | Ativar / desativar |
| DELETE | `/api/produtos/:id` | ✓ | Excluir produto |
| GET | `/api/produtos/:id/atributos` | — | Atributos do produto com opções habilitadas |
| POST | `/api/produtos/:id/atributos` | ✓ | Associar atributo global ao produto |
| PUT | `/api/produtos/:id/atributos/:paId` | ✓ | Atualizar opções habilitadas / obrigatoriedade |
| DELETE | `/api/produtos/:id/atributos/:paId` | ✓ | Remover atributo do produto |

### Orçamentos

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/orcamentos` | — | Criar orçamento (público) |
| GET | `/api/orcamentos/acompanhar/:numero` | — | Consulta pública por número |
| GET | `/api/orcamentos` | ✓ | Listar orçamentos (filtros, paginação) |
| GET | `/api/orcamentos/:id` | ✓ | Detalhes completos |
| PATCH | `/api/orcamentos/:id/status` | ✓ | Atualizar status |

### Produção

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/producao` | ✓ | Orçamentos em produção |
| PATCH | `/api/producao/:id/status` | ✓ | Atualizar status de produção |

### Admin

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/admin/dashboard` | ✓ | Estatísticas gerais |
| GET | `/api/admin/usuarios` | admin+ | Listar usuários |
| POST | `/api/admin/usuarios` | super_admin | Criar usuário |
| PATCH | `/api/admin/usuarios/:id` | admin+ | Editar usuário |
| DELETE | `/api/admin/usuarios/:id` | super_admin | Excluir usuário |

---

## Observações Importantes

- O número WhatsApp `5517981322215` em `Footer.tsx` é **temporário para testes** — substituir pelo oficial antes do deploy
- A pasta `backend/uploads/` armazena imagens localmente — configurar CDN ou S3 em produção
- `database/schema.sql` é apenas **referência** — não usar para criar o banco manualmente
- Em produção, use `prisma migrate deploy` (não `db push`) para aplicar o schema com histórico controlado
