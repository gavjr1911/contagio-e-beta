import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { declineScheduleSchema } from "@/lib/validations/schedule"

// POST /api/schedules/[id]/decline - Decline schedule participation
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

    // Only the scheduled user or admin/coordinator can decline
    const userRole = session.user.role
    const isOwner = schedule.user.id === session.user.id
    const isAdminOrCoordinator =
      userRole && ["ADMIN", "COORDINATOR"].includes(userRole)

    if (!isOwner && !isAdminOrCoordinator) {
      return Response.json(
        { error: "Acesso negado. Apenas o usuario escalado pode recusar." },
        { status: 403 }
      )
    }

    // Check if event is still open for declining
    if (schedule.event.status === "COMPLETED") {
      return Response.json(
        { error: "Evento ja foi concluido. Nao e possivel recusar." },
        { status: 400 }
      )
    }

    // Check if already declined
    if (schedule.status === "DECLINED") {
      return Response.json(
        { error: "Escala ja foi recusada." },
        { status: 400 }
      )
    }

    // Parse optional reason from body
    let reason: string | undefined
    try {
      const body = await request.json()
      const parseResult = declineScheduleSchema.safeParse(body)
      if (parseResult.success) {
        reason = parseResult.data.reason
      }
    } catch {
      // Body is optional, ignore parse errors
    }

    const updatedSchedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        status: "DECLINED",
        confirmedAt: null,
        declinedReason: reason || null,
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

    return Response.json({
      message: "Escala recusada com sucesso",
      data: updatedSchedule,
    })
  } catch (error) {
    console.error("Error declining schedule:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
