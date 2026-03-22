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
import {
  createEventItemSchema,
  reorderEventItemsSchema,
} from "@/lib/validations/event"

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/events/[id]/items - List event items (ordem do culto)
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAuth(async () => {
    const { id: eventId } = await params

    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return apiError("Evento nao encontrado", 404)
    }

    const items = await prisma.eventItem.findMany({
      where: { eventId },
      include: eventItemIncludeFull,
      orderBy: { order: "asc" },
    })

    return apiSuccess(items)
  })
}

// POST /api/events/[id]/items - Add item to event order
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withRole(["ADMIN", "COORDINATOR", "LEADER"], async () => {
    const { id: eventId } = await params

    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return apiError("Evento nao encontrado", 404)
    }

    const validation = await validateBody(request, createEventItemSchema)
    if (!validation.success) {
      return validation.response
    }

    const {
      type,
      title,
      description,
      durationMinutes,
      responsibleId,
      order,
      bibleReference,
      mediaUrl,
      notes,
      isPublic,
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

    // If order not provided, add to the end
    let finalOrder = order
    if (finalOrder === undefined) {
      const maxOrderItem = await prisma.eventItem.findFirst({
        where: { eventId },
        orderBy: { order: "desc" },
        select: { order: true },
      })
      finalOrder = (maxOrderItem?.order ?? -1) + 1
    }

    const item = await prisma.eventItem.create({
      data: {
        eventId,
        type,
        title,
        description,
        durationMinutes,
        responsibleId,
        order: finalOrder,
        bibleReference,
        mediaUrl: mediaUrl || null,
        notes,
        isPublic: isPublic ?? true,
      },
      include: eventItemIncludeFull,
    })

    return apiSuccess(item, 201)
  })
}

// PATCH /api/events/[id]/items - Reorder event items
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withRole(["ADMIN", "COORDINATOR", "LEADER"], async () => {
    const { id: eventId } = await params

    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return apiError("Evento nao encontrado", 404)
    }

    const validation = await validateBody(request, reorderEventItemsSchema)
    if (!validation.success) {
      return validation.response
    }

    const { itemIds } = validation.data

    // Verify all items belong to this event
    const existingItems = await prisma.eventItem.findMany({
      where: { eventId },
      select: { id: true },
    })
    const existingIds = new Set(existingItems.map((item) => item.id))

    for (const itemId of itemIds) {
      if (!existingIds.has(itemId)) {
        return apiError(`Item ${itemId} nao pertence a este evento`, 400)
      }
    }

    // Update order in a transaction
    await prisma.$transaction(
      itemIds.map((id, index) =>
        prisma.eventItem.update({
          where: { id },
          data: { order: index },
        })
      )
    )

    const updatedItems = await prisma.eventItem.findMany({
      where: { eventId },
      include: eventItemIncludeFull,
      orderBy: { order: "asc" },
    })

    return apiSuccess(updatedItems)
  })
}
