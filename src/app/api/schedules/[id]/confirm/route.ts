import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

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

    // Only the scheduled user or admin/coordinator can confirm
    const userRole = session.user.role
    const isOwner = schedule.user.id === session.user.id
    const isAdminOrCoordinator =
      userRole && ["ADMIN", "COORDINATOR"].includes(userRole)

    if (!isOwner && !isAdminOrCoordinator) {
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
          select: { id: true, name: true, type: true },
        },
        event: {
          select: { id: true, name: true, date: true },
        },
      },
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
