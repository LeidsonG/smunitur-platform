# Deploy — Sistema SM Unitur na Hostinger VPS

Guia passo a passo para subir o sistema em uma **VPS da Hostinger** com Ubuntu 24.04. A stack é idêntica ao guia Oracle ([`2-deploy-oracle.md`](2-deploy-oracle.md)) — Node.js + PM2 + MySQL + Nginx — mas o processo de provisionar a máquina e configurar o firewall é diferente e mais simples.

> Tempo estimado: 1,5–2,5 horas para quem faz pela primeira vez.

---

## Diferenças em relação ao guia Oracle

| Aspecto | Oracle Cloud | Hostinger VPS |
|---|---|---|
| Firewall | Security List (OCI) + iptables | Só UFW — muito mais simples |
| Usuário inicial | `ubuntu` (sem senha) | `root` (você define a senha) |
| Painel de controle | Console OCI (técnico) | hPanel (amigável) |
| Arquitetura | ARM64 (Ampere) | x86-64 (AMD/Intel) |
| Custo | ~$23/mês (2 OCPU + 8 GB) | ~$9–13/mês (2 vCPU + 8 GB) |
| Banda de saída | 10 TB/mês grátis | ~1–2 TB/mês |
| Object Storage incluído | 10 GB grátis | Não incluso |

---

## 0. Antes de começar

