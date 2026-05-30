# Deploy — Sistema SM Unitur na Oracle Cloud (Linux)

Guia passo a passo para subir o sistema do zero na **Oracle Cloud Infrastructure (OCI)**, usando uma VM com Linux. Cobre tanto o plano **Always Free** (A1 Ampere ARM) quanto a **conta paga** (A1.Flex pago — shape recomendado). Tempo estimado: 2–3 horas para quem faz pela primeira vez.

> **Produção é nativa (Node + PM2 + MySQL na VM).** O Docker é usado apenas em
> desenvolvimento (ver [`DOCKER.md`](DOCKER.md) e [`../CONTRIBUTING.md`](../CONTRIBUTING.md)) —
> em produção optamos por execução nativa para economizar memória da VM.

---

## 0. Antes de começar — checklist de pré-requisitos

- [X] Cartão de crédito válido (Oracle pede para verificação; no Always Free **não cobra** se ficar dentro dos limites).
- [ ] Telefone celular para receber SMS de verificação.
- [X] Domínio comprado (ex.: `smunitur.com.br`) — pode ser Registro.br, GoDaddy, Cloudflare etc.
- [ ] Acesso SSH no seu computador (Windows 10+/macOS/Linux já têm o cliente SSH).
- [ ] Arquivo [`1-checklist-pre-producao.md`](1-checklist-pre-producao.md) deste repo com os valores reais (senhas, e-mails, WhatsApp).

---

## 1. Criar conta Oracle Cloud

1. Acesse <https://signup.oraclecloud.com> e clique em **"Start for free"**.
2. Preencha: nome, e-mail corporativo, país, tipo de conta = **Individual**.
3. **Importante**: na escolha da região (Home Region), selecione **Brasil — São Paulo (sa-saopaulo-1)** ou **Brasil — Vinhedo (sa-vinhedo-1)** para latência baixa para clientes brasileiros. A região **NÃO pode ser alterada depois**.
4. Cadastre cartão (sem cobrança no free tier) e finalize.
5. Aguarde e-mail de confirmação (~15 minutos).
6. Faça login no <https://cloud.oracle.com>.
7. Habilite **MFA** em **Identity → My Profile → Multi-Factor Authentication**.

---

## 2. Provisionar a VM

### Dimensionamento de recursos

Este sistema roda 3 processos em produção (MySQL + Node.js backend + Next.js frontend). Consumo real estimado:

| Processo | RAM |
|---|---|
| MySQL 8 (low traffic) | 300–450 MB |
| Backend Node.js (Express + Prisma) | 120–180 MB |
| Frontend Next.js (SSR aquecido) | 280–400 MB |
| Nginx + PM2 + SO | 150–200 MB |
| **Total** | **~900 MB – 1.25 GB** |

| Configuração | Custo estimado/mês | Indicado para |
|---|---|---|
| 1 OCPU + 2 GB | ~$7 | Mínimo absoluto — MySQL fica apertado |
| 2 OCPU + 4 GB | ~$15 | **Mínimo recomendado** — confortável |
| 2 OCPU + 8 GB | ~$23 | **Ideal** — folga para crescer e rodar builds |
| Always Free A1 | $0 | Até 4 OCPU + 24 GB, mas sem SLA de disponibilidade |

> **Shape recomendado: `VM.Standard.A1.Flex` (Ampere ARM64)** — mesmo hardware do Always Free, zero mudança de binários (Node.js, Sharp, MySQL já compilados e testados em ARM). É também o shape mais barato da OCI.

### Via Console OCI

1. Menu hambúrguer → **Compute → Instances** → **Create instance**.
2. **Name**: `smunitur-app`.
3. **Image and shape**:
   - Clique **Edit** → **Change image** → **Canonical Ubuntu 24.04** (ARM 64 / aarch64).
   - **Change shape** → **Ampere** → `VM.Standard.A1.Flex`.
   - **Always Free**: selecione **4 OCPUs, 24 GB RAM** (máximo gratuito).
   - **Conta paga**: selecione **2 OCPUs, 8 GB RAM** (recomendado).
