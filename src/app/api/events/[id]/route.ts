import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { eventItemIncludeFull } from "@/lib/prisma-includes"
import { updateEventSchema } from "@/lib/validations/event"
import { transformEventForResponse } from "@/lib/date-utils"
import { EventStatus } from "@/generated/prisma/enums"

// GET /api/events/[id] - Get event details with schedules and items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id } = await params

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        template: { select: { id: true, name: true } },
        items: {
          include: eventItemIncludeFull,
          orderBy: { order: "asc" },
        },
        schedules: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
            ministry: {
              select: { id: true, name: true },
            },
          },
          orderBy: [{ ministry: { name: "asc" } }, { createdAt: "asc" }],
        },
        setlists: {
          include: {
            song: {
              select: { id: true, name: true, artist: true, defaultKey: true },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    })

    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    return Response.json({ data: transformEventForResponse(event) })
  } catch (error) {
    console.error("Error fetching event:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// PATCH /api/events/[id] - Update event (ADMIN, COORDINATOR only)
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
    if (!userRole || !["ADMIN", "COORDINATOR"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN e COORDINATOR podem editar eventos." },
        { status: 403 }
      )
    }

    const { id } = await params

    const existingEvent = await prisma.event.findUnique({ where: { id } })
    if (!existingEvent) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const parseResult = updateEventSchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const updateData = parseResult.data

    // Validate templateId if provided
    if (updateData.templateId) {
      const templateExists = await prisma.eventTemplate.findUnique({
        where: { id: updateData.templateId },
      })
      if (!templateExists) {
        return Response.json(
          { error: "Template nao encontrado" },
          { status: 400 }
        )
      }
    }

    // Verificar se o evento esta sendo marcado como COMPLETED
    const isCompletingEvent =
      updateData.status === EventStatus.COMPLETED &&
      existingEvent.status !== EventStatus.COMPLETED

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        template: { select: { id: true, name: true } },
        setlists: isCompletingEvent ? { select: { songId: true } } : false,
      },
    })

    // Se o evento foi marcado como COMPLETED, atualizar playCount e lastPlayedAt das musicas do setlist
    if (isCompletingEvent && "setlists" in event && Array.isArray(event.setlists)) {
      const songIds = event.setlists.map((item: { songId: string }) => item.songId)

      if (songIds.length > 0) {
        await prisma.$transaction(
          songIds.map((songId: string) =>
            prisma.song.update({
              where: { id: songId },
              data: {
                playCount: { increment: 1 },
                lastPlayedAt: new Date(),
              },
            })
          )
        )
      }
    }

    return Response.json({ data: transformEventForResponse(event) })
  } catch (error) {
    console.error("Error updating event:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[id] - Delete event (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    if (userRole !== "ADMIN") {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN pode remover eventos." },
        { status: 403 }
      )
    }

    const { id } = await params

    const existingEvent = await prisma.event.findUnique({ where: { id } })
    if (!existingEvent) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    await prisma.event.delete({ where: { id } })

    return Response.json({ message: "Evento removido com sucesso" })
  } catch (error) {
    console.error("Error deleting event:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
