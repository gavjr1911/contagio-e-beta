# Plano de Execução — Permissões por ação (ver/criar/editar/excluir)

> Status: **decisões fechadas** (ver §10). Pronto para implementar a partir da
> Fase 0a. Criado a partir de auditoria + crítica adversarial (advisor).

## 0. Decisões fechadas (dono do produto, com auditoria de prod)
- Modelo: **ver/criar/editar/excluir** por feature (líder e membro). ADMIN = super-usuário global (1 pessoa).
- Estratégia de compat do advisor adotada: aceitar 2 formas no Zod+resolver, camada de achatamento no cliente, **feature flag** de enforcement, migração de dados **curada**, allowlist de ações próprias.
- Fase 1 = **events + orderOfService + schedules**.
- Criar/excluir **usuário e ministério = só ADMIN** (fora da matriz).
- Mapeamento: **matriz curada** (não permissivo cru — a auditoria mostrou que daria exclusão de eventos a ~10 membros do Contagie e ao líder do Louvor).

### Auditoria de produção (3 ministérios)
- Contagie (líder Natália, 10 membros): leader.events/schedules/ordem = edit; **member.events = edit** (perigo).
- Louvor (líder Felipe, 12 membros): leader = edit; member.events = view.
- Técnica (líder Gilson=ADMIN, 9 membros): leader = edit; member.events = view.

### Matriz-alvo curada (Fase 1 — features events/schedules/orderOfService)
| Perfil | events | schedules | orderOfService |
|---|---|---|---|
| Contagie · líder | ver·criar·editar·excluir | ver·criar·editar·excluir | ver·criar·editar·excluir |
| Contagie · membro | ver | ver | ver·editar |
| Louvor · líder | ver | ver·criar·editar | ver·editar |
| Louvor · membro | ver | ver | ver |
| Técnica · líder (admin) | ver·criar·editar·excluir | ver·criar·editar | ver |
| Técnica · membro | ver | ver | ver |

Demais features (songs/media/reports/checklists/templates/ministries): normalizadas
da forma antiga na migração, mas **não enforçadas** na Fase 1 (flag por feature).

### Pendências menores (recomendações; confirmar na fase correspondente)
- Q3 Cerimonial (`withCerimonial`, checklists de evento): resolver na **Fase 2**
  (folder em `checklists` ou manter especial) — fora do escopo da Fase 1.
- Q12 marcar evento COMPLETED (efeito em playCount) fica sob `events:edit` (ok).
- Q5 bands: **Fase 3**.

## 1. Objetivo
- Matriz de ministério com ações independentes por feature: **ver · criar · editar · excluir**.
- Criação/edição/exclusão de eventos (e demais) por **permissão de ministério**, não por role ADMIN.
- **ADMIN** = super-usuário global reservado a 1 pessoa (bypass em tudo).

## 2. Achado crítico
Hoje o `withPermission` só é aplicado em **checklist-templates**. Quase todo o
resto é role-based (ADMIN / ADMIN+LEADER) ou ownership. A matriz é **quase
decorativa** — mas NÃO totalmente (ver F4). Conectar a matriz faz valer valores
que nunca foram curados → risco de **escalada retroativa**.

## 3. Bloqueadores confirmados no código (corrigir antes de qualquer deploy)
- **F1** `src/lib/validations/permissions.ts:4` — `z.enum(["none","view","edit"])` rejeita a forma nova. PATCH/POST de ministério dariam 400.
- **F2** `src/app/(dashboard)/ministerios/[id]/page.tsx:341-345` — editor lê `ministry.permissions` (forma antiga) do banco; UI nova quebra ao abrir ministério legado. Precisa normalizar antigo→novo no carregamento.
- **F3** Cliente indexa `permissions.<feature>`/`meetsLevel` direto (14 call sites): `src/components/layout/sidebar.tsx:97`, `src/app/(dashboard)/dashboard-content.tsx:302`, `src/app/(dashboard)/eventos/[id]/page.tsx:171-180`. Shape novo → menu/botões/telas somem silenciosamente.
- **F4** `src/app/api/events/route.ts:72-73` já usa `hasPermission(permissions,"events","view")` — quebra com shape novo.
- **F5** `src/app/api/events/[id]/route.ts:155-206` — PATCH marca COMPLETED e mexe em `playCount`/`lastPlayedAt` das músicas. "events:edit" concederia esse efeito.
- **F6** `src/lib/permissions/check.ts:41` `hasAnyPermission` quebra → `NoMinistryGuard` (`src/components/layout/no-ministry-guard.tsx:26`) tranca o app para todo não-admin.

