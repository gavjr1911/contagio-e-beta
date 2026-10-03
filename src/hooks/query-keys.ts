/**
 * Chaves de cache do React Query, em um módulo próprio.
 *
 * Ficavam cada uma no seu hook, mas `use-event-checklist` já importa
 * `eventKeys` de `use-events`; para `use-events` invalidar o checklist depois
 * de salvar um evento seria preciso o import de volta — ciclo. Aqui as duas
 * ficam no mesmo lugar e ninguém importa ninguém.
 *
 * Os hooks continuam reexportando as chaves, então quem já importava delas
 * segue funcionando.
 */

export interface EventQueryFilters {
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: (filters?: unknown) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, "detail"] as const,
  /**
   * ATENÇÃO: `id` aqui é o que veio da URL — normalmente o SLUG do evento, não
   * o cuid. A API aceita os dois (`resolveEventId`), mas como chave de cache
   * eles são strings diferentes e NÃO colidem. Por isso invalidações pós-
   * mutação usam o prefixo `details()`, nunca `detail(<cuid devolvido pela
   * API>)`: era exatamente essa divergência que deixava a tela do evento
   * mostrando dado velho depois de salvar.
   */
  detail: (id: string) => [...eventKeys.details(), id] as const,
  calendar: (month: number, year: number) =>
    [...eventKeys.all, "calendar", month, year] as const,
};

export const eventChecklistKeys = {
  all: ["eventChecklist"] as const,
  lists: () => [...eventChecklistKeys.all, "list"] as const,
  list: (eventId: string) => [...eventChecklistKeys.lists(), eventId] as const,
};
