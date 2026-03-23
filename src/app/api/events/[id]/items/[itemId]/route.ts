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
  return withRole(["ADMIN", "COORDINATOR", "LEADER"], async () => {
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
      bibleReference,
      mediaUrl,
      notes,
      isPublic,
      expectedSongCount,
    } = validation.data

    // Validate responsibleId if provided
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

    const item = await prisma.eventItem.update({
      where: { id: itemId },
      data: {
        type,
        title,
        description,
        durationMinutes,
        responsibleId,
        bibleReference,
        mediaUrl: mediaUrl || null,
        notes,
        isPublic,
        expectedSongCount: finalType === "WORSHIP" ? expectedSongCount : null,
      },
      include: eventItemIncludeFull,
    })

    return apiSuccess(item)
  })
}

// DELETE /api/events/[id]/items/[itemId] - Delete event item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withRole(["ADMIN", "COORDINATOR", "LEADER"], async () => {
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
