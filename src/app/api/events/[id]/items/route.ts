import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  createEventItemSchema,
  reorderEventItemsSchema,
} from "@/lib/validations/event"

// GET /api/events/[id]/items - List event items (ordem do culto)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: eventId } = await params

    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    const items = await prisma.eventItem.findMany({
      where: { eventId },
      include: {
        responsible: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { order: "asc" },
    })

    return Response.json({ data: items })
  } catch (error) {
    console.error("Error fetching event items:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// POST /api/events/[id]/items - Add item to event order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    if (!userRole || !["ADMIN", "COORDINATOR", "LEADER"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado." },
        { status: 403 }
      )
    }

    const { id: eventId } = await params

    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const parseResult = createEventItemSchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { type, title, description, durationMinutes, responsibleId, order } =
      parseResult.data

    // Validate responsibleId if provided
    if (responsibleId) {
      const userExists = await prisma.user.findUnique({
        where: { id: responsibleId },
      })
      if (!userExists) {
        return Response.json(
          { error: "Usuario responsavel nao encontrado" },
          { status: 400 }
        )
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
      },
      include: {
        responsible: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return Response.json({ data: item }, { status: 201 })
  } catch (error) {
    console.error("Error creating event item:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// PATCH /api/events/[id]/items - Reorder event items
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    if (!userRole || !["ADMIN", "COORDINATOR", "LEADER"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado." },
        { status: 403 }
      )
    }

    const { id: eventId } = await params

    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const parseResult = reorderEventItemsSchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { itemIds } = parseResult.data

    // Verify all items belong to this event
    const existingItems = await prisma.eventItem.findMany({
      where: { eventId },
      select: { id: true },
    })
    const existingIds = new Set(existingItems.map((item) => item.id))

    for (const itemId of itemIds) {
      if (!existingIds.has(itemId)) {
        return Response.json(
          { error: `Item ${itemId} nao pertence a este evento` },
          { status: 400 }
        )
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
      include: {
        responsible: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { order: "asc" },
    })

    return Response.json({ data: updatedItems })
  } catch (error) {
    console.error("Error reordering event items:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
