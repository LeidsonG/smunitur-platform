# Mapa do Projeto — SM Unitur Platform

Documento de referência para manutenção. Explica o propósito de cada arquivo e diretório do repositório.

---

## Visão geral

Monorepo com duas aplicações separadas:

| Diretório | O que é |
|---|---|
| `backend/` | API REST em Node.js + Express + TypeScript. Banco de dados MySQL via Prisma ORM. |
| `frontend/` | Interface web em Next.js 14+ (App Router) + TypeScript + Tailwind CSS. |
| `docs/` | Guias de deploy, checklist de produção e roadmap. |
| `scripts/` | Scripts de terminal para tarefas operacionais. |

---

## Raiz do projeto

| Arquivo | O que faz |
|---|---|
| `README.md` | Ponto de entrada: visão geral e instruções de início rápido. |
| `ARCHITECTURE.md` | Diagrama e explicação das decisões de arquitetura do sistema. |
| `CLAUDE.md` | Instruções obrigatórias para o assistente de IA (convenções de commit, padrões do projeto). |
| `CONTRIBUTING.md` | Guia para contribuidores: como rodar localmente, abrir PRs, etc. |
| `docker-compose.yml` | Ambiente de **desenvolvimento** com três serviços: `db` (MySQL 8), `backend` (hot reload), `frontend` (hot reload). Variáveis lidas de `.env` na raiz. |
| `docker-compose.prod.yml` | Variante de **produção**: sem hot reload, sem bind mounts de código-fonte, imagens otimizadas. |

---

## `backend/`

### Configuração

| Arquivo | O que faz |
|---|---|
| `Dockerfile` | Build multi-stage: stage `dev` (ts-node-dev) e stage `prod` (compilado, sem devDependencies). |
| `docker-entrypoint.sh` | Script executado ao subir o container: roda `prisma migrate deploy` e, se `SEED=true`, executa o seed antes de iniciar a API. |
| `package.json` | Dependências e scripts npm (`dev`, `build`, `start`, `seed`, `seed:demo`). |
| `tsconfig.json` | Configuração do compilador TypeScript para o backend. |

### `prisma/`

| Arquivo | O que faz |
|---|---|
| `schema.prisma` | **Fonte da verdade do banco de dados.** Define todos os models (tabelas), enums e relações. Qualquer mudança no banco começa aqui. |
| `seed.ts` | Popula o banco com dados iniciais de produção (usuário admin padrão, linhas e modelos de confecção reais). Roda com `npm run seed`. |
| `seed-demo.ts` | Dados de demonstração mais ricos (orçamentos de exemplo, histórico de status). Útil para homologação. Roda com `npm run seed:demo`. |
| `migration_lock.toml` | Arquivo gerado pelo Prisma para evitar conflito de migrations entre bancos com providers diferentes. Não editar manualmente. |
| `migrations/` | Histórico de migrations SQL gerado pelo Prisma. Cada subdiretório é uma migration com timestamp + nome descritivo. Não editar manualmente. |

### `src/`

#### `index.ts`

Ponto de entrada da API. Responsável por:
- Carregar e validar variáveis de ambiente (via `utils/env`).
- Registrar middlewares globais: log (pino), helmet, CORS, rate limit, parsers JSON.
- Montar todas as rotas em `/api/*`.
- Expor `GET /api/health` (verifica se API e banco respondem).
- Registrar handler global de erros (não vaza stack em produção).
- Escutar na porta configurada.

#### `middleware/`

| Arquivo | O que faz |
|---|---|
| `auth.ts` | Middleware JWT. Extrai o token do header `Authorization`, verifica assinatura e expiry, consulta `tokenVersion` no banco (invalida tokens antigos após troca de senha). Injeta `req.admin` para uso nas rotas. |
| `upload.ts` | Pipeline de upload de imagens em três etapas: (1) `upload` — middleware Multer (salva no disco, limita a 10 MB); (2) `validarMagicBytes` — lê os primeiros 12 bytes do arquivo e rejeita executáveis disfarçados de imagem; (3) `processarImagens` — redimensiona com Sharp para no máximo 2000px no maior lado e corrige orientação EXIF. Também exporta `apagarUpload` para remover imagens antigas ao substituir. |

#### `routes/`

Cada arquivo é um `Router` do Express montado em `/api/<nome>`.

