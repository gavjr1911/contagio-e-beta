import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { eventItemIncludeFull } from "@/lib/prisma-includes"
import { updateEventSchema } from "@/lib/validations/event"
import { transformEventForResponse } from "@/lib/date-utils"
import { EventStatus } from "@/generated/prisma/enums"
import { resolveEventId } from "@/lib/events"
import { buildEventSlug } from "@/lib/slug"

async function generateUniqueSlug(
  base: string,
  excludeEventId?: string
): Promise<string> {
  let candidate = base
  let counter = 2
  while (true) {
    const existing = await prisma.event.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing || existing.id === excludeEventId) {
      return candidate
    }
    candidate = `${base}-${counter}`
    counter += 1
  }
}

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

    const { id: idOrSlug } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        template: { select: { id: true, name: true } },
        checklistTemplate: { select: { id: true, name: true } },
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

// PATCH /api/events/[id] - Update event (ADMIN only)
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
    if (userRole !== "ADMIN") {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN pode editar eventos." },
        { status: 403 }
      )
    }

    const { id: idOrSlug } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    const existingEvent = await prisma.event.findUnique({ where: { id: eventId } })
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

    // Validate checklistTemplateId if provided
    if (updateData.checklistTemplateId) {
      const checklistTemplateExists = await prisma.checklistTemplate.findUnique({
        where: { id: updateData.checklistTemplateId },
      })
      if (!checklistTemplateExists) {
        return Response.json(
          { error: "Template de checklist nao encontrado" },
          { status: 400 }
        )
      }
    }

    // Verificar se o evento esta sendo marcado como COMPLETED
    const isCompletingEvent =
      updateData.status === EventStatus.COMPLETED &&
      existingEvent.status !== EventStatus.COMPLETED

    // Regenerar slug se nome, data ou hora de inicio mudaram
    const finalUpdateData: typeof updateData & { slug?: string } = { ...updateData }
    const nameChanged = updateData.name !== undefined && updateData.name !== existingEvent.name
    const dateChanged = updateData.date !== undefined && String(updateData.date) !== String(existingEvent.date)
    const startTimeChanged =
      updateData.startTime !== undefined &&
      String(updateData.startTime) !== String(existingEvent.startTime)

    if (nameChanged || dateChanged || startTimeChanged) {
      const baseSlug = buildEventSlug({
        name: updateData.name ?? existingEvent.name,
        date: updateData.date ?? existingEvent.date,
        startTime: updateData.startTime ?? existingEvent.startTime,
      })
      if (baseSlug !== existingEvent.slug) {
        finalUpdateData.slug = await generateUniqueSlug(baseSlug, eventId)
      }
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data: finalUpdateData,
      include: {
        template: { select: { id: true, name: true } },
        checklistTemplate: { select: { id: true, name: true } },
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

    const { id: idOrSlug } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    const existingEvent = await prisma.event.findUnique({ where: { id: eventId } })
    if (!existingEvent) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    await prisma.event.delete({ where: { id: eventId } })

    return Response.json({ message: "Evento removido com sucesso" })
  } catch (error) {
    console.error("Error deleting event:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
