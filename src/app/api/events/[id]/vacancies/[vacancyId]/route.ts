import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { updateVacancySchema } from "@/lib/validations/vacancy"

// PATCH /api/events/[id]/vacancies/[vacancyId] - Update vacancy quantity
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vacancyId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    if (!userRole || !["ADMIN", "COORDINATOR"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN e COORDINATOR podem gerenciar vagas." },
        { status: 403 }
      )
    }

    const { id: eventId, vacancyId } = await params

    // Validate event exists
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Validate vacancy exists and belongs to this event
    const existingVacancy = await prisma.eventVacancy.findUnique({
      where: { id: vacancyId },
      include: {
        _count: { select: { schedules: true } },
      },
    })
    if (!existingVacancy) {
      return Response.json({ error: "Vaga nao encontrada" }, { status: 404 })
    }
    if (existingVacancy.eventId !== eventId) {
      return Response.json(
        { error: "Vaga nao pertence a este evento" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parseResult = updateVacancySchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { quantity } = parseResult.data

    // Check if new quantity is less than already filled schedules
    if (quantity !== undefined && quantity < existingVacancy._count.schedules) {
      return Response.json(
        {
          error: `Nao e possivel reduzir a quantidade para ${quantity}. Ja existem ${existingVacancy._count.schedules} pessoas escaladas.`,
        },
        { status: 400 }
      )
    }

    const vacancy = await prisma.eventVacancy.update({
      where: { id: vacancyId },
      data: {
        ...(quantity !== undefined && { quantity }),
      },
      include: {
        ministry: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        _count: { select: { schedules: true } },
      },
    })

    return Response.json({
      data: {
        id: vacancy.id,
        eventId: vacancy.eventId,
        ministryId: vacancy.ministryId,
        positionId: vacancy.positionId,
        quantity: vacancy.quantity,
        ministry: vacancy.ministry,
        position: vacancy.position,
        _count: vacancy._count,
        filled: vacancy._count.schedules,
        remaining: Math.max(0, vacancy.quantity - vacancy._count.schedules),
      },
    })
  } catch (error) {
    console.error("Error updating event vacancy:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[id]/vacancies/[vacancyId] - Remove vacancy
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vacancyId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    if (!userRole || !["ADMIN", "COORDINATOR"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN e COORDINATOR podem gerenciar vagas." },
        { status: 403 }
      )
    }

    const { id: eventId, vacancyId } = await params

    // Validate event exists
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Validate vacancy exists and belongs to this event
    const existingVacancy = await prisma.eventVacancy.findUnique({
      where: { id: vacancyId },
      include: {
        _count: { select: { schedules: true } },
      },
    })
    if (!existingVacancy) {
      return Response.json({ error: "Vaga nao encontrada" }, { status: 404 })
    }
    if (existingVacancy.eventId !== eventId) {
      return Response.json(
        { error: "Vaga nao pertence a este evento" },
        { status: 400 }
      )
    }

    // Check if there are schedules linked to this vacancy
    if (existingVacancy._count.schedules > 0) {
      return Response.json(
        {
          error: `Nao e possivel remover a vaga. Existem ${existingVacancy._count.schedules} pessoas escaladas.`,
        },
        { status: 400 }
      )
    }

    await prisma.eventVacancy.delete({ where: { id: vacancyId } })

    return Response.json({ message: "Vaga removida com sucesso" })
  } catch (error) {
    console.error("Error deleting event vacancy:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
