# Deploy — Contagie Beta

Plataforma de produção: **Railway** (Postgres gerenciado + Web Service).
Storage de mídia: **Cloudflare R2** (independente).
Email transacional: **Resend** (independente).
Domínio: definir em `NEXTAUTH_URL` e `R2_PUBLIC_URL`.

> **REGRA OBRIGATÓRIA — antes de qualquer deploy em produção:**
> 1. Rodar `pre-push-test-engineer` (testes + typecheck) — se "hotfix" for explicitado pelo usuário, pular.
> 2. Rodar `security-sentinel` (auditoria de segurança) — se "hotfix" for explicitado, pular.
> 3. **Pedir autorização explícita do usuário antes de executar `railway up` ou `git push` em main**. Esperar "sim".
> Ver detalhes em `~/.claude/CLAUDE.md` (regras globais).

---

## 1. Pré-requisitos (uma vez por máquina)

```bash
# CLI Railway (já autenticado segundo CLAUDE.md global)
railway --version
railway whoami

# Verificar projeto vinculado
railway status
```

Se o projeto ainda não está vinculado nesta máquina:
```bash
railway link
```
Selecione o projeto **Contagie Beta** (workspace `gavjr1911`).

---

## 2. Primeira configuração (uma vez por ambiente)

### 2.1 Provisionar serviços

No painel Railway:
1. **New Project** → Deploy from GitHub repo `gavjr1911/contagio-e-beta`.
2. **Add Service → Database → PostgreSQL**. Railway injeta `DATABASE_URL` automaticamente.
3. **Settings → Networking → Generate Domain** (ou Custom Domain se já houver).
4. **Settings → Cron** (ver seção 5).

### 2.2 Variáveis de ambiente

Configure no Railway via `railway variables` ou painel. **Todas obrigatórias:**

```bash
# Banco — Railway injeta automaticamente quando o serviço Postgres está linkado:
#   DATABASE_URL — não precisa setar manualmente.

# NextAuth
NEXTAUTH_URL=https://contagie.beta.church          # domínio público
NEXTAUTH_SECRET=$(openssl rand -base64 32)         # 32+ chars random

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@beta.church

# Tokens internos (gerar valores únicos por ambiente)
SETTINGS_ENCRYPTION_KEY=$(openssl rand -base64 32) # OBRIGATÓRIO — sem fallback
EMAIL_TOKEN_SECRET=$(openssl rand -base64 32)      # HMAC dos tokens de confirmação por email
CRON_SECRET=$(openssl rand -base64 32)             # autorização das rotas de cron

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=contagie-media
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxx.r2.dev

# Timezone do servidor (importante para datas em SP/Brasil)
TZ=America/Sao_Paulo
NODE_ENV=production
```

Aplicação prática via CLI (executar no diretório do projeto, com `railway link` feito):
```bash
railway variables --set NEXTAUTH_URL="https://contagie.beta.church" \
  --set NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  --set SETTINGS_ENCRYPTION_KEY="$(openssl rand -base64 32)" \
  --set EMAIL_TOKEN_SECRET="$(openssl rand -base64 32)" \
  --set CRON_SECRET="$(openssl rand -base64 32)" \
  --set TZ="America/Sao_Paulo" \
  --set NODE_ENV="production"

# Variáveis específicas do Resend / R2 — substituir valores manualmente:
railway variables --set RESEND_API_KEY="re_xxx" --set EMAIL_FROM="noreply@beta.church"
railway variables --set R2_ACCOUNT_ID="xxx" --set R2_ACCESS_KEY_ID="xxx" \
  --set R2_SECRET_ACCESS_KEY="xxx" --set R2_BUCKET_NAME="contagie-media" \
  --set R2_PUBLIC_URL="https://pub-xxx.r2.dev"
```

> ⚠️ **Nunca commite `.env`**. Use `.env.example` apenas como referência.
> ⚠️ Os valores de `SETTINGS_ENCRYPTION_KEY` e `EMAIL_TOKEN_SECRET` em produção **NÃO podem ser regenerados depois** sem migração de dados encriptados.

### 2.3 Build & start command