4. **Networking**: deixe o VCN padrão (cria automaticamente). Marque **Assign a public IPv4 address**.
5. **SSH keys**: clique **Generate a key pair for me** → **Save Private Key** (.key) e **Save Public Key**. **Guarde o .key em local seguro — não tem como recuperar depois.**
6. **Boot volume**: 
   - Always Free: 200 GB (gratuito).
   - Conta paga: 100 GB (padrão, ~$2.55/mês). Suficiente para este projeto.
7. **Create**.

Aguarde ~2 minutos. Anote o **IP público** (vai aparecer em "Primary VNIC").

---

## 3. Liberar portas no firewall da OCI

A OCI tem 2 níveis de firewall: **Security List** (rede) e `iptables` (VM). Vamos liberar nos dois.

### 3.1 Security List

1. **Compute → Instances → smunitur-app** → role até "Primary VNIC" → clique no link da **Subnet**.
2. Na subnet, clique na **Default Security List**.
3. **Add Ingress Rules**:
   - Regra HTTP: Source CIDR `0.0.0.0/0`, IP Protocol TCP, Destination Port `80`.
   - Regra HTTPS: Source CIDR `0.0.0.0/0`, IP Protocol TCP, Destination Port `443`.
   - (SSH na 22 já vem liberado por padrão — restrinja ao seu IP se possível: `SEU_IP/32`.)
   - **Não exponha** as portas 3000, 3001 ou 3306 — tudo passa pelo Nginx.

### 3.2 iptables (dentro da VM, faremos no passo 5)

---

## 4. Conectar via SSH

No seu computador:

```bash
# Windows (PowerShell), macOS, Linux:
chmod 600 caminho/para/sua-chave.key   # macOS/Linux apenas
ssh -i caminho/para/sua-chave.key ubuntu@SEU_IP_PUBLICO
```

Primeira vez, aceita a fingerprint. Depois você está em `ubuntu@smunitur-app:~$`.

---

## 5. Hardening do servidor

```bash
# Atualiza pacotes
sudo apt update && sudo apt upgrade -y

# Timezone
sudo timedatectl set-timezone America/Sao_Paulo

# Ferramentas básicas
sudo apt install -y git curl wget unzip fail2ban netfilter-persistent

# Liberar HTTP/HTTPS no iptables (Ubuntu Oracle vem com iptables restritivo)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Instalar fail2ban (protege SSH contra brute force)
sudo systemctl enable --now fail2ban

# (Opcional, mas recomendado) Desabilitar login SSH por senha
sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### Swap (obrigatório se usar 2 GB de RAM)

O build do Next.js consome ~1–1.5 GB de RAM temporariamente. Com 2 GB de RAM, o processo pode morrer por OOM. Adicione swap preventivamente:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Com 4 GB+ de RAM, swap é opcional mas ainda recomendado como segurança.

---

## 6. Instalar stack: Node 22, MySQL 8, Nginx, Certbot, PM2

```bash
# Node.js 22 LTS via NodeSource (mínimo obrigatório: Node 20 — versões anteriores quebram sharp/thread-stream)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar
node --version  # v22.x.x
npm --version

# MySQL 8
sudo apt install -y mysql-server
sudo systemctl enable --now mysql

# Configurar MySQL — script interativo de segurança
sudo mysql_secure_installation
# Responda:
#   - Set root password? Sim → escolha uma senha forte (anote!)
#   - Remove anonymous users? Sim
#   - Disallow root login remotely? Sim
#   - Remove test database? Sim
#   - Reload privilege tables? Sim

# Criar database + usuário dedicado
sudo mysql -u root -p <<'SQL'
CREATE DATABASE smunitur CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'smunitur'@'localhost' IDENTIFIED BY 'COLOQUE_SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON smunitur.* TO 'smunitur'@'localhost';
FLUSH PRIVILEGES;
SQL

# Nginx
sudo apt install -y nginx
sudo systemctl enable --now nginx

# Certbot (SSL Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx

# PM2 (gerenciador de processos Node)
sudo npm install -g pm2

