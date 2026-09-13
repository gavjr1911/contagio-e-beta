/**
 * Regra de quem pode CRIAR escala num evento.
 *
 * Existe como modulo proprio porque a mesma regra vale para duas rotas
 * (`POST /api/events/[id]/schedules` e `.../schedules/bulk`) e elas ja
 * divergiram uma vez: a bulk checava o ministerio do LEADER e a individual nao.
 *
 * Essa divergencia deixou de ser cosmetica quando `event-access.ts` passou a
 * conceder permissoes de evento a quem esta escalado nele: um LEADER que se
 * auto-escalasse pela rota individual adquiria, de quebra, o direito de
 * concluir aquele evento e de confirmar escalas de terceiros — em qualquer
 * evento da igreja, nao so nos seus.
 */

/** Papeis que podem criar escala. */
export const SCHEDULE_CREATOR_ROLES = ["ADMIN", "LEADER"] as const

export function canCreateSchedules(role: string | null | undefined): boolean {
  return !!role && (SCHEDULE_CREATOR_ROLES as readonly string[]).includes(role)
}

/**
 * Dos ministerios pedidos, quais o usuario NAO pode usar.
 *
 * - ADMIN nao tem restricao de ministerio.
 * - LEADER so escala nos ministerios que lidera.
 * - Qualquer outro papel nao deveria chegar aqui (`canCreateSchedules` barra
 *   antes); por seguranca, tratamos como se nao pudesse nenhum.
 *
 * @param role papel global do usuario
 * @param requestedMinistryIds ministerios que a requisicao quer usar
 * @param ledMinistryIds ministerios que o usuario lidera (consultados no banco)
 */
export function forbiddenMinistriesForCreator(
  role: string | null | undefined,
  requestedMinistryIds: string[],
  ledMinistryIds: string[]
): string[] {
  if (role === "ADMIN") return []

  const unique = [...new Set(requestedMinistryIds)]
  if (!canCreateSchedules(role)) return unique

  const led = new Set(ledMinistryIds)
  return unique.filter((id) => !led.has(id))
}

/** Mensagem unica para as duas rotas, no singular/plural certo. */
export function forbiddenMinistriesMessage(count: number): string {
  return count === 1
    ? "Você não lidera este ministério"
    : "Você não lidera todos os ministérios indicados"
}
