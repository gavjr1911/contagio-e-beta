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
 * Instante ATUAL expresso como wall-clock de São Paulo, ancorado em UTC.
 *
 * É o `getTodayLocal()` com hora: enquanto aquele responde "que dia é hoje
 * aqui", este responde "que horas são aqui" — na mesma régua usada por
 * `@db.Date` + `@db.Time`.
 *
 * Serve para comparar "agora" com um horário de evento montado por
 * `parseLocalDateTime(date, startTime)`, que também é wall-clock ancorado em
 * UTC. Comparar `new Date()` (instante real) com aquele valor daria 3h de
 * diferença em produção — é a armadilha que o modelo deste projeto existe para
 * evitar. Não use o resultado como instante real: ele não é.
 */
export function getNowLocal(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  // Algumas versões do ICU devolvem "24" à meia-noite.
  const hour = get("hour") % 24;

  return new Date(
    Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"), 0),
  );
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

/**
 * Soma (ou subtrai, com valor negativo) dias a um Date preservando a âncora UTC.
 * Nunca use `setDate()` local para isso — em dias de virada de horário de verão
 * o setter local pode devolver outro dia-calendário.
 */
export function addDays(date: Date, days: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

/**
 * Número de dias do mês (monthIndex 0–11) — calculado em UTC.
 * `Date.UTC(y, m + 1, 0)` é o último dia do mês `m`.
 */
export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Soma (ou subtrai, com valor negativo) meses a um Date preservando a âncora
 * UTC (dia + hora/minuto/segundo/ms são lidos e reescritos com `Date.UTC`).
 *
 * BORDA — política adotada: **clamp** (nunca overflow).
 *   addMonths(2026-01-31, 1) === 2026-02-28   (não 2026-03-03)
 *   addMonths(2026-03-31, 1) === 2026-04-30   (não 2026-05-01)
 *   addMonths(2024-01-31, 1) === 2024-02-29   (ano bissexto)
 * Quando o dia-do-mês de origem não existe no mês de destino, o resultado é o
 * ÚLTIMO dia do mês de destino. Isso difere do `setMonth()` nativo, que
 * transborda para o mês seguinte — e é o comportamento esperado para
 * recorrência mensal de culto (um culto do "dia 31" não deve pular um mês).
 *
 * Nunca use `setMonth()/getMonth()` locais para isso: sobre valores @db.Date
 * (meia-noite UTC), em São Paulo (UTC-3) o dia local é o ANTERIOR, e a
 * aritmética devolve o mês/dia errados.
 */
export function addMonths(date: Date, months: number): Date {
  // Normaliza ano/mês de destino (cuida de virada de ano e de months < 0).
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const year = target.getUTCFullYear();
  const monthIndex = target.getUTCMonth();
  const day = Math.min(date.getUTCDate(), getDaysInMonth(year, monthIndex));

  return new Date(
    Date.UTC(
      year,
      monthIndex,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

/**
 * Compara dois Date apenas pelo dia-calendário (em UTC), ignorando a âncora de
 * hora. Necessário porque valores @db.Date vindos do Prisma chegam à meia-noite
 * UTC enquanto `parseLocalDate()` ancora ao meio-dia UTC — comparar com `>`
 * direto mistura as duas âncoras.
 *
 * @returns negativo se `a` é um dia anterior a `b`, 0 se mesmo dia, positivo se posterior.
 */
export function compareCalendarDays(a: Date, b: Date): number {
  return startOfDay(a).getTime() - startOfDay(b).getTime();
}

/**
 * `true` se `a` é o mesmo dia-calendário que `b` ou anterior (comparação UTC).
 */
export function isOnOrBeforeDay(a: Date, b: Date): boolean {
  return compareCalendarDays(a, b) <= 0;
}

/**
 * Hora-do-relógio (0–23) AGORA no fuso de exibição do sistema (São Paulo).
 * Use para decisões sobre o instante atual (ex.: saudação). Nunca use
 * `new Date().getHours()`, que depende do TZ do processo/navegador.
 */
export function getCurrentHourLocal(now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_TIMEZONE,
    hour: "2-digit",
    hour12: false,
  }).format(now);
  return Number(hour) % 24;
}
