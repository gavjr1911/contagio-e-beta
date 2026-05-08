import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { resolveEventId } from "@/lib/events"

// GET /api/events/[id]/attendance/history — lista todas as alterações de presença
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id: idOrSlug } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
      return Response.json({ error: "Evento não encontrado" }, { status: 404 })
    }

    const logs = await prisma.eventAttendanceLog.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        updatedBy: { select: { id: true, name: true } },
      },
    })

    return Response.json({ data: logs })
  } catch (error) {
    console.error("Error fetching attendance history:", error)
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
