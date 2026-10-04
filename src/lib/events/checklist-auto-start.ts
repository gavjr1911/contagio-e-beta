/**
 * Decidir se o checklist de um evento deve se materializar SOZINHO ao abrir a
 * aba — sem o passo manual "Iniciar Checklist".
 *
 * Por quê: durante o culto, quem abre a aba quer marcar item, não clicar em
 * "iniciar". Fora da janela do evento o botão manual continua sendo o caminho.
 *
 * Este módulo é só decisão pura (sem React, sem fetch) para poder ser testado
 * sem subir componente — a stack de testes do projeto é `node --test` sobre
 * `src/**\/*.test.ts`, que não renderiza TSX.
 *
 * REGRA DURA: nada aqui recalcula permissão. `canEdit` e `isCompleted` chegam
 * prontos do servidor (`GET /api/events/[id]/checklist`). Foi justamente a
 * divergência UI × servidor que quebrou a marcação dos cultos de 27/09.
 */
import { isEventHappening, type TimedEvent } from "@/lib/events/happening";

/** Mensagem do servidor quando outra pessoa já materializou o checklist. */
const ALREADY_STARTED_PATTERN = /j[aá]\s+foi\s+iniciado/i;

/**
 * O evento como a API o devolve (`transformEventForResponse`): `date` em
 * "YYYY-MM-DD" e `startTime`/`endTime` em "HH:MM". O tipo público do hook
 * admite `string | Date`, então normalizamos e devolvemos `null` para qualquer
 * coisa fora do formato — um registro malformado não pode disparar escrita.
 */
export function toTimedEvent(event: unknown): TimedEvent | null {
  if (!event || typeof event !== "object") return null;

  const e = event as Record<string, unknown>;
  const date = asDateString(e.date);
  const startTime = asTimeString(e.startTime);
  if (!date || !startTime) return null;

  return {
    date,
    startTime,
    endTime: asTimeString(e.endTime),
    status: typeof e.status === "string" ? e.status : null,
  };
}

function asDateString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function asTimeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : null;
}

/** Tudo que a decisão precisa — tudo vindo do servidor, nada inferido na UI. */
export interface AutoStartInput {
  /** Evento já normalizado; `null` enquanto o cache do evento não chegou. */
  event: TimedEvent | null;
  /** Decisão do SERVIDOR sobre quem pode editar este checklist. */
  canEdit: boolean;
  hasTemplate: boolean;
  hasInstantiatedItems: boolean;
  isCompleted: boolean;
  /** Injetável nos testes; por padrão o "agora" de São Paulo. */
  now?: Date;
}

/**
 * Dispara a materialização automática? Todas as condições precisam valer:
 * dentro da janela, com permissão do servidor, com template, sem itens ainda e
 * com o evento não concluído.
 */
export function shouldAutoStartChecklist(input: AutoStartInput): boolean {
  const { event, canEdit, hasTemplate, hasInstantiatedItems, isCompleted, now } =
    input;

  if (!event) return false;
  if (!canEdit) return false;
  if (isCompleted) return false;
  if (!hasTemplate) return false;
  if (hasInstantiatedItems) return false;

  return now ? isEventHappening(event, now) : isEventHappening(event);
}

/**
 * O 400 de corrida ("Checklist ja foi iniciado para este evento") não é erro
 * para o usuário: duas pessoas do Contagie abriram a aba ao mesmo tempo e o
 * servidor, dentro da transação, deixou a segunda de fora. Para quem está com o
 * celular na mão o resultado é o mesmo — o checklist existe. Basta recarregar.
 */
export function isAlreadyStartedError(message: string | null | undefined): boolean {
  if (!message) return false;
  return ALREADY_STARTED_PATTERN.test(message);
}
