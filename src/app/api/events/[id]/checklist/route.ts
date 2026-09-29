import { NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import {
  apiError,
  apiSuccess,
  validateBody,
  withAuth,
} from "@/lib/api-utils"
import {
  canEditEventChecklistNow,
  canEditEventChecklistWith,
  CHECKLIST_DENIED_MESSAGE,
  CHECKLIST_EVENT_COMPLETED_MESSAGE,
} from "@/lib/permissions/event-access"
import { loadEventAssignments } from "@/lib/permissions/event-access.server"
import { createEventChecklistItemSchema } from "@/lib/validations/checklist"
import { resolveEventId } from "@/lib/events"

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/events/[id]/checklist - Listar itens do checklist do evento
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { id: idOrSlug } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
      return apiError("Evento nao encontrado", 404)
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        checklistTemplate: {
          include: {
            items: {
              orderBy: { order: "asc" },
            },
          },
        },
        checklistItems: {
          include: {
            completedBy: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    })

    if (!event) {
      return apiError("Evento nao encontrado", 404)
    }

    // Verificar se usuario pode editar.
    // Regra por EVENTO (matriz do ministerio da escala), nao por nome de
    // ministerio — ver `canEditEventChecklistWith`.
    const canEdit = canEditEventChecklistNow({
      userRole: session.user.role,
      assignments: await loadEventAssignments(eventId, session.user.id),
      eventStatus: event.status,
    })

    // Se nao tem itens instanciados mas tem template, retornar preview
    const hasInstantiatedItems = event.checklistItems.length > 0
    const hasTemplate = !!event.checklistTemplate

    // Calcular estatisticas
    const items = event.checklistItems
    const total = items.length
    const completed = items.filter((item) => item.completed).length
    const pending = total - completed
    const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0

    return apiSuccess({
      items: event.checklistItems,
      template: event.checklistTemplate,
      hasInstantiatedItems,
      hasTemplate,
      canEdit,
      // A UI precisa distinguir "voce nao tem permissao" de "o evento ja
      // acabou" — sao mensagens diferentes e acoes diferentes (no segundo caso
      // a saida e pedir a um admin para reabrir).
      isCompleted: event.status === "COMPLETED",
      stats: {
        total,
        completed,
        pending,
        percentComplete,
      },
    })
  })
}

// POST /api/events/[id]/checklist - Adicionar item extra
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { id: idOrSlug } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
      return apiError("Evento nao encontrado", 404)
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return apiError("Evento nao encontrado", 404)
    }

    // Estado do evento ANTES da permissao: as duas recusas sao diferentes para
    // quem esta na tela. Se o evento acabou, dizer "voce nao tem permissao"
    // manda a pessoa atras do administrador errado — a saida e reabrir o evento.
    if (event.status === "COMPLETED") {
      return apiError(CHECKLIST_EVENT_COMPLETED_MESSAGE, 400)
    }

    const canEdit = canEditEventChecklistWith(
      session.user.role,
      await loadEventAssignments(eventId, session.user.id)
    )
    if (!canEdit) {
      return apiError(CHECKLIST_DENIED_MESSAGE, 403)
    }

    const bodyResult = await validateBody(request, createEventChecklistItemSchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    const { title, order } = bodyResult.data

    // Se order nao foi especificado, colocar no final
    let itemOrder = order
    if (itemOrder === undefined) {
      const lastItem = await prisma.eventChecklistItem.findFirst({
        where: { eventId },
        orderBy: { order: "desc" },
      })
      itemOrder = (lastItem?.order ?? -1) + 1
    }

    const item = await prisma.eventChecklistItem.create({
      data: {
        eventId,
        title,
        order: itemOrder,
        fromTemplate: false, // Item extra
      },
      include: {
        completedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    return apiSuccess(item, 201)
  })
}
