# Contribuindo com o SM Unitur

Guia completo para rodar o projeto localmente e contribuir com o código. Segue o passo a passo mesmo que você nunca tenha mexido com Docker ou WSL2 antes.

> **Já tem Docker Desktop com WSL2 configurado?** Pule direto para o [Passo 3](#passo-3--clone-o-repositório-dentro-do-wsl2).

---

## O que vai rodar na sua máquina

Três containers Docker, sem instalar MySQL ou Node na máquina host:

| Container | URL | Descrição |
|---|---|---|
| `smunitur_frontend` | http://localhost:3000 | Next.js (site + painel admin) |
| `smunitur_backend` | http://localhost:3001 | API Express + Prisma |
| `smunitur_db` | localhost:3306 | MySQL 8.0 |

---

## Passo 1 — Habilite o WSL2 no Windows

> Se você já usa WSL2 com Ubuntu, pule para o [Passo 2](#passo-2--instale-o-docker-desktop).

Abra o **PowerShell como administrador** e rode:

```powershell
wsl --install
```

Isso instala o WSL2 com Ubuntu automaticamente. **Reinicie o Windows** quando pedido.

Na primeira vez que o Ubuntu abrir, defina um nome de usuário e senha (pode ser simples, é só para o ambiente local).

> **Documentação oficial:** https://learn.microsoft.com/pt-br/windows/wsl/install

---

## Passo 2 — Instale o Docker Desktop

1. Baixe em **https://www.docker.com/products/docker-desktop**
2. Instale normalmente (Next → Next → Finish)
3. Abra o Docker Desktop e aguarde o ícone da baleia ficar verde na bandeja do sistema

**Habilite a integração com o WSL2:**

- Abra o Docker Desktop
- Vá em **Settings → Resources → WSL Integration**
- Marque a opção **"Enable integration with my default WSL distro"**
- Marque também a distribuição **Ubuntu** se ela aparecer na lista
- Clique em **Apply & Restart**

**Verifique a instalação** no terminal do Ubuntu (abra pelo menu Iniciar ou digite `ubuntu` no PowerShell):

```bash
docker --version
docker compose version
```

Você deve ver algo como `Docker version 27.x.x` e `Docker Compose version v2.x.x`.

---

## Passo 3 — Clone o repositório dentro do WSL2

⚠️ **Importante:** clone o projeto **dentro do filesystem do Ubuntu** (em `~/`), não em `C:\`. Isso garante hot reload rápido e evita problemas de permissão.

No terminal do **Ubuntu** (não no PowerShell do Windows):

```bash
# Crie a pasta de projetos (se não existir) e clone
mkdir -p ~/projetos
cd ~/projetos
git clone https://github.com/<org>/smunitur-platform.git
cd smunitur-platform
```

> Para acessar essa pasta pelo VSCode no Windows: abra o VSCode, pressione `Ctrl+Shift+P`, escolha **"WSL: Open Folder in WSL"** e navegue até `~/projetos/smunitur-platform`.

---

## Passo 4 — Configure as variáveis de ambiente

Ainda dentro do Ubuntu, na raiz do projeto:

```bash
cp .env.docker.example .env
```

Abra o `.env` com qualquer editor (ex.: `nano .env` ou via VSCode) e preencha os três campos marcados:

```env
# Senha interna do MySQL — pode ser qualquer valor forte
DB_ROOT_PASSWORD=coloque_uma_senha_aqui

# Senha do usuário da aplicação — sem caracteres especiais de URL (@, /, ?, #)
DB_PASSWORD=coloque_outra_senha_aqui

# Chave JWT — OBRIGATÓRIO gerar um valor aleatório com o comando abaixo
JWT_SECRET=cole_aqui_o_resultado_do_comando_abaixo
```

**Gere o `JWT_SECRET`** (rode no terminal e cole o resultado no `.env`):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

O resultado vai ser uma string longa com letras e números — é isso que você cola em `JWT_SECRET`.

> ⚠️ O `.env` já está no `.gitignore`. **Nunca commite esse arquivo** — ele contém senhas reais.

---

## Passo 5 — Suba os containers

```bash
docker compose up -d --build
```

**Na primeira vez, isso vai demorar entre 3 e 8 minutos** — o Docker precisa baixar as imagens base (Node 22, MySQL 8) e instalar todas as dependências npm dentro dos containers. Nas próximas vezes, sobe em segundos.

O que acontece automaticamente no primeiro boot:
1. MySQL sobe e fica pronto (healthcheck)
2. O backend gera o cliente Prisma e aplica as migrations no banco
3. Frontend e backend ficam com hot reload ativo

Acompanhe o progresso (opcional):

```bash
docker compose logs -f
```

Quando aparecer `ready - started server on 0.0.0.0:3000` e `Server running on port 3001`, está tudo no ar.

Para confirmar que os três containers estão rodando:

```bash
docker compose ps
```

Todos devem estar com status `running` (ou `healthy` para o banco).

---

## Passo 6 — Crie o admin inicial

```bash
docker compose exec backend npm run db:seed
```

Você vai ver:
```
[seed] Usuário admin criado: admin@smunitur.com.br
[seed] AVISO: usando senha padrão "admin123" — TROQUE imediatamente.
```

**Credenciais padrão:**

| Campo | Valor |
|---|---|
| E-mail | `admin@smunitur.com.br` |
| Senha | `admin123` |

> Troque a senha em `/admin/perfil` assim que logar.

---

## Passo 7 — Verifique que está tudo funcionando

Abra no navegador:

| O que testar | URL | Resultado esperado |
|---|---|---|
| Site público | http://localhost:3000 | Landing page da SM Unitur |
| Saúde da API | http://localhost:3001/api/health | `{"status":"ok"}` |
| Painel admin | http://localhost:3000/admin/login | Tela de login |

Faça login com `admin@smunitur.com.br` / `admin123`. Se entrar no dashboard, o ambiente está 100% funcionando. ✅

---

## Fluxo de trabalho diário

### Subir o ambiente

```bash
# Na raiz do projeto, no terminal Ubuntu
docker compose up -d
```

### Parar o ambiente

```bash
docker compose down
```

### Ver logs em tempo real

```bash
docker compose logs -f           # todos os serviços
docker compose logs -f backend   # só o backend
docker compose logs -f frontend  # só o frontend
```

### Instalar uma nova dependência npm

```bash
# Instala dentro do container (não usa o npm do host)
docker compose exec backend npm install <pacote>
docker compose exec frontend npm install <pacote>
```

### Abrir o Prisma Studio (interface visual do banco)

```bash
docker compose exec backend npm run db:studio
# Acesse: http://localhost:5555
```

---

## Convenções de commit

Este projeto usa **Conventional Commits em português**.

**Formato:**
```
tipo(escopo): descrição curta no imperativo

Corpo opcional explicando o porquê da mudança
(não o quê — o diff já mostra isso).
```

**Tipos aceitos:**

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração sem mudar comportamento |
| `style` | Formatação, espaçamento (sem lógica) |
| `docs` | Documentação |
| `chore` | Configuração, dependências, build |
| `test` | Testes |

**Exemplos:**
```
feat(orcamentos): adicionar filtro por data de criação

fix(auth): corrigir expiração do token JWT no logout

docs(contributing): adicionar guia de setup com Docker
```

> Não inclua `Co-Authored-By` de IA nas mensagens de commit.

---

## Trabalhando com o banco de dados

O projeto usa **migrations versionadas** do Prisma (arquivos em `backend/prisma/migrations/`, commitados no repositório). Não use `prisma db push`.

### Fluxo para alterar o schema

1. Edite `backend/prisma/schema.prisma`
2. Crie a migration:
   ```bash
   docker compose exec backend npm run db:migrate:dev -- --name descricao-da-mudanca
   ```
3. Commite o arquivo de migration gerado junto com as alterações de código

### Outros comandos úteis

```bash
# Ver status das migrations (quais foram aplicadas)
docker compose exec backend npm run db:migrate:status

# Popular com dados de demonstração (linhas, modelos de exemplo)
docker compose exec backend npm run db:seed:demo

# Resetar o banco (APAGA TUDO e recria)
docker compose down -v   # remove o volume do banco
docker compose up -d     # sobe tudo do zero
docker compose exec backend npm run db:seed
```

---

## Solução de problemas

### Os containers não sobem / ficam reiniciando

```bash
# Veja o que está dando errado
docker compose logs backend
docker compose logs db
```

### O backend não conecta ao banco

O backend aguarda o MySQL ficar saudável antes de iniciar (healthcheck de 30s). Se o erro for `ECONNREFUSED` ou `Access denied`:

1. Confirme que o `.env` tem `DB_USER=smunitur` e `DB_NAME=smunitur`
2. Confirme que `DB_PASSWORD` no `.env` não tem caracteres especiais de URL (`@`, `/`, `?`, `#`)
3. Tente um reset limpo:
   ```bash
   docker compose down -v
   docker compose up -d
   ```

### Hot reload não funciona (arquivo editado mas não recarrega)

Se o código está no filesystem do Windows (`/mnt/c/...`), o polling pode não estar funcionando. Confirme:
```bash
docker compose exec frontend env | grep POLLING
docker compose exec backend env | grep POLLING
```
Ambos devem mostrar `WATCHPACK_POLLING=true` / `CHOKIDAR_USEPOLLING=true`.

A solução definitiva é mover o repositório para dentro do WSL2 (`~/projetos/`).

### Erro de permissão nos uploads

```bash
docker compose exec backend chmod -R 777 /app/uploads
```

### Rebuild limpo (quando algo estiver muito quebrado)

```bash
docker compose down -v            # para tudo e remove volumes
docker compose build --no-cache   # reconstrói as imagens do zero
docker compose up -d
docker compose exec backend npm run db:seed
```

### `sharp` / `node-gyp` falhou no build

O Dockerfile já instala `python3 make g++` para compilar binários nativos. Se falhar assim mesmo:
```bash
docker compose build --no-cache backend
```

---

## Referências

- [`docs/DOCKER.md`](docs/DOCKER.md) — comandos Docker avançados, performance WSL2, produção
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — visão geral da arquitetura e modelo de dados
- [`docs/1-checklist-pre-producao.md`](docs/1-checklist-pre-producao.md) — checklist antes de ir para produção
- [Conventional Commits](https://www.conventionalcommits.org/pt-br/) — especificação completa
