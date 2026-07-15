/**
 * Utilitários de data/hora — modelo "wall-clock ancorado em UTC".
 *
 * Os campos `@db.Date` (date, recurrenceEndDate) e `@db.Time` (startTime,
 * endTime) do PostgreSQL representam APENAS um dia-do-calendário ou uma
 * hora-do-relógio — não um instante com fuso. Para que o valor sobreviva a
 * qualquer fuso de servidor e ao horário de verão, tratamos esses valores
 * SEMPRE em UTC: gravamos com `Date.UTC(...)` e lemos com `getUTC*()`.
 *
 * ⚠️ Regra de ouro: NUNCA use `getHours()/getDate()/getFullYear()` (locais)
 * para ler `@db.Time`/`@db.Date`. Use os getters UTC (getUTCHours, etc.) ou
 * as funções deste módulo. Getters locais reintroduzem o bug de -1h/-1dia.
 *
 * Datas usam âncora meio-dia UTC (12:00Z) — assim, mesmo lidas por engano com
 * getters locais em São Paulo (UTC-3 → 09:00), continuam no dia certo, e a
 * aritmética de recorrência (setDate local) não cruza a fronteira do dia.
 */

// Timezone de exibição do sistema (para instantes reais, ex.: createdAt)
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * "YYYY-MM-DD" -> Date ancorado ao meio-dia UTC do dia informado.
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

/**
 * "HH:MM" -> Date ancorado em 1970-01-01 UTC com a hora informada.
 * Para @db.Time só a hora-do-relógio importa; a âncora em UTC a torna
 * imune a fuso/DST no round-trip com o banco.
 */
export function parseLocalTime(timeString: string): Date {
  const [hours, minutes] = timeString.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
}

/**
 * Combina data e hora num Date ancorado em UTC.
 */
export function parseLocalDateTime(dateString: string, timeString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hours, minutes] = timeString.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
}

/**
 * Date -> "YYYY-MM-DD" (componentes UTC).
 */
export function formatDateToISO(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Date -> "HH:MM" (componentes UTC).
 */
export function formatTimeToHHMM(date: Date): string {
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Início do dia (00:00 UTC) do dia-calendário representado pelo Date (em UTC).
 */
export function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
}

/**
 * Fim do dia (23:59:59.999 UTC) do dia-calendário representado pelo Date.
 */
export function endOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
}

/**
 * Data de "hoje" no calendário de São Paulo, ancorada à meia-noite UTC.
 * Serve para comparar com colunas @db.Date (gravadas à meia-noite UTC):
 * eventos de hoje satisfazem `date >= getTodayLocal()`.
 */
export function getTodayLocal(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = parts.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Compara se dois Date representam o mesmo dia-calendário (em UTC).
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

/**
 * Verifica se uma data é hoje ou futura (comparação por dia-calendário).
 */
export function isTodayOrFuture(date: Date): boolean {
  return startOfDay(date).getTime() >= getTodayLocal().getTime();
}

/**
 * Converte um valor de data para Date representando o dia-calendário correto.
 * - "YYYY-MM-DD"  -> parseLocalDate (meio-dia UTC)
 * - ISO / Date    -> retorna o Date direto (instante já resolvido pelo backend)
 */
export function toLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseLocalDate(value);
  }
  return new Date(value);
}

/**
 * Data por extenso em pt-BR para um valor date-only (@db.Date ou "YYYY-MM-DD").
 * Ex.: "sábado, 16 de agosto de 2026". Lida em UTC (a âncora dos valores).
 */
export function formatEventDateLongPtBR(value: string | Date): string {
  const date = toLocalDate(value);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Formata um valor date-only para exibição curta em pt-BR.
 * Ex.: "sáb, 16 de agosto". Lida em UTC.
 */
export function formatDateDisplay(value: string | Date): string {
  const date = toLocalDate(value);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Formata um INSTANTE real (ex.: createdAt) para data+hora em São Paulo.
 * Use apenas com timestamps completos — não com @db.Date/@db.Time.
 */
export function formatDateTimeDisplay(date: Date): string {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DEFAULT_TIMEZONE,
  });
}

/**
 * Transforma um objeto de evento para resposta da API, convertendo os campos
 * de data/hora para strings ("YYYY-MM-DD" / "HH:MM") lidas em UTC.
 */
export function transformEventForResponse<T extends {
  date: Date;
  startTime: Date;
  endTime?: Date | null;
  recurrenceEndDate?: Date | null;
}>(event: T): Omit<T, 'date' | 'startTime' | 'endTime' | 'recurrenceEndDate'> & {
  date: string;
  startTime: string;
  endTime: string | null;
  recurrenceEndDate: string | null;
} {
  return {
    ...event,
    date: formatDateToISO(event.date),
    startTime: formatTimeToHHMM(event.startTime),
    endTime: event.endTime ? formatTimeToHHMM(event.endTime) : null,
    recurrenceEndDate: event.recurrenceEndDate ? formatDateToISO(event.recurrenceEndDate) : null,
  };
}
