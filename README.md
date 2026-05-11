# Sistema Web SM Unitur

Sistema web completo para a empresa **SM Unitur**, focado em confecção de roupas personalizadas, uniformes e produtos têxteis personalizados.

---

## Objetivo do Projeto

Plataforma web que permite:

- Clientes conhecerem os produtos e serviços da SM Unitur
- Solicitação de orçamentos personalizados via formulário
- Acompanhamento do status de produção pelo número do orçamento
- Gerenciamento completo via painel administrativo (produtos, orçamentos, produção, usuários)

---

## Tecnologias Utilizadas

### Frontend

- **Next.js 14** (App Router, SSR/SSG)
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion** (animações)
- **React Hook Form + Zod** (formulários e validação)
- **Axios** (HTTP client)
- **Lucide React** (ícones)

### Backend

- **Node.js + Express**
- **TypeScript**
- **Prisma ORM**
- **MySQL** (via XAMPP local)
- **Multer** (upload de arquivos)
- **JWT** (autenticação)
- **Bcryptjs** (hash de senhas)

### Banco de Dados

- **MySQL** via XAMPP (ambiente local)

---

## Estrutura do Projeto

```
systemweb-unitur/
├── frontend/          # Next.js App
│   └── src/
│       ├── app/       # Rotas (App Router)
│       ├── components/
│       └── lib/
├── backend/           # Express API
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── middleware/
│       └── utils/
├── database/          # Scripts SQL
└── README.md
```

---

## Estrutura do Banco de Dados

### `usuarios_admin`

| Campo      | Tipo                                   | Descrição                  |
| ---------- | -------------------------------------- | ---------------------------- |
| id         | INT PK AUTO_INCREMENT                  | Identificador                |
| nome       | VARCHAR(100)                           | Nome do administrador        |
| email      | VARCHAR(150) UNIQUE                    | E-mail de login              |
| senha      | VARCHAR(255)                           | Senha criptografada (bcrypt) |
| nivel      | ENUM('super_admin','admin','operador') | Nível de permissão         |
| ativo      | BOOLEAN                                | Status do usuário           |
| created_at | TIMESTAMP                              | Data de criação            |

### `categorias`

| Campo | Tipo                  | Descrição       |
| ----- | --------------------- | ----------------- |
| id    | INT PK AUTO_INCREMENT | Identificador     |
| nome  | VARCHAR(100)          | Nome da categoria |
| slug  | VARCHAR(100)          | Slug URL-friendly |
| ativo | BOOLEAN               | Status            |

### `produtos`

| Campo        | Tipo                  | Descrição          |
| ------------ | --------------------- | -------------------- |
| id           | INT PK AUTO_INCREMENT | Identificador        |
| categoria_id | INT FK                | Categoria do produto |
| nome         | VARCHAR(150)          | Nome do produto      |
| descricao    | TEXT                  | Descrição          |
| imagem       | VARCHAR(255)          | Caminho da imagem    |
| ativo        | BOOLEAN               | Status               |
| created_at   | TIMESTAMP             | Data de criação    |

### `orcamentos`

| Campo             | Tipo                  | Descrição                          |
| ----------------- | --------------------- | ------------------------------------ |
| id                | INT PK AUTO_INCREMENT | Identificador                        |
| numero            | INT UNIQUE            | Número do orçamento (início: 100) |
| nome_cliente      | VARCHAR(100)          | Nome do cliente                      |
| email_cliente     | VARCHAR(150)          | E-mail                               |
| telefone_cliente  | VARCHAR(20)           | Telefone/WhatsApp                    |
| cpf_cnpj          | VARCHAR(20)           | CPF ou CNPJ (opcional)               |
| produto_desejado  | VARCHAR(150)          | Produto solicitado                   |
| quantidade        | INT                   | Quantidade                           |
| tamanhos          | VARCHAR(255)          | Tamanhos (ex: P,M,G,GG)              |
| cores             | VARCHAR(255)          | Cores desejadas                      |
| detalhes          | TEXT                  | Detalhes personalizados              |
| observacoes       | TEXT                  | Observações adicionais             |
| imagem_referencia | VARCHAR(255)          | Caminho da imagem de referência     |
| status            | ENUM                  | Status atual da produção           |
| created_at        | TIMESTAMP             | Data de criação                    |

