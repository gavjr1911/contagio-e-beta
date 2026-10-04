/**
 * Acesso a ações de um EVENTO ESPECÍFICO (escopo por evento).
 *
 * Diferente de `resolver.ts`, que resolve as permissões GLOBAIS do usuário
 * (o máximo entre todos os ministérios), aqui a pergunta é sempre
 * "esta pessoa pode fazer X NESTE evento?".
 *
 * Regra (Fase 0a — modelo por ação):
 * quem está ESCALADO no evento por um ministério cuja matriz lhe concede a
 * ação `events.edit` pode CONCLUIR o evento e REGISTRAR A PRESENÇA dele.
 * Não confere direito de editar o evento (nome/data/ordem) — isso segue ADMIN.
 */
import type { MinistryPermissions, PermissionFeature } from "./types";
import { DEFAULT_MINISTRY_PERMISSIONS } from "./defaults";
import { normalizeMinistryPermissions, hasAction } from "./normalize";

/** Status de escala relevante (espelha ScheduleStatus do Prisma). */
export type EventScheduleStatus = "PENDING" | "CONFIRMED" | "DECLINED";

/** Uma escala do usuário neste evento, com a matriz do ministério dela. */
export interface EventAssignment {
  ministryId: string;
  status: EventScheduleStatus;
  /** true se o usuário é o líder (Ministry.leaderId) desse ministério. */
  isMinistryLeader: boolean;
  /** Ministry.permissions cru (forma legada por nível OU nova por ação). */
  ministryPermissions: unknown;
}

function ministryMatrix(raw: unknown): MinistryPermissions {
  if (raw == null) return DEFAULT_MINISTRY_PERMISSIONS;
  return normalizeMinistryPermissions(raw);
}

/**
 * O ministério da escala concede `<feature>.<action>` a esta pessoa?
 * Usa a linha `leader` se ela lidera o ministério, senão a linha `member`.
 */
function assignmentGrants(
  assignment: EventAssignment,
  feature: PermissionFeature,
  action: "view" | "create" | "edit" | "delete"
): boolean {
  const matrix = ministryMatrix(assignment.ministryPermissions);
  const row = assignment.isMinistryLeader ? matrix.leader : matrix.member;
  return hasAction(row, feature, action);
}

/** O ministério da escala concede `events.edit` a esta pessoa? */
function assignmentGrantsEventEdit(assignment: EventAssignment): boolean {
  return assignmentGrants(assignment, "events", "edit");
}

/**
 * "Quem está escalado" = tem escala PENDING ou CONFIRMED neste evento.
 *
 * Por que PENDING conta (decisão do dono do produto): na prática quase
 * ninguém confirma a escala — "às vezes alguém esquece de confirmar". Exigir
 * CONFIRMED faria o recurso parecer quebrado no domingo de manhã, que é
 * exatamente quando ele é usado.
 *
 * DECLINED continua fora: quem recusou explicitamente abriu mão do evento e
 * não deve ganhar poder sobre ele.
 */
function isActiveAssignment(assignment: EventAssignment): boolean {
  return assignment.status === "PENDING" || assignment.status === "CONFIRMED";
}

/**
 * Pode CONCLUIR (marcar como COMPLETED) este evento?
 * ADMIN sempre; caso contrário, precisa estar escalado (PENDING ou CONFIRMED)
 * num ministério que lhe conceda `events.edit`.
 *
 * Função pura — a busca no banco fica em `loadEventAssignments`.
 */
export function canCompleteEventWith(
  userRole: string | undefined,
  assignments: EventAssignment[]
): boolean {
  if (userRole === "ADMIN") return true;
  return assignments.some(
    (a) => isActiveAssignment(a) && assignmentGrantsEventEdit(a)
  );
}

/**
 * Pode REGISTRAR A PRESENÇA deste evento?
 * Mantém o acesso legado por papel global (ADMIN/LEADER) e acrescenta
 * a mesma regra de escala usada para concluir o evento.
 */
export function canRegisterAttendanceWith(
  userRole: string | undefined,
  assignments: EventAssignment[]
): boolean {
  if (userRole === "ADMIN" || userRole === "LEADER") return true;
  return canCompleteEventWith(userRole, assignments);
}

