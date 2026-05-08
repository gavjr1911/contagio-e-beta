import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { updateScheduleSchema } from "@/lib/validations/schedule"
import { logAuditAsync, getAuditContext, getRequestMetadata, calculateDiff } from "@/lib/audit"
import { resolveEventId } from "@/lib/events"

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

    const { id: idOrSlug, scheduleId } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
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
    const isAdminOrLeader =
      userRole && ["ADMIN", "LEADER"].includes(userRole)

    // Only the scheduled user or admin/leader can update
    if (!isOwner && !isAdminOrLeader) {
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

    const { status } = parseResult.data

    // Build update data
    // Nota: campo `position` legado nao e mais setado em updates (usar vacancy.position.name)
    const updateData: {
      status?: "PENDING" | "CONFIRMED" | "DECLINED"
      confirmedAt?: Date | null
      declinedReason?: string | null
    } = {}

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
          select: { id: true, name: true },
        },
        event: {
          select: { id: true, name: true, date: true },
        },
      },
    })

    // Registrar auditoria
    const auditContext = getAuditContext(session)
    const changes = calculateDiff(
      { position: existingSchedule.position, status: existingSchedule.status },
      { position: schedule.position, status: schedule.status }
    )

    if (changes) {
      logAuditAsync({
        entityType: "Schedule",
        entityId: scheduleId,
        action: "updated",
        ...auditContext,
        changes: {
          ...changes,
          userName: { old: null, new: schedule.user.name },
          eventName: { old: null, new: schedule.event.name },
        },
        metadata: getRequestMetadata(request),
      })
    }

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

    const { id: idOrSlug, scheduleId } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Verify schedule exists and belongs to this event
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        user: { select: { id: true, name: true } },
        ministry: { select: { id: true, name: true } },
        event: { select: { id: true, name: true } },
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
    if (!userRole || !["ADMIN", "LEADER"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN ou LEADER podem remover escalas." },
        { status: 403 }
      )
    }

    await prisma.schedule.delete({ where: { id: scheduleId } })

    // Registrar auditoria
    const auditContext = getAuditContext(session)
    logAuditAsync({
      entityType: "Schedule",
      entityId: scheduleId,
      action: "deleted",
      ...auditContext,
      changes: {
        eventId: { old: existingSchedule.eventId, new: null },
        userId: { old: existingSchedule.userId, new: null },
        ministryId: { old: existingSchedule.ministryId, new: null },
        position: { old: existingSchedule.position, new: null },
        userName: { old: existingSchedule.user.name, new: null },
        eventName: { old: existingSchedule.event.name, new: null },
        ministryName: { old: existingSchedule.ministry.name, new: null },
      },
      metadata: getRequestMetadata(request),
    })

    return Response.json({ message: "Escala removida com sucesso" })
  } catch (error) {
    console.error("Error deleting schedule:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