**Status possíveis do orçamento:**

- `recebido` — Orçamento recebido, aguardando análise
- `em_analise` — Sendo analisado pela equipe
- `aguardando_aprovacao` — Orçamento enviado, aguardando aprovação do cliente
- `em_producao` — Em processo de produção
- `finalizado` — Produção concluída
- `enviado` — Produto enviado ao cliente
- `cancelado` — Orçamento cancelado

### `orcamento_status_historico`

| Campo           | Tipo                  | Descrição              |
| --------------- | --------------------- | ------------------------ |
| id              | INT PK AUTO_INCREMENT | Identificador            |
| orcamento_id    | INT FK                | Orçamento relacionado   |
| status_anterior | VARCHAR(50)           | Status anterior          |
| status_novo     | VARCHAR(50)           | Novo status              |
| observacao      | TEXT                  | Observação da mudança |
| usuario_id      | INT FK                | Admin responsável       |
| created_at      | TIMESTAMP             | Data/hora da mudança    |

---

## Funcionamento do Formulário de Orçamento

- Cliente preenche nome, telefone, e-mail, CPF/CNPJ (opcional)
- Seleciona produto desejado (Camisetas, Moletons, Jalecos, etc.)
- Informa quantidade (apenas inteiros), tamanhos e cores (campo textual livre)
- Adiciona detalhes personalizados e observações
- Pode fazer upload de imagem de referência
- Ao enviar: dados salvos no banco + link WhatsApp gerado com resumo do orçamento
- Número do orçamento começa em 100

---

## Integração WhatsApp

- Número temporário para testes: **5517981322215** *(substituir pelo número oficial)*
- Mensagem formatada com todos os dados do orçamento
- Link gerado via `https://wa.me/{numero}?text={mensagem_codificada}`
- Mensagem inclui número do orçamento, dados do cliente e detalhes do pedido

---

## Painel Administrativo

- Login com JWT (múltiplos usuários, níveis: super_admin, admin, operador)
- **Dashboard**: estatísticas gerais (orçamentos, status, produtos)
- **Produtos**: CRUD completo com upload de imagem e categorias
- **Orçamentos**: listagem, busca, filtros por status, visualização detalhada, alteração de status
- **Produção**: atualização de status com histórico de alterações
- **Usuários**: cadastro e gerenciamento de administradores

---

## Decisões Importantes

- **Next.js App Router** para SSR/SSG e melhor SEO
- **Prisma ORM** para type-safety e migrations controladas
- **JWT** armazenado em httpOnly cookie para segurança
- **Multer** para upload de imagens (armazenamento local, preparado para S3 futuramente)
- Sem preço fixo nos produtos — sistema baseado em orçamento personalizado
- Código preparado para futuros upgrades (pagamentos, email marketing, automações)

---

## Possíveis Upgrades Futuros (não implementados)

- Integração com gateway de pagamentos
- Automação de e-mails (confirmação de orçamento, status)
- Email marketing
- Sistema avançado de produção (linha de montagem, etapas)
- Integrações externas (ERP, estoque)

---

## Histórico de Alterações

| Data       | Alteração        | Descrição                                         |
| ---------- | ------------------ | --------------------------------------------------- |
| 2026-05-10 | Início do projeto | Estrutura base, .gitignore, README, schema do banco |

---

## Pendências

- [ ] Integração da logo oficial (será enviada posteriormente)
- [ ] Substituir número WhatsApp de teste pelo oficial
- [ ] Deploy em hospedagem online
- [ ] Configurar domínio e SSL
- [ ] Colocar opção para alterar a senha do usuario no /admin
- [ ] Verificar o envio pelo whatsapp e e-mail
