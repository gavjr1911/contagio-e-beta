# Deploy — Contagie Beta

Plataforma de produção: **Railway** (Postgres gerenciado + Web Service).
Storage de mídia: **Cloudflare R2** (independente).
Email transacional: **Resend** (independente).
Domínio de produção: **`https://contagie.igrejabeta.com.br`** (`NEXTAUTH_URL`). Mídia servida por `R2_PUBLIC_URL`.

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
4. **Add Service** para o cron de lembretes (serviço separado com imagem `curlimages/curl:latest` — ver seção 5).

### 2.2 Variáveis de ambiente

Configure no Railway via `railway variables` ou painel. **Todas obrigatórias:**

```bash
# Banco — Railway injeta automaticamente quando o serviço Postgres está linkado:
#   DATABASE_URL — não precisa setar manualmente.

# NextAuth
NEXTAUTH_URL=https://contagie.igrejabeta.com.br    # domínio público de produção
NEXTAUTH_SECRET=$(openssl rand -base64 32)         # 32+ chars random

# URL pública usada em links de e-mail (cai para NEXTAUTH_URL se ausente)
NEXT_PUBLIC_APP_URL=https://contagie.igrejabeta.com.br

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@beta.church
RESEND_FROM_EMAIL="Beta Church <noreply@beta.church>"  # remetente exibido; também editável em Configurações

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

# Permissões por ação — rollout faseado ("off" = padrão, comportamento por nível)
PERMISSIONS_ACTION_ENFORCEMENT=off
```

> O serviço de **cron** tem variáveis próprias (`CRON_SECRET` e `TARGET_URL`) e **não** herda as do web — ver seção 5.

Aplicação prática via CLI (executar no diretório do projeto, com `railway link` feito):
```bash
railway variables --set NEXTAUTH_URL="https://contagie.igrejabeta.com.br" \
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

O domínio de produção em uso é **`contagie.igrejabeta.com.br`**.

1. Painel Railway → Settings → Networking → Custom Domain → adicionar.
2. Criar registro `CNAME` apontando para o domínio Railway.
3. Aguardar emissão automática do certificado TLS (Let's Encrypt).
4. Atualizar `NEXTAUTH_URL` (e `NEXT_PUBLIC_APP_URL`) para o domínio final.
5. Atualizar `TARGET_URL` do serviço de cron **e redeployá-lo** (seção 5).

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

Existe **uma única rota de cron** em produção:

| Endpoint | Frequência | Descrição |
|---|---|---|
| `GET /api/cron/reminders` | `0 12 * * *` (diário, 09:00 BRT) | Lembretes de escala em D-7, D-3 e D-1 |

A rota exige header `x-cron-secret: $CRON_SECRET` (ou `Authorization: Bearer $CRON_SECRET`). A lista de dias vem de `REMINDER_DAYS_BEFORE = [7, 3, 1]` em `src/lib/email/send.ts` — **não existe lembrete "1h antes"**.

> ⚠️ **Este cron é diário, e só diário.** Cada execução envia e-mails reais para todos os voluntários escalados em D-7/D-3/D-1. Rodá-lo de hora em hora enviaria **24 e-mails por voluntário por dia**.

> A rota `GET /api/cron/reminders-24h` **não existe mais** (foi removida do código: era redundante com o caso D-1 da rota principal, e provisionar um cron para ela duplicaria todo lembrete de véspera). Não recrie.

### Como o cron está provisionado no Railway

O cron **não** é configurado por uma chave `crons` no `railway.json` (o `railway.json` deste repo não tem essa chave e descreve apenas o serviço **web**). A realidade é um **serviço separado** dentro do projeto `contagie-beta`:

| Item | Valor |
|---|---|
| Nome do serviço | `cron-reminders-hourly` (nome legado e enganoso — ver aviso abaixo) |
| Imagem | `curlimages/curl:latest` |
| Start command | `sh -c 'curl -fsS -H "x-cron-secret: $CRON_SECRET" "$TARGET_URL"'` — deve ganhar `--max-time` (ver "Regras do start command") |
| Variáveis do serviço | `CRON_SECRET`, `TARGET_URL` (= `https://contagie.igrejabeta.com.br/api/cron/reminders`) |
| Schedule | `0 12 * * *`, configurado no painel do próprio serviço (Settings → Cron Schedule) |
| Restart policy | **sem restart** (não `ON_FAILURE`) |

> ⚠️ **O nome do serviço não é fonte de verdade sobre a frequência.** `cron-reminders-hourly` é herança de quando se acreditava num cron horário; o job é **diário**. O nome será corrigido — até lá, confie no schedule do painel, não no nome.

### ⚠️ Alterar variáveis do serviço de cron exige redeploy

**O Railway congela o snapshot de variáveis no momento do deploy.** Definir ou alterar `TARGET_URL` / `CRON_SECRET` no painel **não tem efeito** nas execuções seguintes até que o serviço de cron seja **redeployado**.

