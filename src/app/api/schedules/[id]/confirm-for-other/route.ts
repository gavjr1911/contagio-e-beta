import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAuditAsync, getAuditContext, getRequestMetadata } from "@/lib/audit"
import {
  canConfirmSchedulesForOthersWith,
  canThirdPartyConfirmStatus,
  canThirdPartyUndoConfirmation,
  CONFIRM_FOR_OTHERS_DENIED_MESSAGE,
} from "@/lib/permissions/event-access"
import { loadEventAssignments } from "@/lib/permissions/event-access.server"

/**
 * Confirmacao de escala POR TERCEIRO.
 *
 * Pedido do dono do produto: "podemos criar uma funcionalidade pro pessoal do
 * contagie e administradores poderem confirmar quem ainda nao confirmou".
 *
 * Quem pode: ADMIN, ou quem esta escalado NESTE evento por um ministerio com
 * `events.edit` — exatamente a mesma regra de concluir o evento
 * (`src/lib/permissions/event-access.ts`), e nao um caminho paralelo.
 *
 * O que NAO faz: recusar no lugar de alguem. Recusar e decisao pessoal, e o
 * unico jeito de um terceiro "desfazer" e voltar a escala para PENDING
 * (DELETE abaixo) — e so quando a confirmacao tiver sido dele proprio.
 *
 * Autoria: `confirmedById` guarda QUEM confirmou em nome de outra pessoa.
 * Quando a propria pessoa confirma (tela ou link do e-mail) o campo fica NULO.
 */

type SessionUser = { id: string; role?: string | null }

async function authorize(scheduleId: string, user: SessionUser) {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      user: { select: { id: true, name: true } },
      ministry: { select: { id: true, name: true } },
      event: { select: { id: true, name: true, status: true } },
    },
  })

  if (!schedule) {
    return {
      error: Response.json({ error: "Escala nao encontrada" }, { status: 404 }),
    }
  }

  if (schedule.user.id === user.id) {
    return {
      error: Response.json(
        {
          error:
            "Esta e a sua propria escala. Use a confirmacao normal (Minhas Escalas ou o link do e-mail).",
        },
        { status: 400 }
      ),
    }
  }

  const assignments = await loadEventAssignments(schedule.event.id, user.id)
  if (!canConfirmSchedulesForOthersWith(user.role ?? undefined, assignments)) {
    return {
      error: Response.json(
        { error: CONFIRM_FOR_OTHERS_DENIED_MESSAGE },
        { status: 403 }
      ),
    }
  }

  if (schedule.event.status === "COMPLETED") {
    return {
      error: Response.json(
        { error: "Evento ja foi concluido. Nao e possivel alterar escalas." },
        { status: 400 }
      ),
    }
  }

  return { schedule }
}

const scheduleResponseInclude = {
  user: { select: { id: true, name: true, email: true, image: true } },
  confirmedBy: { select: { id: true, name: true } },
  ministry: { select: { id: true, name: true } },
  event: { select: { id: true, name: true, date: true } },
} as const

// POST /api/schedules/[id]/confirm-for-other — confirma a escala de outra pessoa
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: scheduleId } = await params
    const result = await authorize(scheduleId, session.user as SessionUser)
    if ("error" in result) return result.error
    const { schedule } = result

    // Quem recusou explicitamente nao pode ser "confirmado" por terceiro:
    // seria sobrescrever uma decisao pessoal. Se foi engano, a propria pessoa
    // confirma — ou um ADMIN remove e refaz a escala.
    const transition = canThirdPartyConfirmStatus(schedule.status)
    if (!transition.ok) {
      return Response.json(
        { error: transition.message },
        { status: transition.status }
      )
    }

    const updated = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        confirmedById: session.user.id,
        declinedReason: null,
      },
      include: scheduleResponseInclude,
    })

    const auditContext = getAuditContext(session)
    logAuditAsync({
      entityType: "Schedule",
      entityId: scheduleId,
      action: "confirmed_for_other",
      ...auditContext,
      changes: {
        status: { old: schedule.status, new: "CONFIRMED" },
        confirmedById: { old: schedule.confirmedById, new: session.user.id },
        userName: { old: null, new: updated.user.name },
        eventName: { old: null, new: updated.event.name },
        ministryName: { old: null, new: updated.ministry.name },
      },
      metadata: getRequestMetadata(request),
    })

    return Response.json({
      message: "Escala confirmada em nome do voluntario",
      data: updated,
    })
  } catch (error) {
    console.error("Error confirming schedule for other:", error)
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// DELETE /api/schedules/[id]/confirm-for-other — desfaz, voltando para PENDING
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: scheduleId } = await params
    const result = await authorize(scheduleId, session.user as SessionUser)
    if ("error" in result) return result.error
    const { schedule } = result

    // So da para desfazer uma confirmacao FEITA POR TERCEIRO (confirmedById
    // preenchido). Se a propria pessoa confirmou, desfazer seria apagar a
    // decisao dela.
    const undo = canThirdPartyUndoConfirmation(
      schedule.status,
      schedule.confirmedById
    )
    if (!undo.ok) {
      return Response.json({ error: undo.message }, { status: undo.status })
    }

    const updated = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        status: "PENDING",
        confirmedAt: null,
        confirmedById: null,
      },
      include: scheduleResponseInclude,
    })

    const auditContext = getAuditContext(session)
    logAuditAsync({
      entityType: "Schedule",
      entityId: scheduleId,
      action: "confirmation_for_other_undone",
      ...auditContext,
      changes: {
        status: { old: schedule.status, new: "PENDING" },
        confirmedById: { old: schedule.confirmedById, new: null },
        userName: { old: null, new: updated.user.name },
        eventName: { old: null, new: updated.event.name },
        ministryName: { old: null, new: updated.ministry.name },
      },
      metadata: getRequestMetadata(request),
    })

    return Response.json({
      message: "Confirmacao desfeita. A escala voltou para pendente.",
      data: updated,
    })
  } catch (error) {
    console.error("Error undoing schedule confirmation:", error)
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
