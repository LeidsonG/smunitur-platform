# Checklist Pré-Produção — Sistema SM Unitur

Lista de TODOS os pontos que precisam ser definidos/preenchidos com valores reais ANTES de o sistema ir para o ar para o cliente. Cada item tem um placeholder no código ou na configuração que aceita o valor temporário, mas NÃO PODE ficar em produção.

Use este arquivo como roteiro de aceite. Marque `[x]` quando concluído.

---

## 1. Dados do cliente / negócio

| Item | Onde preencher | Status |
|------|----------------|--------|
| Número WhatsApp oficial da SM Unitur | `frontend/src/lib/whatsapp.ts` → `WHATSAPP_NUMBER` (formato `55DDDNUMERO`, ex.: `5517981322215`) | [ ] |
| E-mail principal de contato (exibido no Footer/Contato) | `frontend/src/components/landing/Footer.tsx` + `Contato.tsx` | [ ] |
| Endereço físico (se for exibir) | `frontend/src/components/landing/Footer.tsx` / `Contato.tsx` | [ ] |
| Redes sociais (Instagram, Facebook) — links reais | `frontend/src/components/landing/Footer.tsx` | [ ] |
| Logo da empresa (substituir asset em `/image/`) | conferir referências em components | [ ] |
| Paleta de cores especial da fábrica (aguardando) | será nova feature numa próxima versão — ver [`4-roadmap.md`](4-roadmap.md) | [ ] |

---

## 2. Domínio e DNS

| Item | Como obter | Status |
|------|-----------|--------|
| Domínio comprado | Registro.br, GoDaddy, Cloudflare etc. | [ ] |
| Registro A `@` → IP da VM Oracle | painel do registrador | [ ] |
| Registro A `www` → IP da VM | painel do registrador | [ ] |
| (Opcional) Registro MX para e-mail | se for usar e-mail no próprio domínio | [ ] |
| Propagação verificada (`dig +short DOMINIO`) | linha de comando | [ ] |

---

## 3. Infraestrutura Oracle Cloud

Ver [`2-deploy-oracle.md`](2-deploy-oracle.md) passo-a-passo. Itens-chave:

**Shape recomendado: `VM.Standard.A1.Flex` (Ampere ARM64)**
- Always Free: 4 OCPUs + 24 GB (gratuito, sem SLA de disponibilidade)
- Conta paga recomendada: 2 OCPUs + 8 GB (~$23/mês, SLA 99.9%)

| Item | Status |
|------|--------|
| Conta Oracle Cloud criada + MFA ativado | [ ] |
| VM A1.Flex provisionada em região BR (São Paulo ou Vinhedo) | [ ] |
| Shape configurado: Always Free (4 OCPU/24 GB) ou Pago (2 OCPU/8 GB) | [ ] |
| Boot volume: 200 GB (free) ou 100 GB (pago) | [ ] |
| Chave SSH `.key` salva em local seguro (backup!) | [ ] |
| Security List liberando portas 80 e 443 (não expor 3000/3001/3306) | [ ] |
| `iptables` na VM liberando 80/443 (`netfilter-persistent save`) | [ ] |
| Swap de 2 GB configurado (obrigatório se usar 2 GB RAM, recomendado em qualquer caso) | [ ] |
| Fail2ban instalado para SSH | [ ] |
| Login SSH por senha desabilitado | [ ] |

**Se migrou de Free Tier para conta paga:**

| Item | Status |
|------|--------|
| Dump MySQL transferido e restaurado na nova VM | [ ] |
| Uploads (`/var/smunitur/uploads/`) copiados para nova VM | [ ] |
| Sistema verificado via IP da nova VM antes de mudar DNS | [ ] |
| DNS atualizado para novo IP | [ ] |
| Instância antiga desligada (não deletar por 48h) | [ ] |

---

## 4. Stack instalada na VM

| Item | Comando de verificação | Status |
|------|------------------------|--------|
| Node 22 LTS | `node --version` | [ ] |
| MySQL 8 rodando | `sudo systemctl status mysql` | [ ] |
| Banco `smunitur` criado | `mysql -u smunitur -p -e "USE smunitur; SHOW TABLES;"` | [ ] |
| Nginx rodando | `sudo systemctl status nginx` | [ ] |
| Certbot SSL renovação automática | `sudo certbot renew --dry-run` | [ ] |
| PM2 startup configurado | `pm2 startup` + `pm2 save` | [ ] |

