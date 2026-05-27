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
4. [`docs/DOCKER.md`](docs/DOCKER.md) — ambiente de desenvolvimento com Docker + WSL2

> **Desenvolvimento:** o ambiente local roda em **Docker + WSL2** (MySQL, backend
> e frontend em containers). Comece pelo [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Objetivo do Projeto

Plataforma web que permite:

- Clientes conhecerem os modelos e serviços da SM Unitur
- Solicitar orçamentos personalizados em 3 etapas (modelo → detalhes → dados)
- Acompanhar o status de produção pelo número do orçamento
- Gerenciamento completo via painel administrativo (linhas, especificações, modelos, orçamentos, produção, usuários)

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
- **Prisma ORM** (migrations versionadas: `migrate dev` em desenvolvimento / `migrate deploy` em produção)
- **MySQL 8** (em container Docker no desenvolvimento; nativo na VM em produção)
- **Multer** (upload de arquivos com validação por magic bytes)
- **JWT** (autenticação stateless)
- **Bcryptjs** (hash de senhas)
- **Helmet + express-rate-limit** (hardening de segurança)
- **Pino** (logs estruturados)

---

## Estrutura do Projeto

```
smunitur-platform/
├── frontend/               # Next.js App
│   └── src/
│       ├── app/
│       │   ├── admin/      # Painel administrativo (protegido por JWT)
│       │   └── page.tsx    # Landing page pública
│       ├── components/
│       │   ├── admin/      # Sidebar, layout do painel
│       │   └── landing/    # Seções da landing (Hero, Modelos, Serviços, etc.)
│       └── lib/            # api.ts, whatsapp.ts
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma   # Fonte da verdade do banco
│   │   └── seed.ts         # Dados iniciais
│   └── src/
│       ├── routes/         # especificações, auth, linhas, orcamentos, modelos, ...
│       ├── middleware/      # auth (JWT), logger
│       └── utils/          # prisma client, upload (multer)
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
| `/admin/linhas` | admin+ | CRUD de linhas de modelos |
| `/admin/especificacoes` | admin+ | Biblioteca global de especificações e variações |
| `/admin/modelos` | Todos | CRUD de modelos + associação de especificações |
| `/admin/usuarios` | admin+ | Cadastro e gestão de administradores |
| `/admin/perfil` | Todos | Trocar senha, foto de perfil |

---

## Fluxo de Especificações

As especificações seguem uma hierarquia de 3 níveis:

1. **Especificação global** (ex: "Tipo de Gola") — criado em `/admin/especificacoes`
2. **Variações globais** (ex: "Careca", "V", "Polo") — cadastradas na mesma especificação
3. **Associação ao modelo** — em `/admin/modelos`, cada modelo seleciona quais especificações usa e quais variações ficam disponíveis para o cliente escolher

Isso permite criar "Gola" uma vez e reutilizar em Camiseta Polo, Camiseta Básica, Jaleco etc., com variações diferentes em cada um.

---

## Formulário de Orçamento (3 etapas)

**Etapa 1 — Modelo:**
- Seleciona a linha (Camisetas, Moletons, Jalecos...)
- Seleciona o modelo específico dentro da linha
- Escolhe as variações das especificações do modelo (ex: Gola Careca, Tamanho M)

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
- Mensagem formatada com todos os dados do orçamento, incluindo especificações selecionadas
- Link gerado via `https://wa.me/{numero}?text={mensagem_codificada}`

> **Atenção:** o número atual é temporário para testes. Substituir antes de ir para produção.

---

## Decisões de Arquitetura

- **Next.js App Router** para SSR/SSG e melhor SEO
- **Migrations Prisma versionadas** (`migrate dev` em dev, `migrate deploy` em produção) — mesmo schema aplicado em todos os ambientes, com histórico rastreável
- **Especificações globais** reutilizáveis por modelo para evitar duplicação de dados
- **JWT em localStorage** (painel admin interno — sem dados sensíveis expostos publicamente)
- **Multer + magic bytes** para validar uploads de imagem no servidor
- Sem preço fixo nos modelos — sistema baseado em orçamento personalizado

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

Para próximas funcionalidades (cliente como entidade, notificação por e-mail, FK forte de modelo/linha) veja [`docs/3-proximas-funcionalidades.md`](docs/3-proximas-funcionalidades.md).