## 4. Estratégia (evita big-bang / apagão)
1. **Compat de shape (dupla forma).** `resolver.parseMinistryPermissions` e o Zod
   aceitam AS DUAS formas (string antiga OU objeto de 4 bools). Normaliza antigo→novo.
2. **Cliente sem apagão.** `usePermissions` continua expondo um `PermissionMap`
   "achatado" (nível efetivo derivado do objeto) para os 14 call sites atuais
   seguirem compilando/funcionando; adiciona `useCan(feature, action)` para o
   gating novo, migrado botão-a-botão. Assim cliente e servidor NÃO precisam de
   deploy atômico.
3. **Feature flag** `PERMISSIONS_ACTION_ENFORCEMENT=off|on` (env) — separa
   "deploy do código" de "ligar o enforcement". Rede de segurança sem redeploy.
4. **Auditoria de produção ANTES** de decidir o mapeamento (Q1): dump de
   `Ministry.permissions` de todos os ministérios.
5. **Migração de dados curada** (idempotente): grava a forma nova curada por
   ministério, em vez de depender só de derivação no read (rollback previsível).
6. **Allowlist de ações próprias/ownership** que NUNCA recebem gate de feature
   (confirmar/recusar escala, blocked-dates, users/me/*, mídia do dono, sugestões).

## 5. Camadas / arquivos a alterar
Modelo: `src/lib/permissions/{types,defaults,check,resolver}.ts`,
`src/lib/validations/permissions.ts` (F1), `src/lib/api-utils.ts` (withPermission).
Cliente: `src/hooks/use-permissions.ts`, `src/app/api/users/me/permissions/route.ts`,
`src/components/permissions/permission-matrix-editor.tsx`, e os call sites de F3 +
`src/app/(dashboard)/ministerios/[id]/page.tsx` (F2).
Rotas (reconectar, método→ação) — lista completa no inventário (anexo).

## 6. Fases
- **0a** — Modelo novo + compat (resolver/Zod aceitam duas formas; `/me/permissions`
  ainda emite forma achatada). Matriz nova salvando forma nova. Feature flag OFF.
  Nada de enforcement muda. Deploy seguro.
- **0b** — Migra cliente para `useCan`; mantém achatamento como fallback.
- **1** — Liga enforcement de EVENTS (+ orderOfService?) com create/edit/delete,
  após auditoria + cura de defaults. Flag ON só para essas features.
- **2** — schedules, songs, templates, media, reports, ministries.
- **3** — fecha mutações hoje sem checagem (songs/setlist/bands) usando a allowlist.

## 7. Rollback
Forma nova de JSON é "one-way" na prática: resolver antigo não a entende (cai em
default). Rollback de código ≠ rollback de dados. Mitigar com: (a) manter compat
no resolver por ≥1 release; (b) feature flag para desligar enforcement sem reverter.

## 8. Verificação (sem testes de integração hoje)
- `npm run build` (typecheck pega F3/F4 no servidor e componentes tipados).
- Testes unitários novos do `parseMinistryPermissions` (antigo, novo, corrompido) e `hasPermission` por ação.
- Matriz de verificação manual por perfil: admin / líder Contagie / líder comum /
  membro / sem-ministério / escalado-mas-sem-view.

## 9. Decisões pendentes (dono do produto)
- **Q1** Mapear "edit" antigo → novo: permissivo (criar+editar+excluir) ou conservador (só editar)? Resetar ministérios para default curado? → **depende da auditoria de prod**.
- **Q2** Escopo da Fase 1: só `events` ou `events+orderOfService+schedules`?
- **Q3** Checklist de evento (`withCerimonial`, por NOME de ministério): manter especial ou folder na matriz? (decidir na Fase 0 — hoje há duas verdades cliente/servidor).
- **Q4** `events` é capacidade GLOBAL (não por ministério) — forçado pela arquitetura atual. Aceitar?
- **Q5** Bandas/outras fora do enum: incluir agora ou depois?
- **Q6** Criar/excluir USUÁRIO e MINISTÉRIO: manter só-ADMIN (recomendado)?
- **Q7** Membros podem criar algo, ou só líderes?
- **Q8** Zod aceita as duas formas (união)?  → sim (recomendado).
- **Q9** Normalização antigo→novo no resolver E no loader do editor.
- **Q10** Cliente com camada de achatamento vs reescrita dos 14 call sites → achatamento (recomendado).
- **Q11** Estado real dos `permissions` em prod → rodar auditoria.
- **Q12** `events:edit` pode marcar COMPLETED (efeito em playCount)? Ou ação separada/admin?
- **Q13** Estratégia de rollback de dados (item 7).
