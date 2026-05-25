# Deploy — Sistema SM Unitur na Oracle Cloud (Linux)

Guia passo a passo para subir o sistema do zero na **Oracle Cloud Infrastructure (OCI)**, usando uma VM **Always Free** com Linux. Tempo estimado: 2–3 horas para quem faz pela primeira vez.

---

## 0. Antes de começar — checklist de pré-requisitos

- [ ] Cartão de crédito válido (Oracle pede para verificação, **não cobra** se ficar no Always Free).
- [ ] Telefone celular para receber SMS de verificação.
- [ ] Domínio comprado (ex.: `smunitur.com.br`) — pode ser Registro.br, GoDaddy, Cloudflare etc.
- [ ] Acesso SSH no seu computador (Windows 10+/macOS/Linux já têm o cliente SSH).
- [ ] Arquivo `PRE_GO_LIVE_CHECKLIST.md` deste repo com os valores reais (senhas, e-mails, WhatsApp).

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

## 2. Provisionar a VM (Always Free)

> **Always Free** dá 4 cores ARM Ampere A1 + 24 GB RAM + 200 GB disco — recurso de sobra para o sistema.

1. Menu hambúrguer → **Compute → Instances** → **Create instance**.
2. **Name**: `smunitur-app`.
3. **Image and shape**:
   - Clique **Edit** → **Change image** → **Canonical Ubuntu 22.04** (ARM 64).
   - **Change shape** → **Ampere** → `VM.Standard.A1.Flex` → **4 OCPUs, 24 GB RAM** (max free).
4. **Networking**: deixe o VCN padrão (cria automaticamente). Marque **Assign a public IPv4 address**.
5. **SSH keys**: clique **Generate a key pair for me** → **Save Private Key** (.key) e **Save Public Key**. **Guarde o .key em local seguro — não tem como recuperar depois.**
6. **Boot volume**: deixe padrão (47 GB).
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

# Liberar HTTP/HTTPS no iptables (Ubuntu Oracle vem com iptables restritivo)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# Instalar fail2ban (protege SSH contra brute force)
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban

# (Opcional, mas recomendado) Desabilitar login SSH por senha
sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

---

## 6. Instalar stack: Node 20, MySQL 8, Nginx, Certbot, PM2

```bash
# Node.js 20 LTS via NodeSource (mais atualizado que o do apt)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar
node --version  # v20.x.x
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
git clone https://github.com/SEU_USUARIO/web-system-unitur.git .
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
npm run db:seed             # cria admin inicial + categorias padrão
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

## 17. Verificações pós-deploy

- [ ] `https://smunitur.com.br` carrega com cadeado verde.
- [ ] Formulário de orçamento → submete → número aparece.
- [ ] `/admin/login` → login com `SEED_ADMIN_EMAIL` funciona → **TROCAR a senha** em `/admin/perfil`.
- [ ] `curl https://smunitur.com.br/api/health` retorna `{"status":"ok","db":"ok"}`.
- [ ] Upload de imagem no admin/produtos funciona.
- [ ] Backup rodou: `ls /var/backups/smunitur` no dia seguinte.
- [ ] Renovação SSL automática: `sudo certbot renew --dry-run`.

---

## Troubleshooting rápido

| Sintoma | Possível causa | Comando |
|---------|----------------|---------|
| API responde 502 | PM2 caiu | `pm2 status`, `pm2 logs smunitur-api` |
| Frontend 502 | Next não iniciou | `pm2 logs smunitur-web` |
| `prisma migrate deploy` falha | Banco com schema parcial | `npm run db:migrate:baseline` |
| Imagens não carregam | Symlink quebrado | `ls -la backend/uploads` |
| SSL não renova | Cron parado | `sudo systemctl status certbot.timer` |
| Disco enchendo | Backups acumulando | Revisar `find -mtime +30 -delete` no cron |
