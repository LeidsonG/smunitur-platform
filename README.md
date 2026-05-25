# Sistema Web SM Unitur

Sistema web completo para a empresa **SM Unitur**, especializada em confecção de uniformes, camisetas, moletons e jalecos personalizados.

## Documentação

**Na raiz** (documentos principais):
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — como rodar o projeto localmente
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — visão arquitetural, modelo de dados, fluxos

**Em [`docs/`](docs/)** (operacional e roadmap, na ordem de leitura sugerida):
1. [`docs/1-checklist-pre-producao.md`](docs/1-checklist-pre-producao.md) — itens obrigatórios antes de subir o sistema para o cliente
2. [`docs/2-deploy.md`](docs/2-deploy.md) — guia passo a passo de deploy na Oracle Cloud (Linux)
3. [`docs/3-proximas-funcionalidades.md`](docs/3-proximas-funcionalidades.md) — funcionalidades planejadas para depois da versão atual

---

## Objetivo do Projeto

Plataforma web que permite:

- Clientes conhecerem os produtos e serviços da SM Unitur
- Solicitar orçamentos personalizados em 3 etapas (produto → detalhes → dados)
- Acompanhar o status de produção pelo número do orçamento
- Gerenciamento completo via painel administrativo (categorias, atributos, produtos, orçamentos, produção, usuários)

---

## Tecnologias Utilizadas

### Frontend

- **Next.js 16** (App Router, SSR/SSG, Turbopack)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion** (animações on-scroll via componente `Reveal`)
- **React Hook Form + Zod** (formulários e validação)
- **Axios** (HTTP client)
- **Lucide React** (ícones)

### Backend

- **Node.js + Express**
- **TypeScript**
- **Prisma ORM** (schema gerenciado via `prisma db push` em dev / `prisma migrate deploy` em produção)
- **MySQL** (via XAMPP local)
- **Multer** (upload de arquivos com validação por magic bytes)
- **JWT** (autenticação stateless)
- **Bcryptjs** (hash de senhas)
- **Helmet + express-rate-limit** (hardening de segurança)
- **Pino** (logs estruturados)

---

## Estrutura do Projeto

```
web-system-unitur/
├── frontend/               # Next.js App
│   └── src/
│       ├── app/
│       │   ├── admin/      # Painel administrativo (protegido por JWT)
│       │   └── page.tsx    # Landing page pública
│       ├── components/
│       │   ├── admin/      # Sidebar, layout do painel
│       │   └── landing/    # Seções da landing (Hero, Produtos, Serviços, etc.)
│       └── lib/            # api.ts, whatsapp.ts
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma   # Fonte da verdade do banco
│   │   └── seed.ts         # Dados iniciais
│   └── src/
│       ├── routes/         # atributos, auth, categorias, orcamentos, produtos, ...
│       ├── middleware/      # auth (JWT), logger
│       └── utils/          # prisma client, upload (multer)
├── database/
│   └── schema.sql          # Referência SQL gerada (não usar em produção)
└── README.md
```

---

## Painel Administrativo

Login com JWT (níveis: `super_admin`, `admin`, `operador`).

| Página | Acesso | Descrição |
|---|---|---|
| `/admin/dashboard` | Todos | Estatísticas gerais |
| `/admin/orcamentos` | Todos | Listagem, busca, filtros, detalhes |
| `/admin/producao` | Todos | Atualização de status com histórico |
| `/admin/categorias` | admin+ | CRUD de categorias de produtos |
| `/admin/atributos` | admin+ | Biblioteca global de atributos e opções |
| `/admin/produtos` | Todos | CRUD de produtos + associação de atributos |
| `/admin/usuarios` | admin+ | Cadastro e gestão de administradores |
| `/admin/perfil` | Todos | Trocar senha, foto de perfil |

---

## Fluxo de Atributos

Os atributos seguem uma hierarquia de 3 níveis:

1. **Atributo global** (ex: "Tipo de Gola") — criado em `/admin/atributos`
2. **Opções globais** (ex: "Careca", "V", "Polo") — cadastradas no mesmo atributo
3. **Associação ao produto** — em `/admin/produtos`, cada produto seleciona quais atributos usa e quais opções ficam disponíveis para o cliente escolher

Isso permite criar "Gola" uma vez e reutilizar em Camiseta Polo, Camiseta Básica, Jaleco etc., com opções diferentes em cada um.

---

## Formulário de Orçamento (3 etapas)

**Etapa 1 — Produto:**
- Seleciona a categoria (Camisetas, Moletons, Jalecos...)
- Seleciona o modelo específico dentro da categoria
- Escolhe as opções dos atributos do produto (ex: Gola Careca, Tamanho M)

**Etapa 2 — Detalhes:**
- Quantidade de peças (contador)
- Tamanhos, cores, detalhes de personalização
- Upload de imagem de referência (opcional)

**Etapa 3 — Dados:**
- Nome, telefone, e-mail, CPF/CNPJ (opcional)
- Resumo visual do pedido
- Ao enviar: salvo no banco + link WhatsApp gerado automaticamente

---

## Integração WhatsApp

- Número configurado em `frontend/src/components/landing/Footer.tsx` (constante `WHATSAPP_NUMBER`)
- Mensagem formatada com todos os dados do orçamento, incluindo atributos selecionados
- Link gerado via `https://wa.me/{numero}?text={mensagem_codificada}`

> **Atenção:** o número atual é temporário para testes. Substituir antes de ir para produção.

---

## Decisões de Arquitetura

- **Next.js App Router** para SSR/SSG e melhor SEO
- **Prisma `db push`** em desenvolvimento local (sem histórico de migrations); `migrate deploy` em produção
- **Atributos globais** reutilizáveis por produto para evitar duplicação de dados
- **JWT em localStorage** (painel admin interno — sem dados sensíveis expostos publicamente)
- **Multer + magic bytes** para validar uploads de imagem no servidor
- Sem preço fixo nos produtos — sistema baseado em orçamento personalizado

---

## Possíveis Upgrades Futuros

- Integração com gateway de pagamentos
- Envio automático de e-mail na criação/atualização do orçamento
- Notificações push para o admin
- Sistema avançado de produção (etapas, responsáveis, prazos)
- Upload de imagens em CDN/S3 em vez de armazenamento local
- Integrações externas (ERP, estoque)

---

## Pendências

Veja [`docs/1-checklist-pre-producao.md`](docs/1-checklist-pre-producao.md) — checklist completo dos itens que precisam ser definidos antes de subir para o cliente (WhatsApp oficial, JWT_SECRET, senha do admin, domínio, etc).

Para próximas funcionalidades (cliente como entidade, notificação por e-mail, anexo de layout final) veja [`docs/3-proximas-funcionalidades.md`](docs/3-proximas-funcionalidades.md).