/** Motivo textual honesto para a recusa (usado nas mensagens de erro). */
export const COMPLETE_EVENT_DENIED_MESSAGE =
  "Acesso negado. Para concluir o evento é preciso ser ADMIN ou estar escalado neste evento por um ministério com permissão de editar eventos.";

export const ATTENDANCE_DENIED_MESSAGE =
  "Acesso negado. Para registrar a presença é preciso ser ADMIN, líder ou estar escalado neste evento por um ministério com permissão de editar eventos.";

/**
 * Pode CONFIRMAR A ESCALA DE OUTRA PESSOA neste evento?
 *
 * Mesma regra de `canCompleteEventWith` — de propósito: o dono do produto
 * pediu que "o pessoal do Contagie e administradores" pudessem confirmar quem
 * esqueceu, e esse é exatamente o grupo que já responde pelo evento. Reusar a
 * regra evita um segundo caminho de autorização divergindo do primeiro.
 *
 * NÃO dá direito de RECUSAR por outra pessoa: recusar é decisão pessoal
 * (ver a rota de confirmação por terceiro).
 */
export function canConfirmSchedulesForOthersWith(
  userRole: string | undefined,
  assignments: EventAssignment[]
): boolean {
  return canCompleteEventWith(userRole, assignments);
}

/**
 * O evento já pode ser concluído POR ESTA PESSOA hoje?
 *
 * Quem não é ADMIN só conclui a partir do DIA do evento (comparação por
 * dia-calendário no modelo wall-clock do projeto — as duas datas chegam já
 * formatadas como "YYYY-MM-DD" por `formatDateToISO`).
 */
export function isCompletionDateReached(
  userRole: string | undefined,
  eventDayISO: string,
  todayISO: string
): boolean {
  if (userRole === "ADMIN") return true;
  return eventDayISO <= todayISO;
}

/**
 * Decisão final de "o botão Concluir aparece?" — é ESTA a resposta que o
 * servidor manda para a UI em `GET /api/events/[id]`, para que não exista
 * uma segunda conta do lado do cliente (causa raiz dos 403 relatados).
 */
export function canCompleteEventNow(input: {
  userRole: string | undefined;
  assignments: EventAssignment[];
  eventStatus: string;
  eventDayISO: string;
  todayISO: string;
}): boolean {
  if (input.eventStatus === "COMPLETED") return false;
  if (!canCompleteEventWith(input.userRole, input.assignments)) return false;
  return isCompletionDateReached(
    input.userRole,
    input.eventDayISO,
    input.todayISO
  );
}

/**
 * Pode EDITAR O CHECKLIST deste evento (iniciar, marcar item, adicionar extra)?
 *
 * ADMIN sempre; caso contrário, precisa estar escalado (PENDING ou CONFIRMED)
 * neste evento por um ministério cuja matriz conceda `checklists.edit`.
 *
 * Substitui a regra antiga, que exigia pertencer a um ministério chamado
 * literalmente "Contagie - Cerimonial". Esse ministério nao existia no banco
 * (o real se chama "Contagie"), entao a checagem devolvia `false` para TODA
 * pessoa nao-ADMIN e o checklist nunca funcionou para voluntario nenhum —
 * inclusive no culto de 27/09/2026, em que as duas pessoas do Contagie
 * escaladas (uma por culto) ficaram sem conseguir marcar os itens. A matriz do
 * ministerio ja concedia `checklists` aos membros; era o codigo que ignorava a
 * configuracao e olhava o nome.
 */
export function canEditEventChecklistWith(
  userRole: string | undefined,
  assignments: EventAssignment[]
): boolean {
  if (userRole === "ADMIN") return true;
  return assignments.some(
    (a) => isActiveAssignment(a) && assignmentGrants(a, "checklists", "edit")
  );
}

/**
 * Pode EDITAR A ORDEM DO CULTO deste evento (itens, reordenação, músicas)?
 *
 * Mantém o acesso legado por papel global (ADMIN/LEADER) e acrescenta a regra
 * por evento: quem está escalado (PENDING ou CONFIRMED) por um ministério cuja
 * matriz conceda `orderOfService.edit`.
 *
 * Em 04/10/2026 a Sarah (VOLUNTEER do Contagie, escalada e confirmada no culto
 * daquele dia) tentou adicionar um item na ordem e levou 403: as rotas de
 * `items` decidiam por papel global enquanto a tela decidia pela matriz do
 * ministério — que concede `orderOfService` com as quatro ações aos membros do
 * Contagie. Mesmo padrão que já havia quebrado o checklist e a presença: o
 * painel diz que pode, o servidor recusa.
 */