---

## 5. Variáveis de ambiente (`backend/.env` na VM)

| Variável | Valor | Status |
|----------|-------|--------|
| `DATABASE_URL` | `mysql://smunitur:SENHA_REAL@localhost:3306/smunitur` | [ ] |
| `JWT_SECRET` | string aleatória ≥32 chars (use `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) | [ ] |
| `JWT_EXPIRES_IN` | `7d` (ou ajuste conforme política) | [ ] |
| `BCRYPT_ROUNDS` | `12` | [ ] |
| `NODE_ENV` | `production` | [ ] |
| `FRONTEND_URL` | `https://smunitur.com.br` (domínio real, sem barra final) | [ ] |
| `MAX_FILE_SIZE` | `10485760` (10MB) | [ ] |
| `MAX_IMAGE_DIM` | `2000` | [ ] |
| `SEED_ADMIN_EMAIL` | e-mail real do admin principal | [ ] |
| `SEED_ADMIN_PASSWORD` | senha forte (não usar `admin123`!) | [ ] |

> ⚠️ **Atenção**: o servidor recusa subir se `JWT_SECRET` contiver palavras como "troque", "secret", "example", "default" em produção. Use mesmo um valor aleatório.

---

## 6. Variáveis de ambiente (`frontend/.env.local` na VM)

| Variável | Valor | Status |
|----------|-------|--------|
| `NEXT_PUBLIC_API_URL` | `https://smunitur.com.br/api` | [ ] |

---

## 7. Primeiro acesso ao admin

| Item | Status |
|------|--------|
| Login com `SEED_ADMIN_EMAIL` + senha do `.env` funciona | [ ] |
| **Trocar senha imediatamente** em `/admin/perfil` | [ ] |
| Atualizar foto e nome do admin | [ ] |
| (Recomendado) Criar um segundo super_admin de backup | [ ] |
| (Recomendado) Criar operadores de produção, se houver equipe | [ ] |

---

## 8. Conteúdo inicial

| Item | Status |
|------|--------|
| Linhas revisadas (vêm 3 padrão do seed: Camisetas, Moletons, Jalecos) — ajustar se SM Unitur tem outras | [ ] |
| Especificações globais cadastrados (ex.: Tipo de Gola, Tecido, Manga) com variações | [ ] |
| Modelos cadastrados com imagens reais | [ ] |
| Cada modelo associado aos especificações relevantes + variações habilitadas | [ ] |

---

## 9. Testes de aceite (manual, antes de divulgar)

| Cenário | Status |
|---------|--------|
| Landing carrega em mobile (testar no celular real) | [ ] |
| Formulário de orçamento — fluxo completo até o WhatsApp | [ ] |
| Upload de imagem de referência funciona | [ ] |
| Acompanhamento por número exibe status correto | [ ] |
| Admin: cria linha, modelo, especificação, associa variações | [ ] |
| Admin: muda status do orçamento, observa histórico | [ ] |
| Admin: edita valor do orçamento | [ ] |
| Admin: cria operador novo, faz login com ele, confirma RBAC | [ ] |
| `https://smunitur.com.br/api/health` retorna `{"status":"ok","db":"ok"}` | [ ] |
| Cadeado verde no navegador (SSL válido) | [ ] |

---

## 10. Operação contínua

| Item | Status |
|------|--------|
| Backup diário do MySQL configurado (`crontab -l`) | [ ] |
| Diretório de backup com permissão correta (`/var/backups/smunitur`) | [ ] |
| Rotação de logs PM2 (`pm2 install pm2-logrotate`) | [ ] |
| Tags de deploy criadas antes de cada atualização (`git tag deploy-YYYYMMDD-HHMM`) | [ ] |
| Rollback testado ao menos uma vez (ver seção 17 de `2-deploy-oracle.md`) | [ ] |
| GitHub Actions deploy automático configurado (ver abaixo) | [ ] |
| Documentação interna entregue ao cliente (este arquivo + 2-deploy-oracle.md) | [ ] |

### GitHub Actions — deploy automático ao fazer push na `main`

O CI (lint + build) já está configurado em `.github/workflows/ci.yml`. O que **falta** é o deploy automático — hoje o deploy ainda é manual via `./scripts/deploy.sh` no servidor.

**Para ativar o deploy automático:**

1. Gere uma chave SSH dedicada para o deploy (na sua máquina local):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/smunitur_deploy
   ```

2. Adicione a chave pública ao servidor:
   ```bash
   cat ~/.ssh/smunitur_deploy.pub | ssh ubuntu@SEU_IP "cat >> ~/.ssh/authorized_keys"
   ```

3. No GitHub → Settings → Secrets and variables → Actions, adicione:
   - `DEPLOY_HOST` = IP ou domínio do servidor
   - `DEPLOY_USER` = `ubuntu` (ou o usuário que usa no servidor)
   - `DEPLOY_KEY` = conteúdo de `~/.ssh/smunitur_deploy` (chave **privada**)

4. Peça ao Claude Code para criar `.github/workflows/deploy.yml` — ele saberá montar o workflow com os secrets acima.

- [ ] Chave SSH de deploy gerada e adicionada ao servidor
- [ ] Secrets `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY` criados no GitHub
- [ ] Workflow de deploy automático criado (pedir ao Claude com os secrets prontos)

---

## 11. Monitoramento pós-deploy ⚠️ FAZER LOGO APÓS O SITE IR NO AR

### UptimeRobot — monitor de disponibilidade (gratuito, 5 minutos)

Avisa por e-mail/WhatsApp quando o site cair, antes de qualquer cliente reclamar.

1. Crie uma conta em <https://uptimerobot.com>
2. Clique em **"Add New Monitor"**
3. Preencha:
   - Monitor Type: `HTTP(s)`
   - Friendly Name: `SM Unitur API`
   - URL: `https://smunitur.com.br/api/health`
   - Monitoring Interval: `5 minutes`
4. Em **"Alert Contacts"**, adicione seu e-mail e/ou número de WhatsApp
5. Salve — pronto

- [ ] UptimeRobot configurado apontando para `/api/health`
- [ ] Alerta de e-mail ou WhatsApp ativo

---

### Sentry — captura de erros em produção (gratuito até 5k eventos/mês)

Envia e-mail com stack trace completo quando qualquer erro acontece no backend ou frontend — você fica sabendo antes do cliente.

1. Crie conta em <https://sentry.io> e crie um projeto **Node.js** (backend) e outro **Next.js** (frontend)
2. Copie o DSN de cada projeto e abra uma conversa com o Claude Code:
   - _"Integre o Sentry no backend com o DSN: `[cole aqui]`"_
   - _"Integre o Sentry no frontend com o DSN: `[cole aqui]`"_
3. O Claude adicionará o SDK e configurará a captura automática de erros

- [ ] Conta Sentry criada
- [ ] DSN do backend anotado
- [ ] DSN do frontend anotado
- [ ] Sentry integrado no código (pedir ao Claude com os DSNs)

---

## 11. Segurança (auditoria pré-produção)

- [ ] Senha `admin123` **NUNCA** está mais ativa em nenhum usuário
- [ ] `JWT_SECRET` não é o de exemplo
- [ ] `.env` não está commitado no git (verificar `git status` na VM)
- [ ] Backup local da chave SSH `.key` da VM em local seguro (NÃO no servidor)
- [ ] Lista dos super_admins documentada (quem tem acesso de quê)
- [ ] Plano de recuperação em caso de comprometimento (qual senha, qual backup)

---

## Quando todos os itens estiverem `[x]`

Comunique o lançamento ao cliente e envie:
1. URL: `https://smunitur.com.br`
2. URL admin: `https://smunitur.com.br/admin/login`
3. Credenciais iniciais (e-mail + senha) por canal seguro (não e-mail simples)
4. Cópia do [`ARCHITECTURE.md`](../ARCHITECTURE.md) para entender o sistema
5. Cópia de [`2-deploy-oracle.md`](2-deploy-oracle.md) (para o time de TI, se houver)
