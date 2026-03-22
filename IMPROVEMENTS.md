# Melhorias Identificadas - Contagio e Beta

## Status Geral
- **Data**: 2026-03-22
- **Cobertura de Testes**: 0%
- **Vulnerabilidades**: 13 identificadas (3 CRITICAS)

---

## ETAPA 1: Melhorias de Codigo (PRIORIDADE ALTA)

### 1.1 Refatorar APIs para usar api-utils
**Problema**: APIs nao usam utilitarios padronizados (withAuth, withRole, apiSuccess, apiError)
**Arquivos afetados**:
- [ ] `src/app/api/events/[id]/items/route.ts`
- [ ] `src/app/api/events/[id]/items/[itemId]/route.ts`
- [ ] `src/app/api/events/[id]/items/[itemId]/songs/route.ts`
- [ ] `src/app/api/events/[id]/items/reorder/route.ts`

**Beneficio**: Elimina ~50 linhas duplicadas de auth/validation

### 1.2 Corrigir Schema Prisma
**Problema**: `@@unique([eventId, order])` nao permite multiplos blocos por evento
**Arquivo**: `prisma/schema.prisma`
**Correcao**: Mudar para `@@unique([eventId, eventItemId, order])`

### 1.3 Extrair Include Patterns
**Problema**: Includes duplicados em varias APIs
**Criar**: `src/lib/prisma-includes.ts`
```typescript
export const eventItemIncludes = {
  assignedUser: { select: { id: true, name: true, image: true } },
  setlistItems: {
    include: { song: true },
    orderBy: { order: 'asc' }
  }
}
```

### 1.4 Adicionar Memoizacao
**Problema**: SortableItem causa re-renders desnecessarios
**Arquivo**: `src/components/events/order-of-service-editor.tsx`
**Correcao**: Usar React.memo() no SortableItem

### 1.5 Otimizar Reordering
**Problema**: N updates individuais no reorder
**Arquivo**: `src/app/api/events/[id]/items/reorder/route.ts`
**Correcao**: Usar transacao unica com raw SQL ou Promise.all

### 1.6 Configurar StaleTime
**Problema**: Queries refazem fetch a cada render
**Arquivo**: `src/hooks/use-event-items.ts`
**Correcao**: Adicionar `staleTime: 30 * 1000`

### 1.7 Conditional Query nos Selectors
**Problema**: UserSelector e SongSelector fazem query mesmo com modal fechado
**Arquivo**: `src/components/events/order-of-service-editor.tsx`
**Correcao**: Passar `enabled: isOpen` nas queries

---

## ETAPA 2: Seguranca (CRITICO - FAZER ANTES DE PRODUCAO)

### 2.1 IDOR - Insecure Direct Object Reference
**Severidade**: CRITICA
**Problema**: APIs nao verificam ownership dos recursos
**Arquivos afetados**:
- `src/app/api/events/[id]/items/route.ts`
- `src/app/api/events/[id]/items/[itemId]/route.ts`
- `src/app/api/events/[id]/items/[itemId]/songs/route.ts`
- `src/app/api/events/[id]/items/reorder/route.ts`

**Correcao**: Verificar se usuario tem acesso ao evento antes de qualquer operacao

### 2.2 Rate Limiting
**Severidade**: CRITICA
**Problema**: Nenhum rate limiting nas APIs
**Correcao**: Implementar rate limiting (upstash/ratelimit ou similar)

### 2.3 CSRF Protection
**Severidade**: CRITICA
**Problema**: Nenhuma protecao CSRF em operacoes POST/PATCH/DELETE
**Correcao**: Implementar tokens CSRF ou usar SameSite cookies

### 2.4 Input Validation
**Severidade**: ALTA
**Problema**: Validacao incompleta em algumas APIs
**Correcao**: Adicionar Zod schemas para todos os endpoints

### 2.5 Error Leaking
**Severidade**: MEDIA
**Problema**: Alguns erros expoe stack traces
**Correcao**: Sanitizar mensagens de erro em producao

---

## ETAPA 3: Testes (IMPORTANTE)

### 3.1 Configurar Infraestrutura
- [ ] Configurar Jest/Vitest
- [ ] Configurar Testing Library
- [ ] Configurar banco de teste
- [ ] Criar test utils

### 3.2 Testes de API
**Cenarios identificados**: 50+
- Event Items CRUD
- Songs per block management
- Reorder operations
- Auth/Authorization

### 3.3 Testes de Componentes
**Cenarios identificados**: 40+
- OrderOfServiceEditor
- SongSelector
- UserSelector
- Drag and drop

### 3.4 Testes E2E
**Cenarios identificados**: 20+
- Fluxo completo de ordem de culto
- Escalas automaticas
- Eventos recorrentes

---

## Ordem de Execucao Recomendada

1. **AGORA**: Etapa 1 - Melhorias de Codigo
2. **ANTES DE PRODUCAO**: Etapa 2 - Seguranca
3. **CONTINUO**: Etapa 3 - Testes

---

## Metricas de Sucesso

- [ ] 0 erros de TypeScript
- [ ] < 20% duplicacao de codigo
- [ ] 0 vulnerabilidades criticas
- [ ] > 80% cobertura de testes
- [ ] Build passando sem warnings