| Arquivo | Rota base | O que expõe |
|---|---|---|
| `auth.ts` | `/api/auth` | Login (`POST /login`), perfil (`GET /me`), foto de perfil (`PUT /me/foto`), renomear (`PATCH /me/nome`), trocar senha (`PATCH /change-password`). |
| `orcamentos.ts` | `/api/orcamentos` | Criação de orçamento pelo cliente (público), consulta por número/email (público), listagem e gestão pelo admin. |
| `modelos.ts` | `/api/modelos` | Listagem pública de modelos com especificações; CRUD completo para o admin (incluindo upload de imagem). |
| `linhas.ts` | `/api/linhas` | Listagem pública de linhas (categorias); CRUD para admin (cor, ícone, ativo). |
| `especificacoes.ts` | `/api/especificacoes` | Gerencia especificações globais (ex.: "Tipo de Gola") e suas variações (ex.: "Polo", "Careca"); CRUD para admin. |
| `admin.ts` | `/api/admin` | Gerenciamento de usuários admin: listar, criar, ativar/desativar, redefinir senha. Restrito a `super_admin` e `admin`. |
| `producao.ts` | `/api/producao` | Visão de produção: orçamentos `em_producao`, upload do layout final, atualização de status. |

#### `utils/`

| Arquivo | O que faz |
|---|---|
| `env.ts` | Valida todas as variáveis de ambiente obrigatórias no boot. Se algo faltar ou for inválido (JWT_SECRET fraco, BCRYPT_ROUNDS fora da faixa), o processo aborta com mensagem clara. Exporta o objeto `env` tipado para uso no backend. |
| `logger.ts` | Instância única do Pino (logger estruturado em JSON). Usada em todos os módulos do backend — nunca usar `console.log` direto. |
| `prisma.ts` | Instância singleton do PrismaClient. Registra shutdown limpo (fecha conexão com o banco em `SIGTERM`/`SIGINT`). |
#### `uploads/`

Diretório físico onde as imagens enviadas pelos usuários ficam armazenadas. Servido estaticamente em `/uploads/*`. Não commitar conteúdo deste diretório.

---

## `frontend/`

### Configuração

| Arquivo | O que faz |
|---|---|
| `Dockerfile` | Build multi-stage: stage `dev` (next dev) e stage `prod` (next build + next start). |
| `next.config.ts` | Configuração do Next.js (domínios de imagens, variáveis de ambiente, etc.). |
| `tsconfig.json` | Configuração do TypeScript para o frontend. Inclui alias `@/*` apontando para `src/`. |
| `eslint.config.mjs` | Regras ESLint do projeto (baseado no config padrão do Next.js). |
| `postcss.config.mjs` | Configuração do PostCSS (necessário para o Tailwind CSS processar as classes). |
| `next-env.d.ts` | Tipos gerados pelo Next.js para TypeScript. Não editar manualmente. |

### `public/`

Arquivos estáticos servidos diretamente pela URL raiz (sem processamento do Next.js).

| Arquivo | O que é |
|---|---|
| `logo.png` – `logo5.png` | Variações da logo da SM Unitur usadas em diferentes contextos (header, rodapé, favicon, etc.). |
| `background.png` | Imagem de fundo usada na seção Hero da landing page. |

### `src/app/`

Estrutura de rotas do **Next.js App Router**. Cada pasta com `page.tsx` é uma rota.

| Arquivo/Pasta | Rota | O que é |
|---|---|---|
| `layout.tsx` | `/` | Layout raiz: importa globals.css, define fonte e metadados padrão. |
| `page.tsx` | `/` | **Landing page pública.** Compõe todas as seções: Header, Hero, Serviços, Modelos, Formulário de Orçamento, Acompanhamento, FAQ, Contato, Footer. |
| `globals.css` | — | Estilos globais: reset CSS, variáveis de cor da marca, classes utilitárias customizadas. |
| `favicon.ico` | — | Ícone da aba do navegador. |
| `admin/layout.tsx` | `/admin/*` | Layout compartilhado do painel admin: verifica autenticação, renderiza a Sidebar lateral. |
| `admin/page.tsx` | `/admin` | Redireciona para `/admin/dashboard`. |
| `admin/login/page.tsx` | `/admin/login` | Tela de login: formulário email + senha, chama `POST /api/auth/login`, salva token no localStorage. |
| `admin/dashboard/page.tsx` | `/admin/dashboard` | Painel principal: estatísticas de orçamentos por status, gráficos de volume. |
| `admin/orcamentos/page.tsx` | `/admin/orcamentos` | Listagem e gestão completa de orçamentos: filtros, paginação, mudança de status, upload de layout final. |
| `admin/modelos/page.tsx` | `/admin/modelos` | CRUD de modelos de confecção com upload de imagem e gestão de especificações por modelo. |
| `admin/linhas/page.tsx` | `/admin/linhas` | CRUD de linhas (categorias): nome, slug, cor de badge, ícone Lucide, ativo/inativo. |
| `admin/especificacoes/page.tsx` | `/admin/especificacoes` | CRUD de especificações globais e suas variações (com imagem opcional por variação). |
| `admin/producao/page.tsx` | `/admin/producao` | Visão de produção: orçamentos em andamento, upload do layout final para o cliente. |
| `admin/usuarios/page.tsx` | `/admin/usuarios` | Gerenciamento de usuários admin: criar, desativar, redefinir senha. Visível apenas para `super_admin`/`admin`. |
| `admin/perfil/page.tsx` | `/admin/perfil` | Perfil do usuário logado: alterar nome, foto e senha. |