- [ ] Conta criada na Hostinger (<https://hostinger.com.br>)
- [ ] Domínio comprado (pode ser na própria Hostinger ou em outro registrador)
- [ ] Acesso SSH no seu computador
- [ ] Arquivo [`1-checklist-pre-producao.md`](1-checklist-pre-producao.md) preenchido com os valores reais

---

## 1. Contratar o VPS

1. No painel da Hostinger, clique em **VPS Hosting** → **Adicionar ao carrinho**.
2. Escolha o plano:
   - **KVM 2** (2 vCPU, 8 GB RAM, 100 GB NVMe): recomendado — ~$10–13/mês
   - **KVM 1** (1 vCPU, 4 GB RAM, 50 GB NVMe): mínimo absoluto — ~$6–8/mês
3. **Ciclo de cobrança**: prefira anual para pegar o desconto. Leia o preço de **renovação** antes de assinar — o promocional vale só no primeiro ciclo.
4. Finalize o pagamento.

---

## 2. Provisionar o servidor via hPanel

Após a compra, acesse o **hPanel** (painel.hostinger.com.br) → **VPS** → clique no seu servidor.

### 2.1 Instalar o sistema operacional

1. Clique em **"Sistema Operacional"** ou **"OS"**.
2. Selecione **Ubuntu 24.04 (LTS)** — versão de 64 bits.
3. Confirme. O servidor será reinstalado em ~2 minutos.

### 2.2 Configurar senha root e acesso SSH

1. No hPanel, vá em **"Acesso SSH"** ou **"Detalhes do servidor"**.
2. Anote o **IP público** do servidor.
3. Defina (ou copie) a **senha root** exibida — você vai precisar no primeiro acesso.

> **Recomendado:** logo no primeiro acesso, troque autenticação por senha para chave SSH (ver passo 4).

### 2.3 Datacenter

Se aparecer opção de localização, escolha **São Paulo (Brasil)** para menor latência para os clientes.

---

## 3. Liberar portas no firewall

Na Hostinger o firewall padrão do Ubuntu já vem com UFW disponível. É muito mais simples que o duplo-firewall da Oracle.

```bash
# Conecte primeiro (ainda como root, pelo IP):
ssh root@SEU_IP

# Habilitar UFW e liberar as portas necessárias
ufw allow OpenSSH     # SSH (porta 22)
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw enable            # ativar (responda "y")
ufw status            # confirmar regras
```

Resultado esperado:

```
Status: active
To                  Action    From
--                  ------    ----
OpenSSH             ALLOW     Anywhere
80/tcp              ALLOW     Anywhere
443/tcp             ALLOW     Anywhere
```

> **Não exponha** as portas 3000, 3001 ou 3306 — tudo passa pelo Nginx.

---

## 4. Hardening do servidor

```bash
# Atualiza pacotes
apt update && apt upgrade -y

# Timezone
timedatectl set-timezone America/Sao_Paulo

# Ferramentas básicas
apt install -y git curl wget unzip fail2ban

# Instalar fail2ban (protege SSH contra brute force)
systemctl enable --now fail2ban
```

### Criar usuário de deploy (sair do root)

Trabalhar como root é perigoso — um comando errado afeta tudo. Crie um usuário dedicado:

```bash
adduser deploy                    # define nome e senha quando pedido
usermod -aG sudo deploy           # permissão para sudo quando necessário

# Copiar chave SSH do root para o novo usuário
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
```

### Desabilitar login root por SSH

```bash
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

A partir daqui, conecte sempre como `deploy`:

```bash
ssh deploy@SEU_IP
```

### Swap (obrigatório no KVM 1 — recomendado em qualquer plano)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 5. Instalar stack: Node 22, MySQL 8, Nginx, Certbot, PM2

```bash
# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # v22.x.x

# MySQL 8
sudo apt install -y mysql-server
sudo systemctl enable --now mysql
sudo mysql_secure_installation
# Responda:
#   - Set root password? Sim → senha forte
#   - Remove anonymous users? Sim
#   - Disallow root login remotely? Sim
#   - Remove test database? Sim
#   - Reload privilege tables? Sim

# Criar banco e usuário da aplicação
sudo mysql -u root -p <<'SQL'
CREATE DATABASE smunitur CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'smunitur'@'localhost' IDENTIFIED BY 'COLOQUE_SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON smunitur.* TO 'smunitur'@'localhost';
FLUSH PRIVILEGES;
SQL

# Nginx
sudo apt install -y nginx
sudo systemctl enable --now nginx

# Certbot
sudo apt install -y certbot python3-certbot-nginx

# PM2
sudo npm install -g pm2

# Build tools (para o Sharp compilar)
sudo apt install -y build-essential
```

---

## 6. Apontar domínio para o servidor

No painel do seu registrador de domínio (Hostinger, Registro.br, etc.):

| Tipo | Nome | Valor |
|---|---|---|
| A | `@` | IP_DO_SERVIDOR |
| A | `www` | IP_DO_SERVIDOR |

Se o domínio for da própria Hostinger, o painel de DNS fica em **hPanel → Domínios → DNS / Zona de DNS**.

Aguarde propagação (5 min a 1h normalmente). Teste:

```bash
dig +short smunitur.com.br
# deve retornar o IP do servidor
```

---

## 7. Clonar o repositório e configurar

```bash
sudo mkdir -p /var/www/smunitur
sudo chown -R deploy:deploy /var/www/smunitur
cd /var/www/smunitur

git clone https://github.com/SEU_USUARIO/smunitur-platform.git .
git checkout main

# Diretório de uploads fora do código (sobrevive a deploys)
sudo mkdir -p /var/smunitur/uploads
sudo chown -R deploy:deploy /var/smunitur
ln -sfn /var/smunitur/uploads /var/www/smunitur/backend/uploads
```

---

## 8. Configurar variáveis de ambiente

### Backend

```bash
cd /var/www/smunitur/backend
cp .env.example .env
nano .env
```

Gerar JWT_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```env
DATABASE_URL="mysql://smunitur:SENHA_DO_BANCO@localhost:3306/smunitur"
JWT_SECRET="<saída do comando acima>"
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

## 9. Instalar dependências e construir

```bash
# Backend
cd /var/www/smunitur/backend
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run build

# Frontend
cd /var/www/smunitur/frontend
npm ci
npm run build
```

---

## 10. Subir os processos com PM2

```bash
cd /var/www/smunitur

pm2 start backend/dist/index.js --name smunitur-api
pm2 start npm --name smunitur-web --cwd /var/www/smunitur/frontend -- start

pm2 status
pm2 startup        # copie e cole o comando que ele sugerir
pm2 save
```

---

## 11. Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/smunitur.conf
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name smunitur.com.br www.smunitur.com.br;

    location /nginx-health {
        return 200 'ok';
        add_header Content-Type text/plain;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 12M;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

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

```bash
sudo ln -sf /etc/nginx/sites-available/smunitur.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 12. Habilitar HTTPS com Let's Encrypt

```bash
sudo certbot --nginx -d smunitur.com.br -d www.smunitur.com.br
```

Certbot edita o Nginx automaticamente e configura renovação automática via systemd timer.

---

## 13. Backup diário do banco

```bash
sudo mkdir -p /var/backups/smunitur
sudo chown deploy:deploy /var/backups/smunitur

cat > ~/backup-smunitur.sh <<'SH'
#!/bin/bash
set -euo pipefail
DATA=$(date +%Y%m%d-%H%M%S)
DEST=/var/backups/smunitur

URL=$(grep -E '^DATABASE_URL=' /var/www/smunitur/backend/.env | cut -d= -f2- | tr -d '"')
DB_USER=$(echo "$URL" | sed -E 's|^mysql://([^:]+):.*|\1|')
DB_PASS=$(echo "$URL" | sed -E 's|^mysql://[^:]+:([^@]+)@.*|\1|')
DB_NAME=$(echo "$URL" | sed -E 's|.*/([^?]+).*|\1|')

mysqldump --single-transaction --quick \
  -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  | gzip > "$DEST/smunitur-$DATA.sql.gz"

find "$DEST" -name 'smunitur-*.sql.gz' -mtime +30 -delete
SH

chmod +x ~/backup-smunitur.sh
~/backup-smunitur.sh && ls -lh /var/backups/smunitur

( crontab -l 2>/dev/null; echo "0 3 * * * /home/deploy/backup-smunitur.sh >> /var/log/smunitur-backup.log 2>&1" ) | crontab -
```

---

## 14. Logs e rotação

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
```

---

## 15. Deploy de novas versões

Use o script já existente no repositório:

```bash
cd /var/www/smunitur
./scripts/deploy.sh
```

Ou manualmente:

```bash
cd /var/www/smunitur
git pull origin main
cd backend && npm ci && npm run db:migrate:deploy && npm run build
cd ../frontend && npm ci && npm run build
pm2 reload smunitur-api smunitur-web
```

---

## 16. Verificações pós-deploy

- [ ] `https://smunitur.com.br` carrega com cadeado verde
- [ ] Formulário de orçamento funciona até o final
- [ ] `curl https://smunitur.com.br/api/health` retorna `{"status":"ok","db":"ok"}`
- [ ] Upload de imagem no admin funciona
- [ ] Login no admin (`/admin/login`) funciona → **trocar senha em `/admin/perfil`**
- [ ] Backup rodou: `ls /var/backups/smunitur`
- [ ] `sudo certbot renew --dry-run` passa sem erro
- [ ] PM2 sobrevive a reboot: `sudo reboot` → `pm2 status`

---

## Troubleshooting rápido

| Sintoma | Causa provável | Comando |
|---|---|---|
| API responde 502 | PM2 caiu | `pm2 status`, `pm2 logs smunitur-api` |
| Frontend 502 | Next não iniciou | `pm2 logs smunitur-web` |
| Porta 80/443 recusada | UFW bloqueando | `sudo ufw status` |
| Build do Next.js morre (OOM) | Sem swap | Adicionar swap (ver passo 4) |
| `sharp` falha no build | Build tools ausentes | `sudo apt install build-essential` |
| SSL não renova | Timer parado | `sudo systemctl status certbot.timer` |
| Não consigo SSH como deploy | Chave não copiada | Conectar como root e verificar `~deploy/.ssh/authorized_keys` |
