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

- **Next.js 16** (App Router, SSR/SSG, Turbopack)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion** (animações)
- **React Hook Form + Zod** (formulários e validação)
- **Axios** (HTTP client)
- **Lucide React** (ícones)

### Backend

- **Node.js + Express**
- **TypeScript**
- **Prisma ORM** (migrations versionadas)
- **MySQL** (via XAMPP local)
- **Multer** (upload de arquivos com validação por magic bytes)
- **JWT** (autenticação)
- **Bcryptjs** (hash de senhas)
- **Helmet + express-rate-limit** (hardening de segurança)
- **Pino** (logs estruturados)

### Banco de Dados

- **MySQL** via XAMPP (ambiente local)
- Schema gerenciado por **Prisma Migrate** (`backend/prisma/migrations/`)

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

- Número temporário para testes.
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

## Pendências

- [ ] Substituir número WhatsApp de teste pelo oficial
- [ ] Deploy em hospedagem online
- [ ] Configurar domínio e SSL
- [ ] Verificar o envio pelo whatsapp e e-mail