`package.json` já configurado:
- Build: `npm run build`
- Start: `npm run start` (Railway detecta automaticamente o Next.js)

Adicione no painel Railway → Settings → **Deploy → Pre-deploy command**:
```bash
npx prisma migrate deploy && npx prisma generate
```

### 2.4 Domínio customizado

Se for usar `contagie.beta.church`:
1. Painel Railway → Settings → Networking → Custom Domain → adicionar.
2. Criar registro `CNAME` apontando para o domínio Railway.
3. Aguardar emissão automática do certificado TLS (Let's Encrypt).
4. Atualizar `NEXTAUTH_URL` para o domínio final.

---

## 3. Deploy regular (CI/CD via GitHub)

Railway está configurado para auto-deploy do branch `main`:

```bash
# Fluxo padrão (após mudanças)
git add -A
git commit -m "feat: ..."
git push  # auto-dispara deploy no Railway
```

Acompanhar:
```bash
railway logs           # logs em tempo real
railway status         # status do último deploy
```

### Rollback rápido

No painel Railway → **Deployments → escolha deploy anterior → Redeploy**.
CLI:
```bash
railway down           # cancela deploy em andamento
# Para voltar a um commit anterior, fazer git revert e push novo (preserva histórico)
git revert HEAD --no-edit && git push
```

---

## 4. Migrations de banco

> **Toda nova migration precisa ser commitada antes do deploy.**

### Localmente:
```bash
# 1. Editar prisma/schema.prisma
# 2. Gerar migration
npx prisma migrate dev --name descricao_da_mudanca

# 3. Verificar SQL gerado em prisma/migrations/<timestamp>_descricao_da_mudanca/migration.sql
# 4. Commit junto com o código
git add prisma/migrations prisma/schema.prisma
git commit -m "feat(schema): ..."
git push
```

Railway aplica `prisma migrate deploy` automaticamente no pre-deploy hook.

### Hotfix de schema sem rollback de dados

Se a migration falhar em produção:
1. Painel Railway → Database → Connect → executar SQL manual via `psql`.
2. Marcar migration como aplicada: `INSERT INTO _prisma_migrations ...` (consultar Prisma docs).
3. **Nunca** deletar migrations já aplicadas em produção.

---

## 5. Cron Jobs

Duas rotas de cron precisam ser disparadas:

| Endpoint | Frequência | Descrição |
|---|---|---|
| `GET /api/cron/reminders` | Toda hora | Lembretes 1h antes de eventos |
| `GET /api/cron/reminders-24h` | Diário 09:00 BRT | Lembretes 24h antes |

Ambos exigem header `x-cron-secret: $CRON_SECRET`.

### Setup no Railway

Painel → **Cron** (ou via railway.json):

```json
{
  "$schema": "https://schema.up.railway.app/railway.schema.json",
  "deploy": {
    "startCommand": "npm run start"
  },
  "crons": [
    {
      "name": "reminders-hourly",
      "schedule": "0 * * * *",
      "command": "curl -fsS -H \"x-cron-secret: $CRON_SECRET\" https://contagie.beta.church/api/cron/reminders"
    },
    {
      "name": "reminders-daily",
      "schedule": "0 12 * * *",
      "command": "curl -fsS -H \"x-cron-secret: $CRON_SECRET\" https://contagie.beta.church/api/cron/reminders-24h"
    }
  ]
}
```

> Cron Railway roda em UTC. `0 12 * * *` = 09:00 horário de Brasília (BRT, UTC-3).

---

## 6. Verificação pós-deploy (smoke test)

Executar após cada deploy em produção:

```bash
DOMAIN="https://contagie.beta.church"

# 1. Healthcheck
curl -fsS -o /dev/null -w "session: %{http_code}\n" $DOMAIN/api/auth/session

# 2. Login renderiza
curl -fsS -o /dev/null -w "login: %{http_code}\n" $DOMAIN/login

# 3. Headers de segurança
curl -sI $DOMAIN/login | grep -iE "x-frame|x-content|strict-transport|referrer-policy|permissions-policy"

# 4. Cron secret está exigindo (deve dar 401 sem header)
curl -fsS -o /dev/null -w "cron sem secret: %{http_code}\n" $DOMAIN/api/cron/reminders
# Esperado: 401

# 5. Logs sem erro nos últimos 5min
railway logs | tail -50
```

Se algum passo falhar → **rollback imediato** e investigar.

---

## 7. Backup do banco

Railway faz **snapshot automático** do Postgres a cada 24h (retenção 7 dias no plano Hobby, 30 dias no Pro).

Backup manual (recomendado antes de migrations grandes):
```bash
# Via railway CLI
railway run -- pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M).sql

# Restaurar
railway run -- psql $DATABASE_URL < backup-2026-05-08-1430.sql
```

---

## 8. Observabilidade

- **Logs**: `railway logs` ou painel Railway → Deployments.
- **Métricas**: painel Railway → Metrics (CPU, memória, network, DB connections).
- **Erros de aplicação**: hoje os `console.error` aparecem nos logs Railway. Para produção sustentável, considerar integrar **Sentry** (free tier resolve para o porte).

Para Sentry no futuro:
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
# Adicionar SENTRY_DSN aos env vars no Railway
```

---

## 9. Custos esperados

| Item | Custo mensal |
|---|---|
| Railway Hobby (compute) | $5 base + ~$5-10 uso |
| Railway Postgres | ~$5-8 |
| Cloudflare R2 (10GB) | ~$0.15 |
| Resend (3k emails/mês) | $0 (free tier) |
| Domínio | ~$1 (~$12/ano) |
| **Total** | **~$15-25/mês** |

Acima de 50GB de mídia ou >100k requests/dia, revisar plano.

---

## 10. Checklist final antes do go-live

- [ ] Todas as variáveis de ambiente configuradas no Railway
- [ ] `NEXTAUTH_URL` aponta para o domínio final (não Railway URL temporário)
- [ ] Domínio custom propagado e TLS válido
- [ ] `npx prisma migrate deploy` rodou sem erro
- [ ] Smoke test (seção 6) todos verdes
- [ ] Crons configurados e disparando (verificar logs após primeira execução)
- [ ] R2 bucket público configurado e acessível em `R2_PUBLIC_URL`
- [ ] Resend domínio verificado (`From` autorizado)
- [ ] Backup manual do banco antes do go-live
- [ ] Pelo menos um usuário ADMIN criado e logado com sucesso
- [ ] Headers de segurança presentes (`curl -sI`)
- [ ] `npm audit` sem high/critical (ou justificado)
- [ ] Pre-push test agent aprovou (ou hotfix declarado)
- [ ] Security audit aprovou (ou hotfix declarado)
- [ ] **Autorização explícita do usuário registrada**

---

## Apêndice A — Comandos úteis

```bash
# Ver todas as variáveis (mascaradas)
railway variables

# Conectar ao banco de produção
railway connect postgres

# Rodar comando arbitrário no contexto do projeto
railway run -- node -e "console.log(process.env.NODE_ENV)"

# Reiniciar serviço sem novo deploy
railway redeploy

# Ver IDs e URLs
railway status

# Mudar para outro ambiente (staging/prod)
railway environment
```

## Apêndice B — Troubleshooting

**Build falha em `npx prisma generate`**:
- Confirmar `postinstall` no `package.json` ou rodar manualmente em pre-deploy.
- Verificar `DATABASE_URL` setada na fase de build (Railway expõe automaticamente).

**500 ao salvar presença / `Cannot read properties of undefined`**:
- Cliente Prisma desatualizado. Forçar redeploy ou rodar `npx prisma generate` no pre-deploy.

**Datas com 1 dia de diferença**:
- Verificar `TZ=America/Sao_Paulo` está setado.
- Rodar auditoria de timezone (já fizemos uma vez, ver `src/lib/date-utils.ts`).

**Email não envia**:
- Verificar domínio do `EMAIL_FROM` está verificado no Resend.
- Conferir `RESEND_API_KEY` válida.

**`x-cron-secret` rejeitado**:
- Confirmar que `CRON_SECRET` está setado **e** que a chamada do cron envia o mesmo valor.
- Conferir que não há fallback `undefined` (regra de segurança aplicada — sem `CRON_SECRET` o servidor lança no startup).