# Build tools para sharp (libvips compilado)
sudo apt install -y build-essential
```

---

## 7. Apontar domínio para o servidor

No painel do seu registrador de domínio:

| Tipo | Nome | Valor |
|------|------|-------|
| A    | `@`  | IP_PUBLICO_DA_VM |
| A    | `www` | IP_PUBLICO_DA_VM |

Aguarde propagação (5 min a 24h, geralmente <1h). Teste:

```bash
dig +short smunitur.com.br
# Deve retornar seu IP público
```

---

## 8. Clonar o repositório e configurar

```bash
# Diretório do app
sudo mkdir -p /var/www/smunitur
sudo chown -R ubuntu:ubuntu /var/www/smunitur
cd /var/www/smunitur

# Clone (use HTTPS, ou configure deploy key se preferir SSH)
git clone https://github.com/SEU_USUARIO/smunitur-platform.git .
git checkout main

# Diretório separado para uploads (sobrevive a deploys/pull --force)
sudo mkdir -p /var/smunitur/uploads
sudo chown -R ubuntu:ubuntu /var/smunitur
# Linkar para o backend
ln -sfn /var/smunitur/uploads /var/www/smunitur/backend/uploads
```

---

## 9. Configurar variáveis de ambiente

### Backend

```bash
cd /var/www/smunitur/backend
cp .env.example .env
nano .env
```

Preencha **todos** os campos. Para gerar o JWT_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Valores típicos de produção:

```env
DATABASE_URL="mysql://smunitur:SENHA_DO_BANCO@localhost:3306/smunitur"
JWT_SECRET="<saída do comando acima — ~96 caracteres hex>"
JWT_EXPIRES_IN="7d"
BCRYPT_ROUNDS=12
PORT=3001
NODE_ENV=production
FRONTEND_URL="https://smunitur.com.br"
MAX_FILE_SIZE=10485760
MAX_IMAGE_DIM=2000
SEED_ADMIN_EMAIL="admin@smunitur.com.br"
SEED_ADMIN_PASSWORD="SENHA_FORTE_DO_ADMIN"
```

### Frontend

```bash
cd /var/www/smunitur/frontend
cp .env.local.example .env.local
nano .env.local
```

```env
NEXT_PUBLIC_API_URL=https://smunitur.com.br/api
```

---

## 10. Instalar dependências e construir

```bash
# Backend
cd /var/www/smunitur/backend
npm ci
npm run db:generate
npm run db:migrate:deploy   # aplica a migration no banco vazio
npm run db:seed             # cria admin inicial + linhas padrão
npm run build               # compila TypeScript → dist/

# Frontend
cd /var/www/smunitur/frontend
npm ci
npm run build               # gera .next/ otimizado
```

> **Se `sharp` falhar no build** (binário ARM/Ubuntu): `cd backend && npm rebuild sharp`. Em últimos casos: `npm install --include=optional sharp`.

---

## 11. Subir os processos com PM2

```bash
cd /var/www/smunitur

# Backend (API)
pm2 start backend/dist/index.js --name smunitur-api

# Frontend (Next.js em modo SSR)
pm2 start npm --name smunitur-web --cwd /var/www/smunitur/frontend -- start

# Verificar
pm2 status
pm2 logs

# Iniciar no boot da VM
pm2 startup     # copie e cole o comando que ele sugerir
pm2 save        # salva o snapshot atual
```

---

## 12. Configurar Nginx (reverse proxy + servir frontend)

```bash
sudo nano /etc/nginx/sites-available/smunitur.conf
```

Cole:

```nginx
# HTTP → redireciona para HTTPS (criado depois pelo Certbot)
server {
    listen 80;
    listen [::]:80;
    server_name smunitur.com.br www.smunitur.com.br;

    # Healthcheck simples — útil para load balancer
    location /nginx-health {
        return 200 'ok';
        add_header Content-Type text/plain;
    }

    # Repassa /api → backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 12M;  # > MAX_FILE_SIZE para acomodar overhead multipart
    }

    # Uploads servidos diretamente pelo backend
    location /uploads/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Tudo o mais → Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative e teste:

```bash
sudo ln -sf /etc/nginx/sites-available/smunitur.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t       # valida sintaxe
sudo systemctl reload nginx
```

