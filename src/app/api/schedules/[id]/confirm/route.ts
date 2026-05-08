import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { logAuditAsync, getAuditContext, getRequestMetadata } from "@/lib/audit"

// POST /api/schedules/[id]/confirm - Confirm schedule participation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: scheduleId } = await params

    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        user: { select: { id: true } },
        event: { select: { id: true, name: true, date: true, status: true } },
      },
    })

    if (!schedule) {
      return Response.json({ error: "Escala nao encontrada" }, { status: 404 })
    }

    // Only the scheduled user or admin can confirm
    const userRole = session.user.role
    const isOwner = schedule.user.id === session.user.id
    const isAdmin = userRole === "ADMIN"

    if (!isOwner && !isAdmin) {
      return Response.json(
        { error: "Acesso negado. Apenas o usuario escalado pode confirmar." },
        { status: 403 }
      )
    }

    // Check if event is still open for confirmation
    if (schedule.event.status === "COMPLETED") {
      return Response.json(
        { error: "Evento ja foi concluido. Nao e possivel confirmar." },
        { status: 400 }
      )
    }

    // Check if already confirmed
    if (schedule.status === "CONFIRMED") {
      return Response.json(
        { error: "Escala ja esta confirmada." },
        { status: 400 }
      )
    }

    const previousStatus = schedule.status

    const updatedSchedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        declinedReason: null,
      },
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
    logAuditAsync({
      entityType: "Schedule",
      entityId: scheduleId,
      action: "confirmed",
      ...auditContext,
      changes: {
        status: { old: previousStatus, new: "CONFIRMED" },
        userName: { old: null, new: updatedSchedule.user.name },
        eventName: { old: null, new: updatedSchedule.event.name },
        ministryName: { old: null, new: updatedSchedule.ministry.name },
      },
      metadata: getRequestMetadata(request),
    })

    return Response.json({
      message: "Escala confirmada com sucesso",
      data: updatedSchedule,
    })
  } catch (error) {
    console.error("Error confirming schedule:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
