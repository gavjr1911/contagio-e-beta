<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deploy

Plataforma: **Railway** (web + Postgres). Storage: Cloudflare R2. Email: Resend.

**Antes de qualquer ação que afete produção** (`railway up`, `git push` em `main`, migrations em prod, mudanças em variáveis sensíveis):

1. **Leia primeiro** `docs/DEPLOY.md` deste repositório — é a fonte da verdade do procedimento.
2. Cumpra as gates obrigatórias (`~/.claude/CLAUDE.md`):
   - `pre-push-test-engineer` (testes + typecheck) — pular só se o usuário disser "hotfix".
   - `security-sentinel` (auditoria) — pular só se "hotfix".
   - **Autorização explícita do usuário** ("Posso prosseguir com o deploy em producao?") — sempre obrigatória, nunca pular.
3. Após o deploy, executar smoke test da seção 6 de `docs/DEPLOY.md` e relatar resultado.

Se `docs/DEPLOY.md` divergir das regras globais em `~/.claude/CLAUDE.md`, as globais prevalecem em conflitos sobre autorização e gates.
