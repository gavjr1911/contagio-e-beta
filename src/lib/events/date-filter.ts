/**
 * Filtros de data para a listagem de eventos (`GET /api/events`).
 *
 * Regras do modelo de datas deste projeto (ver `src/lib/date-utils.ts`):
 * - `Event.date` é `@db.Date` e volta do banco à MEIA-NOITE UTC do dia.
 * - As strings "YYYY-MM-DD" da query são parseadas por `parseLocalDate`, que
 *   ancora ao MEIO-DIA UTC. Comparar meia-noite com meio-dia descartaria os
 *   eventos do próprio dia do `startDate`, por isso normalizamos aqui.
 */

import {
  addDays,
  endOfDay,
  formatDateToISO,
  getTodayLocal,
  startOfDay,
} from "@/lib/date-utils";

export interface EventDateFilter {
  gte?: Date;
  lte?: Date;
}

/**
 * Monta UM único objeto de filtro para a coluna `date`.
 *
 * ⚠️ Não espalhe `{ date: { gte } }` e `{ date: { lte } }` no mesmo objeto
 * literal: a segunda chave sobrescreve a primeira e o `gte` some silenciosamente
 * (foi exatamente esse o bug que fazia a home listar eventos já passados).
 */
export function buildEventDateFilter(
  startDate?: Date,
  endDate?: Date,
): EventDateFilter | undefined {
  if (!startDate && !endDate) return undefined;

  return {
    // Início do dia: um evento que acontece HOJE entra em `startDate = hoje`.
    ...(startDate && { gte: startOfDay(startDate) }),
    // Fim do dia: um evento no próprio `endDate` continua incluído.
    ...(endDate && { lte: endOfDay(endDate) }),
  };
}

/**
 * Janela "próximos eventos" da home: de hoje (inclusive) até hoje + `days`.
 * Retorna strings "YYYY-MM-DD" prontas para a query string da API.
 */
export function getUpcomingEventsRange(
  days = 30,
  today: Date = getTodayLocal(),
): { startDate: string; endDate: string } {
  return {
    startDate: formatDateToISO(today),
    endDate: formatDateToISO(addDays(today, days)),
  };
}