Foi exatamente isso que quebrou o cron por mais de 30 dias: `TARGET_URL` chegava **vazia** ao container, o `curl` falhava com erro de sintaxe e **nenhum lembrete foi enviado** — sem alarme visível.

Procedimento correto ao mexer em variável do serviço de cron:
1. Alterar a variável no painel do serviço `cron-reminders-*`.
2. **Redeploy do serviço de cron** (Deployments → Redeploy).
3. Conferir nos logs da execução seguinte que a URL chamada está correta e o `curl` saiu com código 0.

### Regras do start command

- **Sempre `--max-time`.** Sem timeout, uma requisição pendurada prende o container até o Railway matá-lo. A rota tem `maxDuration = 60`, então algo como `--max-time 55` é coerente.
- **Nunca `--retry`.** Retry cego numa rota de envio de e-mail duplica mensagens para os voluntários.
- **Restart policy do serviço de cron = sem restart.** Com restart em falha, um erro *depois* de um envio parcial reinicia o container e **reenvia tudo**.
  > O `"restartPolicyType": "ON_FAILURE"` presente no `railway.json` vale para o serviço **web** (onde reiniciar é desejável) — **não** para o serviço de cron. Essa distinção já causou confusão; não copie a política do web para o cron.

> Cron Railway roda em UTC. `0 12 * * *` = 09:00 horário de Brasília (BRT, UTC-3).

---

## 6. Verificação pós-deploy (smoke test)

Executar após cada deploy em produção:

> 🚨 **NUNCA chame `/api/cron/reminders` com o `CRON_SECRET` válido durante um smoke test.** Essa chamada **dispara e-mails reais** para os voluntários escalados em D-7/D-3/D-1. Os testes abaixo verificam apenas que a rota **rejeita** quem não tem o segredo.

```bash
DOMAIN="https://contagie.igrejabeta.com.br"

# 1. Healthcheck
curl -fsS -o /dev/null -w "session: %{http_code}\n" $DOMAIN/api/auth/session

# 2. Login renderiza
curl -fsS -o /dev/null -w "login: %{http_code}\n" $DOMAIN/login

# 3. Headers de segurança
curl -sI $DOMAIN/login | grep -iE "x-frame|x-content|strict-transport|referrer-policy|permissions-policy"

# 4. Cron secret está exigindo (deve dar 401 sem header)
curl -s -o /dev/null -w "cron sem secret: %{http_code}\n" $DOMAIN/api/cron/reminders
# Esperado: 401

# 5. Header de provedor forjável NÃO autoriza (regressão de segurança já explorada)
curl -s -o /dev/null -H "x-vercel-cron: true" \
  -w "cron com x-vercel-cron: %{http_code}\n" $DOMAIN/api/cron/reminders
# Esperado: 401 — o projeto não roda na Vercel e qualquer cliente pode forjar
# esse header; se voltar 200, o disparo em massa de e-mails está público.

# 6. Segredo errado também é rejeitado
curl -s -o /dev/null -H "x-cron-secret: valor-invalido" \
  -w "cron com secret errado: %{http_code}\n" $DOMAIN/api/cron/reminders
# Esperado: 401

# 7. Logs sem erro nos últimos 5min
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
- [ ] Serviço de cron configurado: `TARGET_URL` com o domínio de produção, `CRON_SECRET` igual ao do web, schedule `0 12 * * *`, restart policy **sem restart**, `--max-time` no comando e **sem `--retry`**
- [ ] Serviço de cron **redeployado após a última alteração de variável** (o snapshot só atualiza no deploy)
- [ ] Cron disparando de fato (conferir logs da primeira execução: URL chamada correta e saída do `curl` com código 0)
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
- O `CRON_SECRET` é variável **de dois serviços** (web e cron) — alterar num e esquecer o outro quebra o disparo.
- Conferir que não há fallback `undefined` (regra de segurança aplicada — sem `CRON_SECRET` o servidor lança no startup).

**Lembretes pararam de ser enviados (sem erro visível)**:
- Causa já observada em produção: `TARGET_URL` chegando **vazia** ao container do cron, porque a variável foi definida no painel mas o serviço **não foi redeployado** — o `curl` falha com erro de sintaxe de URL e nada é enviado. Redeploy do serviço de cron resolve.
- Conferir nos logs do serviço de cron a URL efetivamente chamada e o código de saída do `curl`.
- Conferir em **Configurações** o resultado da última execução (`last_reminder_run`) — a tela alerta quando houve falhas parciais.

**Voluntários receberam lembretes duplicados**:
- Verificar se há `--retry` no comando do cron (remover) ou restart policy diferente de "sem restart" no serviço de cron (corrigir).
- Verificar se não foi recriado um segundo cron/rota redundante (ex.: a extinta `reminders-24h`).
