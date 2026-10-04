/**
 * "Evento acontecendo agora" — a janela em que um culto está em curso.
 *
 * Regra do produto: a janela abre 2h ANTES do início e fecha 1h DEPOIS do
 * término. Serve para dois comportamentos:
 *   - o menu ganha um atalho "ACONTECENDO" direto para o evento, para quem
 *     está na igreja não ter de navegar pelo cronograma;
 *   - o checklist do evento já abre pronto para marcação, sem o passo manual
 *     de "Iniciar Checklist".
 *
 * MODELO DE DATAS (regra dura do projeto): `Event.date` é `@db.Date` e
 * `startTime`/`endTime` são `@db.Time` — wall-clock ancorado em UTC, não
 * instantes. Por isso tudo aqui compara contra `getNowLocal()`, que é o agora
 * de São Paulo na mesma régua. Nunca comparar com `new Date()` cru: daria 3h
 * de diferença em produção, abrindo e fechando a janela na hora errada.
 */
import { parseLocalDateTime, getNowLocal } from "@/lib/date-utils";

/** Quanto antes do início a janela abre. */
export const WINDOW_BEFORE_MINUTES = 120;

/** Quanto depois do término a janela fecha. */
export const WINDOW_AFTER_MINUTES = 60;

/**
 * Duração assumida quando o evento não tem `endTime`.
 * Mesmo padrão já usado pelo cálculo de conflito de horário em
 * `src/lib/scheduling/suggestions.ts`.
 */
export const ASSUMED_DURATION_MINUTES = 120;

/**
 * Teto para aceitar `endTime <= startTime` como virada de meia-noite.
 * Acima disso tratamos como dado inválido (ver `getEventWindow`).
 */
export const MAX_OVERNIGHT_DURATION_MINUTES = 6 * 60;

/** O mínimo que precisamos saber de um evento para situá-lo no tempo. */
export interface TimedEvent {
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" */
  startTime: string;
  /** "HH:MM" — opcional; sem ele assumimos `ASSUMED_DURATION_MINUTES`. */
  endTime?: string | null;
  status?: string | null;
}

export interface EventWindow {
  /** Início da janela (wall-clock ancorado em UTC). */
  opensAt: Date;
  /** Fim da janela (wall-clock ancorado em UTC). */
  closesAt: Date;
  /** Horário de início do próprio evento. */
  startsAt: Date;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/**
 * Janela de um evento. Datas/horas inválidas devolvem `null` em vez de lançar —
 * esta função alimenta o menu, que não pode quebrar a navegação inteira por
 * causa de um registro malformado.
 */
export function getEventWindow(event: TimedEvent): EventWindow | null {
  if (!event?.date || !event?.startTime) return null;

  const startsAt = parseLocalDateTime(event.date, event.startTime);
  if (Number.isNaN(startsAt.getTime())) return null;

  let endsAt: Date;
  if (event.endTime) {
    endsAt = parseLocalDateTime(event.date, event.endTime);
    if (Number.isNaN(endsAt.getTime())) {
      endsAt = addMinutes(startsAt, ASSUMED_DURATION_MINUTES);
    } else if (endsAt.getTime() <= startsAt.getTime()) {
      // `endTime` menor ou igual ao início tem duas leituras: evento que
      // atravessa a meia-noite (23:00 → 00:30) ou erro de digitação.
      //
      // Só aceitamos a primeira quando o resultado é uma duração plausível de
      // culto. Sem esse teto, "19:00 → 09:00" (dedo trocado) viraria um evento
      // de 14h: o atalho ACONTECENDO ficaria preso no menu por 17 horas e o
      // checklist se materializaria sozinho pela noite adentro. Como o schema
      // não valida `endTime > startTime`, o erro de digitação é o caso mais
      // provável dos dois — então o desempate é pela duração.
      const cruzandoMeiaNoite = addMinutes(endsAt, 24 * 60);
      const duracaoMin = (cruzandoMeiaNoite.getTime() - startsAt.getTime()) / 60_000;
      endsAt =
        duracaoMin <= MAX_OVERNIGHT_DURATION_MINUTES
          ? cruzandoMeiaNoite
          : addMinutes(startsAt, ASSUMED_DURATION_MINUTES);
    }
  } else {
    endsAt = addMinutes(startsAt, ASSUMED_DURATION_MINUTES);
  }

  return {
    startsAt,
    opensAt: addMinutes(startsAt, -WINDOW_BEFORE_MINUTES),
    closesAt: addMinutes(endsAt, WINDOW_AFTER_MINUTES),
  };
}

/**
 * O evento está acontecendo agora (dentro da janela)?
 *
 * Evento já CONCLUÍDO não conta: foi encerrado de propósito, e manter o atalho
 * "ACONTECENDO" apontando para ele confundiria mais do que ajudaria.
 */
export function isEventHappening(
  event: TimedEvent,
  now: Date = getNowLocal(),
): boolean {
  if (event.status === "COMPLETED") return false;

  const window = getEventWindow(event);
  if (!window) return false;

  const t = now.getTime();
  return t >= window.opensAt.getTime() && t <= window.closesAt.getTime();
}

/**
 * Escolhe QUAL evento mostrar quando há mais de um na janela — caso real nos
 * domingos, em que o culto da manhã ainda está na janela de encerramento
 * enquanto o da noite já entrou na de preparação.
 *
 * Critério: o que já começou e está mais próximo de agora; se nenhum começou,
 * o que começa primeiro. Na prática: durante a manhã mostra o da manhã; quando
 * o da noite começa, ele assume.
 */
export function selectHappeningEvent<T extends TimedEvent>(
  events: T[],
  now: Date = getNowLocal(),
): T | null {
  const inWindow = events.filter((e) => isEventHappening(e, now));
  if (inWindow.length === 0) return null;

  const t = now.getTime();

  const started = inWindow.filter((e) => {
    const w = getEventWindow(e);
    return w !== null && w.startsAt.getTime() <= t;
  });

  const pool = started.length > 0 ? started : inWindow;

  return pool.reduce((best, candidate) => {
    const bestStart = getEventWindow(best)?.startsAt.getTime() ?? 0;
    const candStart = getEventWindow(candidate)?.startsAt.getTime() ?? 0;
    // Entre os já iniciados, o mais recente; entre os futuros, o mais próximo.
    if (started.length > 0) return candStart > bestStart ? candidate : best;
    return candStart < bestStart ? candidate : best;
  });
}
