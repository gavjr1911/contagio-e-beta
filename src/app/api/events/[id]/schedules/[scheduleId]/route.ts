import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { updateScheduleSchema } from "@/lib/validations/schedule"

// PATCH /api/events/[id]/schedules/[scheduleId] - Update schedule
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: eventId, scheduleId } = await params

    // Verify event exists
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Verify schedule exists and belongs to this event
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        user: { select: { id: true } },
      },
    })
    if (!existingSchedule) {
      return Response.json({ error: "Escala nao encontrada" }, { status: 404 })
    }
    if (existingSchedule.eventId !== eventId) {
      return Response.json(
        { error: "Escala nao pertence a este evento" },
        { status: 400 }
      )
    }

    const userRole = session.user.role
    const isOwner = existingSchedule.user.id === session.user.id
    const isAdminOrCoordinator =
      userRole && ["ADMIN", "COORDINATOR", "LEADER"].includes(userRole)

    // Only the scheduled user or admin/coordinator can update
    if (!isOwner && !isAdminOrCoordinator) {
      return Response.json(
        { error: "Acesso negado." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parseResult = updateScheduleSchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { position, status } = parseResult.data

    // Build update data
    const updateData: {
      position?: string
      status?: "PENDING" | "CONFIRMED" | "DECLINED"
      confirmedAt?: Date | null
      declinedReason?: string | null
    } = {}

    if (position !== undefined) {
      updateData.position = position
    }

    if (status !== undefined) {
      updateData.status = status
      if (status === "CONFIRMED") {
        updateData.confirmedAt = new Date()
        updateData.declinedReason = null
      } else if (status === "DECLINED") {
        updateData.confirmedAt = null
      } else if (status === "PENDING") {
        updateData.confirmedAt = null
        updateData.declinedReason = null
      }
    }

    const schedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        ministry: {
          select: { id: true, name: true, type: true },
        },
        event: {
          select: { id: true, name: true, date: true },
        },
      },
    })

    return Response.json({ data: schedule })
  } catch (error) {
    console.error("Error updating schedule:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[id]/schedules/[scheduleId] - Remove from schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: eventId, scheduleId } = await params

    // Verify event exists
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Verify schedule exists and belongs to this event
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
    })
    if (!existingSchedule) {
      return Response.json({ error: "Escala nao encontrada" }, { status: 404 })
    }
    if (existingSchedule.eventId !== eventId) {
      return Response.json(
        { error: "Escala nao pertence a este evento" },
        { status: 400 }
      )
    }

    const userRole = session.user.role
    if (!userRole || !["ADMIN", "COORDINATOR", "LEADER"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN, COORDINATOR ou LEADER podem remover escalas." },
        { status: 403 }
      )
    }

    await prisma.schedule.delete({ where: { id: scheduleId } })

    return Response.json({ message: "Escala removida com sucesso" })
  } catch (error) {
    console.error("Error deleting schedule:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