### `src/components/`

#### `components/landing/`

Componentes da página pública. Cada um é uma seção da landing page.

| Arquivo | O que renderiza |
|---|---|
| `Header.tsx` | Barra de navegação no topo: logo, links âncora para as seções, botão "Solicitar Orçamento". |
| `Hero.tsx` | Seção principal (acima da dobra): headline, subtítulo, imagem de fundo e CTA. |
| `Servicos.tsx` | Cards descrevendo os serviços oferecidos pela SM Unitur. |
| `Modelos.tsx` | Carrossel de linhas de produtos com ícones e cards de modelos. Filtra por linha ao clicar. Pré-seleciona o modelo no formulário de orçamento ao clicar em "Solicitar". |
| `FormularioOrcamento.tsx` | Formulário de solicitação de orçamento: dados do cliente, seleção de modelo, especificações dinâmicas (baseadas no modelo escolhido), upload de imagem de referência. |
| `Acompanhamento.tsx` | Campo de busca pelo número do orçamento + email. Exibe status atual e histórico de atualizações. |
| `FAQ.tsx` | Acordeão com perguntas e respostas frequentes. |
| `Contato.tsx` | Informações de contato e link direto para o WhatsApp. |
| `Footer.tsx` | Rodapé: logo, links rápidos, redes sociais. |
| `Reveal.tsx` | Componente utilitário de animação: envolve elementos com efeito de aparição ao entrar no viewport (Intersection Observer). |

#### `components/admin/`

Componentes do painel administrativo.

| Arquivo | O que é |
|---|---|
| `Sidebar.tsx` | Menu lateral do admin: links de navegação agrupados (Principal / Catálogo / Sistema), ícones, badge de nível do usuário, botão de logout. Versão mobile via drawer. |
| `ConfirmModal.tsx` | Modal de confirmação reutilizável. Usado antes de ações destrutivas (deletar, desativar). |
| `Toast.tsx` | Componente de notificação temporária (toast). Exibe mensagens de sucesso ou erro por 3,5 segundos no canto inferior direito. Exporta `ToastContainer` e `ToastData`. |
| `Orcamentos.tsx` | Listagem de orçamentos com filtros por status, data (hoje/semana/mês) e busca por nome, e-mail ou #número. Cards no mobile, tabela no desktop. Modal bottom-sheet com detalhes, copiar telefone, upload de layout final, WhatsApp e atualização de status. Toast de feedback em todas as ações. |
| `Modelos.tsx` | CRUD de modelos com formulário de criação/edição, upload de imagem, e painel de especificações associadas. |
| `Linhas.tsx` | CRUD de linhas com seletor de ícone Lucide e picker de cor. |
| `Especificacoes.tsx` | CRUD de especificações e suas variações (sub-itens com imagem opcional). |
| `Usuarios.tsx` | Listagem de usuários admin com ações de criação, edição, ativação/desativação e reset de senha. Modais bottom-sheet no mobile. |
| `Perfil.tsx` | Formulário de perfil do usuário logado: foto, nome, troca de senha. |

### `src/lib/`

Utilitários e constantes compartilhadas por toda a UI.

