import { type NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import {
  withAuth,
  withRole,
  apiSuccess,
  apiError,
  validateBody,
} from "@/lib/api-utils"
import { eventItemIncludeFull } from "@/lib/prisma-includes"
import { updateEventItemSchema } from "@/lib/validations/event"

type RouteParams = {
  params: Promise<{ id: string; itemId: string }>
}

// GET /api/events/[id]/items/[itemId] - Get single event item
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAuth(async () => {
    const { id: eventId, itemId } = await params

    const item = await prisma.eventItem.findFirst({
      where: { id: itemId, eventId },
      include: eventItemIncludeFull,
    })

    if (!item) {
      return apiError("Item nao encontrado", 404)
    }

    return apiSuccess(item)
  })
}

// PATCH /api/events/[id]/items/[itemId] - Update event item
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withRole(["ADMIN", "LEADER"], async () => {
    const { id: eventId, itemId } = await params

    const existingItem = await prisma.eventItem.findFirst({
      where: { id: itemId, eventId },
    })

    if (!existingItem) {
      return apiError("Item nao encontrado", 404)
    }

    const validation = await validateBody(request, updateEventItemSchema)
    if (!validation.success) {
      return validation.response
    }

    const {
      type,
      title,
      description,
      durationMinutes,
      responsibleId,
      responsibleName,
      bibleReference,
      mediaUrl,
      notes,
      isPublic,
      expectedSongCount,
      requiresMedia,
    } = validation.data

    // Validate responsibleId if provided and not null
    if (responsibleId) {
      const userExists = await prisma.user.findUnique({
        where: { id: responsibleId },
      })
      if (!userExists) {
        return apiError("Usuario responsavel nao encontrado", 400)
      }
    }

    // Determina o tipo final (novo ou existente)
    const finalType = type ?? existingItem.type

    // Determina responsibleId e responsibleName
    // Se responsibleId foi fornecido, limpa responsibleName e vice-versa
    let finalResponsibleId = existingItem.responsibleId
    let finalResponsibleName = existingItem.responsibleName

    if (responsibleId !== undefined) {
      finalResponsibleId = responsibleId || null
      if (responsibleId) {
        finalResponsibleName = null // Se tem ID, limpa nome livre
      }
    }
    if (responsibleName !== undefined) {
      finalResponsibleName = responsibleName || null
      if (responsibleName) {
        finalResponsibleId = null // Se tem nome livre, limpa ID
      }
    }

    // Monta os dados para update
    const updateData: Parameters<typeof prisma.eventItem.update>[0]["data"] = {
      type,
      title,
      description,
      durationMinutes,
      bibleReference,
      mediaUrl: mediaUrl || null,
      notes,
      isPublic,
      expectedSongCount: finalType === "WORSHIP" ? expectedSongCount : null,
      requiresMedia,
      responsibleName: finalResponsibleName,
    }

    // Usa a relacao para conectar/desconectar o responsavel
    if (finalResponsibleId) {
      updateData.responsible = { connect: { id: finalResponsibleId } }
    } else if (existingItem.responsibleId && !finalResponsibleId) {
      updateData.responsible = { disconnect: true }
    }

    const item = await prisma.eventItem.update({
      where: { id: itemId },
      data: updateData,
      include: eventItemIncludeFull,
    })

    return apiSuccess(item)
  })
}

// DELETE /api/events/[id]/items/[itemId] - Delete event item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withRole(["ADMIN", "LEADER"], async () => {
    const { id: eventId, itemId } = await params

    const existingItem = await prisma.eventItem.findFirst({
      where: { id: itemId, eventId },
    })

    if (!existingItem) {
      return apiError("Item nao encontrado", 404)
    }

    await prisma.eventItem.delete({
      where: { id: itemId },
    })

    // Reorder remaining items to fill the gap
    const remainingItems = await prisma.eventItem.findMany({
      where: { eventId },
      orderBy: { order: "asc" },
      select: { id: true },
    })

    if (remainingItems.length > 0) {
      await prisma.$transaction(
        remainingItems.map((item, index) =>
          prisma.eventItem.update({
            where: { id: item.id },
            data: { order: index },
          })
        )
      )
    }

    return apiSuccess({ deleted: true })
  })
}
