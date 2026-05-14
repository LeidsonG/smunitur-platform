# Como Rodar o Projeto — SM Unitur

## Pré-requisitos

- Node.js 18+
- XAMPP (MySQL rodando)
- npm

---

## 1. Banco de Dados

1. Abra o XAMPP e inicie o **MySQL**
2. Acesse o **phpMyAdmin** em `http://localhost/phpmyadmin`
3. Crie o banco vazio executando apenas:
   ```sql
   CREATE DATABASE smunitur CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
4. As tabelas serão criadas via Prisma Migrate no passo seguinte (não rode mais `database/schema.sql` manualmente — ele virou referência apenas)

---

## 2. Backend

```bash
cd backend

# Instalar dependências
npm install

# Copiar arquivo de variáveis
cp .env.example .env
# Editar .env se necessário (banco, JWT, etc.)

# Gerar o cliente Prisma
npm run db:generate

# Aplicar as migrations (cria todas as tabelas)
npm run db:migrate:deploy

# (Apenas se você já tinha o banco criado pelo schema.sql antigo)
# Marca a migration inicial como já aplicada sem reexecutá-la:
# npm run db:migrate:baseline

# Popular dados iniciais (usuário admin padrão + categorias)
npm run db:seed

# Rodar em desenvolvimento
npm run dev
```

API disponível em: `http://localhost:3001`

```
http://localhost:3001/api/health
```


### Credenciais admin padrão

- **E-mail:** `admin@smunitur.com.br`
- **Senha:** `admin123`
- **ATENÇÃO:** Altere a senha após o primeiro acesso!

---

## 3. Frontend

```bash
cd frontend

# Instalar dependências (já instaladas se você clonou)
npm install

# Copiar variáveis de ambiente
cp .env.local.example .env.local

# Rodar em desenvolvimento
npm run dev
```

Site disponível em: `http://localhost:3000`
Painel admin em: `http://localhost:3000/admin`

---

## Estrutura de rotas

| Rota                  | Descrição                  |
| --------------------- | ---------------------------- |
| `/`                 | Landing page completa        |
| `/#orcamento`       | Formulário de orçamento    |
| `/#acompanhar`      | Acompanhamento de produção |
| `/admin/login`      | Login do painel              |
| `/admin/dashboard`  | Dashboard admin              |
| `/admin/orcamentos` | Gestão de orçamentos       |
| `/admin/producao`   | Painel de produção         |
| `/admin/produtos`   | CRUD de produtos             |
| `/admin/usuarios`   | Gestão de usuários         |

---

## API Endpoints

| Método | Rota                                   | Descrição                        |
| ------- | -------------------------------------- | ---------------------------------- |
| POST    | `/api/auth/login`                    | Login admin                        |
| GET     | `/api/orcamentos`                    | Listar orçamentos (auth)          |
| POST    | `/api/orcamentos`                    | Criar orçamento (público)        |
| GET     | `/api/orcamentos/acompanhar/:numero` | Consulta pública                  |
| PATCH   | `/api/orcamentos/:id/status`         | Atualizar status (auth)            |
| GET     | `/api/produtos`                      | Listar produtos (público)         |
| POST    | `/api/produtos`                      | Criar produto (auth)               |
| GET     | `/api/admin/dashboard`               | Estatísticas (auth)               |
| GET     | `/api/admin/usuarios`                | Listar usuários (auth)            |
| POST    | `/api/admin/usuarios`                | Criar usuário (auth super_admin)  |
| GET     | `/api/producao`                      | Orçamentos em produção (auth)   |
| PATCH   | `/api/producao/:id/status`           | Atualizar status produção (auth) |

---

## Observações Importantes

- O número WhatsApp `5517981322215` é **temporário para testes** — substituir pelo número oficial antes de ir para produção
- O hash de senha padrão no `schema.sql` é para `admin123` — trocar em produção
- A pasta `backend/uploads/` armazena as imagens localmente — configurar CDN/S3 em produção