| Arquivo | O que faz |
|---|---|
| `api.ts` | **Cliente HTTP central.** Cria instância do Axios com `baseURL` apontando para a API. Interceptor de request injeta token JWT do localStorage. Interceptor de response redireciona para `/admin/login` em caso de 401 (retorna Promise pendente para evitar `unhandledRejection` quando o componente é desmontado). Exporta também `API_BASE` (URL sem `/api`) para montar URLs de imagens. |
| `orcamentoStatus.ts` | Fonte única para os status de orçamento. Define a lista ordenada de status com label em pt-BR e cor hexadecimal. Exporta `STATUS_LIST`, `STATUS_LABEL`, `STATUS_COLOR` e o helper `statusInfo()`. Se um novo status for adicionado no Prisma, deve ser incluído aqui também. |
| `linhaIcones.ts` | Lista curada de ~24 ícones Lucide disponíveis para atribuir a uma Linha. Exporta `LINHA_ICONES` (array com nome, componente e label), `iconePorNome()` (resolve string → componente, com fallback para `Package`) e `CORES_SUGERIDAS` (paleta de cores da marca para o picker). |
| `slug.ts` | Função utilitária que converte um texto em slug URL-friendly (remove acentos, substitui espaços por `-`, minúsculas). Usada ao criar linhas e modelos. |
| `whatsapp.ts` | Monta a URL do WhatsApp (`wa.me`) com mensagem pré-formatada para envio de orçamento. Usado no botão de compartilhamento no admin. |

---

## `docs/`

Documentação operacional do projeto.

| Arquivo | O que contém |
|---|---|
| `1-pre-production-checklist.md` | Lista de verificação a completar antes de fazer o primeiro deploy em produção (segurança, variáveis, backup, DNS). |
| `2-deploy-oracle.md` | Passo a passo detalhado de deploy em VPS (configuração de Nginx, certbot, PM2/Docker em produção). |
| `4-roadmap.md` | Roadmap de funcionalidades planejadas e ideias para iterações futuras. |
| `DOCKER.md` | Referência rápida dos comandos Docker mais usados no projeto (subir, parar, ver logs, resetar banco, etc.). |

---

## `scripts/`

| Arquivo | O que faz |
|---|---|
| `setup-dev.sh` | Script de configuração inicial do ambiente de desenvolvimento: verifica pré-requisitos, copia arquivos `.env.example`, instala dependências e sobe os containers. |
| `tunnel.sh` | Expõe o projeto publicamente via **Cloudflare Tunnel** com um único comando. Inicia dois tunnels (frontend e backend), aguarda os URLs gerados e reinicia os containers com as URLs corretas configuradas. Útil para demonstrações e testes em dispositivos externos sem configurar DNS. |

---

## Modelos do banco de dados (resumo)

Definidos em `backend/prisma/schema.prisma`.

| Model | Tabela | O que representa |
|---|---|---|
| `UsuarioAdmin` | `usuarios_admin` | Usuários do painel admin. Nível: `super_admin`, `admin` ou `operador`. Campo `tokenVersion` invalida JWTs antigos após troca de senha. |
| `Linha` | `linhas` | Categoria de produtos (ex.: Camisetas, Moletons). Tem cor de badge e ícone Lucide. |
| `Modelo` | `modelos` | Variação dentro de uma linha (ex.: Camiseta Polo Premium). É o que o cliente seleciona no orçamento. |
| `Especificacao` | `especificacoes` | Característica reutilizável global (ex.: "Tipo de Gola"). |
| `ModeloVariacao` | `variacoes` | Valor possível de uma especificação (ex.: "Polo", "Careca"). Pode ter imagem. |
| `ModeloEspecificacao` | `modelo_especificacoes` | Associa uma especificação a um modelo específico (com flag `obrigatorio`). |
| `ModeloEspecificacaoVariacao` | `modelo_especificacao_variacoes` | Quais variações estão disponíveis para uma especificação em um modelo específico. |
| `Orcamento` | `orcamentos` | Solicitação de orçamento do cliente. Tem número único, dados do cliente, modelo escolhido, status e layout final. |
| `OrcamentoEspecificacao` | `orcamento_especificacoes` | Especificações escolhidas pelo cliente para um orçamento. Guarda snapshot textual (`valorLivre`) para preservar histórico se a variação for editada. |
| `OrcamentoStatusHistorico` | `orcamento_status_historico` | Auditoria de mudanças de status: registra de qual status veio, para qual foi, quem alterou e quando. |

---

## Fluxo de dados principal

```
Cliente (browser)
  │
  ├── GET /               → Next.js renderiza landing page
  │     └── Modelos, FAQ, Contato (dados estáticos ou SSR)
  │
  ├── POST /api/orcamentos → cria orçamento no banco
  │
  └── GET /api/orcamentos/:numero → consulta status (acompanhamento)

Admin (browser)
  │
  ├── POST /api/auth/login  → recebe JWT
  │
  └── [rotas autenticadas]
        ├── /api/admin/*       → gestão de usuários
        ├── /api/orcamentos/*  → gestão de orçamentos
        ├── /api/modelos/*     → CRUD de modelos
        ├── /api/linhas/*      → CRUD de linhas
        ├── /api/especificacoes/* → CRUD de especificações
        └── /api/producao/*    → visão de produção + layout final
```
