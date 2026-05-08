import { NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import {
  apiError,
  apiSuccess,
  validateBody,
  withAuth,
} from "@/lib/api-utils"
import { withCerimonial, canEditChecklist } from "@/lib/permissions"
import { createEventChecklistItemSchema } from "@/lib/validations/checklist"

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/events/[id]/checklist - Listar itens do checklist do evento
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { id: eventId } = await params

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

    // Verificar se usuario pode editar
    const canEdit = await canEditChecklist(session.user.id, session.user.role)

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
      stats: {
        total,
        completed,
        pending,
        percentComplete,
      },
    })
  })
}

// POST /api/events/[id]/checklist - Adicionar item extra (apenas Cerimonial)
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withCerimonial(async (session) => {
    const { id: eventId } = await params

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return apiError("Evento nao encontrado", 404)
    }

    // Verificar se evento esta concluido
    if (event.status === "COMPLETED") {
      return apiError("Nao e possivel adicionar itens em eventos concluidos", 400)
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
