import { NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import { apiError, apiSuccess, validateBody } from "@/lib/api-utils"
import { withCerimonial } from "@/lib/permissions"
import { updateEventChecklistItemSchema } from "@/lib/validations/checklist"
import { resolveEventId } from "@/lib/events"

type RouteParams = { params: Promise<{ id: string; itemId: string }> }

// PATCH /api/events/[id]/checklist/[itemId] - Atualizar item (marcar/desmarcar)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withCerimonial(async (session) => {
    const { id: idOrSlug, itemId } = await params
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

    const item = await prisma.eventChecklistItem.findFirst({
      where: {
        id: itemId,
        eventId,
      },
    })

    if (!item) {
      return apiError("Item nao encontrado", 404)
    }

    const bodyResult = await validateBody(request, updateEventChecklistItemSchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    const { title, completed } = bodyResult.data

    // Preparar dados de update
    const updateData: {
      title?: string
      completed?: boolean
      completedAt?: Date | null
      completedById?: string | null
    } = {}

    if (title !== undefined) {
      updateData.title = title
    }

    if (completed !== undefined) {
      updateData.completed = completed
      if (completed) {
        updateData.completedAt = new Date()
        updateData.completedById = session.user.id
      } else {
        updateData.completedAt = null
        updateData.completedById = null
      }
    }

    const updatedItem = await prisma.eventChecklistItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        completedBy: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    return apiSuccess(updatedItem)
  })
}

// DELETE /api/events/[id]/checklist/[itemId] - Remover item extra
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withCerimonial(async () => {
    const { id: idOrSlug, itemId } = await params
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

    // Verificar se evento esta concluido
    if (event.status === "COMPLETED") {
      return apiError("Nao e possivel remover itens de eventos concluidos", 400)
    }

    const item = await prisma.eventChecklistItem.findFirst({
      where: {
        id: itemId,
        eventId,
      },
    })

    if (!item) {
      return apiError("Item nao encontrado", 404)
    }

    // Apenas itens extras podem ser removidos
    if (item.fromTemplate) {
      return apiError("Apenas itens extras podem ser removidos", 400)
    }

    await prisma.eventChecklistItem.delete({
      where: { id: itemId },
    })

    // Reordenar itens restantes
    const remainingItems = await prisma.eventChecklistItem.findMany({
      where: { eventId },
      orderBy: { order: "asc" },
    })

    await prisma.$transaction(
      remainingItems.map((item, index) =>
        prisma.eventChecklistItem.update({
          where: { id: item.id },
          data: { order: index },
        })
      )
    )

    return apiSuccess({ deleted: true })
  })
}