Acesse `http://smunitur.com.br` no navegador — deve carregar a landing page (sem HTTPS ainda).

---

## 13. Habilitar HTTPS com Let's Encrypt

```bash
sudo certbot --nginx -d smunitur.com.br -d www.smunitur.com.br
# Responda:
#   - e-mail: seu_email@dominio.com
#   - aceitar termos: A
#   - compartilhar e-mail: N
#   - redirecionar HTTP→HTTPS: 2 (sim)
```

Certbot edita o vhost automaticamente para servir HTTPS na 443 e redirecionar HTTP→HTTPS. O certificado renova sozinho via systemd timer (`certbot.timer`).

Teste em `https://smunitur.com.br` — cadeado verde.

---

## 14. Backup diário do banco

```bash
# Diretório de backups
sudo mkdir -p /var/backups/smunitur
sudo chown ubuntu:ubuntu /var/backups/smunitur

# Script (extrai credenciais da DATABASE_URL do .env do backend)
cat > ~/backup-smunitur.sh <<'SH'
#!/bin/bash
set -euo pipefail
DATA=$(date +%Y%m%d-%H%M%S)
DEST=/var/backups/smunitur

# DATABASE_URL no formato: mysql://USUARIO:SENHA@HOST:PORTA/BANCO
URL=$(grep -E '^DATABASE_URL=' /var/www/smunitur/backend/.env | cut -d= -f2- | tr -d '"')
DB_USER=$(echo "$URL" | sed -E 's|^mysql://([^:]+):.*|\1|')
DB_PASS=$(echo "$URL" | sed -E 's|^mysql://[^:]+:([^@]+)@.*|\1|')
DB_NAME=$(echo "$URL" | sed -E 's|.*/([^?]+).*|\1|')

mysqldump --single-transaction --quick \
  -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  | gzip > "$DEST/smunitur-$DATA.sql.gz"

# Mantém últimos 30 dias
find "$DEST" -name 'smunitur-*.sql.gz' -mtime +30 -delete
SH
chmod +x ~/backup-smunitur.sh

# Teste manual antes de confiar no cron
~/backup-smunitur.sh && ls -lh /var/backups/smunitur

# Cron: diário às 03:00
( crontab -l 2>/dev/null; echo "0 3 * * * /home/ubuntu/backup-smunitur.sh >> /var/log/smunitur-backup.log 2>&1" ) | crontab -
```

> Para backup off-site, sincronize `/var/backups/smunitur` com Oracle Object Storage (10 GB grátis). Veja `oci os object put` na documentação.

---

## 15. Logs e rotação

PM2 já gera logs em `~/.pm2/logs/`. Configure rotação:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
```

Logs do Nginx ficam em `/var/log/nginx/access.log` e `error.log` — já com logrotate padrão.

---

## 16. Deploy de novas versões (rotina)

```bash
cd /var/www/smunitur

# Snapshot preventivo (recomendado antes de migrations ou deploys grandes)
~/backup-smunitur.sh
git tag deploy-$(date +%Y%m%d-%H%M) && git push --tags

git pull origin main

# Backend
cd backend
npm ci
npm run db:migrate:deploy   # aplica novas migrations
npm run build

# Frontend
cd ../frontend
npm ci
npm run build

# Restart sem downtime
pm2 reload smunitur-api
pm2 reload smunitur-web
```

Considere automatizar isso em `deploy.sh` ou GitHub Actions.

---

## 17. Rollback

### Rollback de código (< 2 minutos)

```bash
cd /var/www/smunitur

# Ver tags de deploy disponíveis
git tag | grep deploy | tail -10

# Voltar para um deploy anterior
git checkout deploy-20260528-1430

# Rebuild
cd backend && npm run build
cd ../frontend && npm run build

# Recarregar sem downtime
pm2 reload smunitur-api smunitur-web
```

### Rollback de banco de dados

Use apenas quando houver migrations problemáticas — restaurar o banco apaga dados inseridos depois do backup.

```bash
# 1. Parar o backend para evitar writes durante a restauração
pm2 stop smunitur-api

