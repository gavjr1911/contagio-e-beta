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
import { resolveEventId } from "@/lib/events"

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/events/[id]/items - List event items (ordem do culto)
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAuth(async () => {
    const { id: idOrSlug } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
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
  return withRole(["ADMIN", "LEADER"], async () => {
    const { id: idOrSlug } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
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
      responsibleName,
      order,
      bibleReference,
      mediaUrl,
      notes,
      isPublic,
      expectedSongCount,
      requiresMedia,
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

    // Monta os dados para create
    const createData: Parameters<typeof prisma.eventItem.create>[0]["data"] = {
      event: { connect: { id: eventId } },
      type,
      title,
      description,
      durationMinutes,
      responsibleName: responsibleName || null,
      order: finalOrder,
      bibleReference,
      mediaUrl: mediaUrl || null,
      notes,
      isPublic: isPublic ?? true,
      expectedSongCount: type === "WORSHIP" ? expectedSongCount : null,
      requiresMedia: requiresMedia ?? false,
    }

    // Conecta o responsavel se fornecido
    if (responsibleId) {
      createData.responsible = { connect: { id: responsibleId } }
    }

    const item = await prisma.eventItem.create({
      data: createData,
      include: eventItemIncludeFull,
    })

    return apiSuccess(item, 201)
  })
}

// PATCH /api/events/[id]/items - Reorder event items
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withRole(["ADMIN", "LEADER"], async () => {
    const { id: idOrSlug } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
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