export function canEditEventOrderWith(
  userRole: string | undefined,
  assignments: EventAssignment[]
): boolean {
  if (userRole === "ADMIN" || userRole === "LEADER") return true;
  return assignments.some(
    (a) => isActiveAssignment(a) && assignmentGrants(a, "orderOfService", "edit")
  );
}

export const EVENT_ORDER_DENIED_MESSAGE =
  "Acesso negado. Para editar a ordem do culto é preciso ser ADMIN, líder ou estar escalado neste evento por um ministério com permissão de ordem do culto.";

/**
 * Decisão FINAL de "dá para mexer no checklist agora?" — é esta que o servidor
 * manda para a UI, para não existir uma segunda conta do lado do cliente.
 *
 * Soma a permissão ao estado do evento: depois de CONCLUÍDO o checklist é
 * registro fechado (decisão do dono do produto). Sem dobrar o status aqui, a
 * tela mostraria "Iniciar Checklist" num evento concluído e o clique voltaria
 * com erro — que é exatamente a divergência UI×servidor que esta refatoração
 * existe para eliminar.
 */
export function canEditEventChecklistNow(input: {
  userRole: string | undefined;
  assignments: EventAssignment[];
  eventStatus: string;
}): boolean {
  if (input.eventStatus === "COMPLETED") return false;
  return canEditEventChecklistWith(input.userRole, input.assignments);
}

/** Motivo da recusa quando o evento já foi concluído (mensagem de operador). */
export const CHECKLIST_EVENT_COMPLETED_MESSAGE =
  "Este evento já foi concluído e o checklist não pode mais ser alterado. Peça a um administrador para reabrir o evento.";

export const CHECKLIST_DENIED_MESSAGE =
  "Acesso negado. Para mexer no checklist é preciso ser ADMIN ou estar escalado neste evento por um ministério com permissão de checklists.";

export const CONFIRM_FOR_OTHERS_DENIED_MESSAGE =
  "Acesso negado. Para confirmar a escala de outra pessoa é preciso ser ADMIN ou estar escalado neste evento por um ministério com permissão de editar eventos.";

// ---------------------------------------------------------------------------
// Transições permitidas na confirmação POR TERCEIRO (funções puras — a rota
// `POST/DELETE /api/schedules/[id]/confirm-for-other` só as aplica).
// ---------------------------------------------------------------------------

export interface ThirdPartyDecision {
  ok: boolean;
  /** Status HTTP a devolver quando `ok` é false. */
  status?: number;
  message?: string;
}

/**
 * Um terceiro pode confirmar uma escala neste status?
 * PENDING sim; CONFIRMED já está; DECLINED nunca — quem recusou tomou uma
 * decisão pessoal e ninguém a sobrescreve por ele.
 */
export function canThirdPartyConfirmStatus(
  status: EventScheduleStatus
): ThirdPartyDecision {
  if (status === "CONFIRMED") {
    return { ok: false, status: 400, message: "Escala ja esta confirmada." };
  }
  if (status === "DECLINED") {
    return {
      ok: false,
      status: 409,
      message:
        "Esta pessoa recusou a escala. So ela mesma pode voltar atras e confirmar.",
    };
  }
  return { ok: true };
}

/**
 * Um terceiro pode DESFAZER (voltar para PENDING) esta confirmação?
 * Só quando a confirmação foi feita por terceiro (`confirmedById` preenchido).
 * Se a própria pessoa confirmou, desfazer apagaria a decisão dela.
 */
export function canThirdPartyUndoConfirmation(
  status: EventScheduleStatus,
  confirmedById: string | null
): ThirdPartyDecision {
  if (status !== "CONFIRMED" || confirmedById === null) {
    return {
      ok: false,
      status: 400,
      message:
        "So e possivel desfazer uma confirmacao feita por outra pessoa. Esta escala foi confirmada pelo proprio voluntario (ou nem esta confirmada).",
    };
  }
  return { ok: true };
}