# 2. Restaurar o backup do dia anterior (ajuste a data)
gunzip < /var/backups/smunitur/smunitur-20260528-030000.sql.gz \
  | mysql -u smunitur -p smunitur

# 3. Voltar o código para o commit compatível com esse banco
git checkout deploy-20260528-1430
cd backend && npm run build

# 4. Restartar
pm2 start smunitur-api
```

---

## 18. Migração de instância Free Tier → Conta Paga

Use este procedimento quando estiver criando uma nova VM na conta paga e precisar transferir dados da instância free tier existente.

> **A arquitetura não muda** — mesmo shape ARM, mesmo Ubuntu 24.04, mesmos binários. O que muda é apenas a instância física e o IP público.

```bash
# ── NA INSTÂNCIA FREE TIER (origem) ────────────────────────────────────────────

# 1. Snapshot do banco completo
mysqldump --single-transaction -u smunitur -p smunitur \
  | gzip > /tmp/smunitur-migração.sql.gz

# 2. Compactar uploads
tar czf /tmp/uploads-migração.tar.gz /var/smunitur/uploads/

# 3. Transferir para a nova VM (substitua NOVO_IP)
scp -i ~/sua-chave.key /tmp/smunitur-migração.sql.gz ubuntu@NOVO_IP:/tmp/
scp -i ~/sua-chave.key /tmp/uploads-migração.tar.gz ubuntu@NOVO_IP:/tmp/

# ── NA NOVA INSTÂNCIA PAGA (destino) ───────────────────────────────────────────

# 4. Restaurar banco (após ter concluído os passos 1–10 deste guia)
gunzip < /tmp/smunitur-migração.sql.gz | mysql -u smunitur -p smunitur

# 5. Restaurar uploads
sudo tar xzf /tmp/uploads-migração.tar.gz -C /
sudo chown -R ubuntu:ubuntu /var/smunitur/uploads/

# 6. Verificar funcionamento ANTES de mudar o DNS
curl http://localhost:3001/api/health
# acesse também via IP público da nova VM no navegador

# 7. Mudar DNS (só depois de verificar tudo)
# Atualize o registro A no seu registrador: smunitur.com.br → NOVO_IP

# 8. Aguardar propagação DNS (5–30 min) e testar HTTPS no domínio

# 9. Aguardar 48h monitorando. Só então desligue/delete a instância antiga.
```

---

## 19. Verificações pós-deploy

- [ ] `https://smunitur.com.br` carrega com cadeado verde.
- [ ] Formulário de orçamento → submete → número aparece.
- [ ] `/admin/login` → login com `SEED_ADMIN_EMAIL` funciona → **TROCAR a senha** em `/admin/perfil`.
- [ ] `curl https://smunitur.com.br/api/health` retorna `{"status":"ok","db":"ok"}`.
- [ ] Upload de imagem no admin/modelos funciona.
- [ ] Imagens aparecem corretamente nas páginas (symlink `/uploads/` funcionando).
- [ ] Backup rodou: `ls /var/backups/smunitur` no dia seguinte.
- [ ] Renovação SSL automática: `sudo certbot renew --dry-run`.
- [ ] PM2 sobrevive a reboot: `sudo reboot`, esperar, verificar `pm2 status`.

---

## Troubleshooting rápido

| Sintoma | Possível causa | Comando |
|---------|----------------|---------|
| API responde 502 | PM2 caiu | `pm2 status`, `pm2 logs smunitur-api` |
| Frontend 502 | Next não iniciou | `pm2 logs smunitur-web` |
| `prisma migrate deploy` falha | Banco com schema parcial | `npm run db:migrate:baseline` |
| Imagens não carregam | Symlink quebrado | `ls -la backend/uploads` |
| SSL não renova | Timer parado | `sudo systemctl status certbot.timer` |
| Disco enchendo | Backups acumulando | Revisar `find -mtime +30 -delete` no cron |
| Build do Next.js morre (OOM) | Sem swap, RAM insuficiente | Adicionar swap (ver seção 5) |
| VM retomada pela Oracle | Free Tier sem SLA | Migrar para conta paga (ver seção 18) |
