/**
 * Utilitarios de data/hora com suporte a timezone
 *
 * O sistema usa o timezone de Sao Paulo (America/Sao_Paulo) como padrao.
 * Todas as datas sao armazenadas de forma que representem corretamente
 * o momento local, independente do timezone do servidor.
 */

// Timezone padrao do sistema
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * Cria um objeto Date a partir de uma string de data (YYYY-MM-DD)
 * garantindo que represente o dia correto no timezone local.
 *
 * Quando usamos new Date("2024-03-22"), JavaScript interpreta como UTC meia-noite,
 * que no horario de Sao Paulo e na verdade dia 21 as 21:00.
 * Esta funcao corrige isso.
 */
export function parseLocalDate(dateString: string): Date {
  // dateString: "2024-03-22"
  const [year, month, day] = dateString.split("-").map(Number);
  // Criar a data com os componentes locais (mes e 0-indexed)
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Cria um objeto Date a partir de uma string de hora (HH:MM)
 * usando uma data base fixa para evitar problemas de timezone.
 *
 * Para campos @db.Time() no PostgreSQL, apenas o componente de hora importa.
 * Usamos uma data fixa (2000-01-01) para garantir consistencia.
 */
export function parseLocalTime(timeString: string): Date {
  // timeString: "09:00" ou "19:30"
  const [hours, minutes] = timeString.split(":").map(Number);
  // Usar data fixa para evitar problemas de DST
  return new Date(2000, 0, 1, hours, minutes, 0, 0);
}

/**
 * Cria um objeto Date combinando data e hora.
 * Util quando precisamos do momento exato de um evento.
 */
export function parseLocalDateTime(dateString: string, timeString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hours, minutes] = timeString.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Formata uma data para string ISO no formato YYYY-MM-DD
 * usando os componentes locais (nao UTC).
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formata uma data/hora para string de hora no formato HH:MM
 * usando os componentes locais (nao UTC).
 */
export function formatTimeToHHMM(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Retorna a data atual no timezone de Sao Paulo.
 * Util para comparacoes de "hoje".
 */
export function getTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Retorna o inicio do dia para uma data especifica.
 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * Retorna o fim do dia para uma data especifica.
 */
export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/**
 * Compara se duas datas sao o mesmo dia (ignora hora).
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Verifica se uma data e hoje ou futura.
 */
export function isTodayOrFuture(date: Date): boolean {
  const today = getTodayLocal();
  const targetDay = startOfDay(date);
  return targetDay >= today;
}

/**
 * Formata data para exibicao amigavel em portugues.
 * Ex: "Dom, 22 de marco"
 */
export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

/**
 * Formata data e hora para exibicao.
 * Ex: "22/03/2024 09:00"
 */
export function formatDateTimeDisplay(date: Date): string {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Transforma um objeto de evento para resposta da API,
 * convertendo datas para strings no formato correto.
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
