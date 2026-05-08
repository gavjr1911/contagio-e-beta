import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getVolunteerSuggestions } from "@/lib/scheduling/suggestions"
import { suggestionsQuerySchema } from "@/lib/validations/auto-assign"

type RouteParams = {
  params: Promise<{ id: string }>
}

// ============================================
// Helper: Check if user has permission for ministry
// ============================================

async function hasMinistryPermission(
  userId: string,
  userRole: string,
  ministryId: string
): Promise<boolean> {
  // ADMIN has access to all ministries
  if (userRole === "ADMIN") {
    return true
  }

  // LEADER has access if they lead the ministry
  if (userRole === "LEADER") {
    const ministry = await prisma.ministry.findFirst({
      where: {
        id: ministryId,
        leaderId: userId,
      },
    })
    return !!ministry
  }

  return false
}

// ============================================
// GET /api/events/[id]/schedules/suggestions - Get volunteer suggestions
// ============================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    if (!userRole || !["ADMIN", "LEADER"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN ou LEADER podem ver sugestoes." },
        { status: 403 }
      )
    }

    const { id: eventId } = await params

    // Validate query params
    const searchParams = request.nextUrl.searchParams
    const queryParams: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      queryParams[key] = value
    })

    const queryResult = suggestionsQuerySchema.safeParse(queryParams)
    if (!queryResult.success) {
      return Response.json(
        { error: "Parametros invalidos", details: queryResult.error.flatten() },
        { status: 400 }
      )
    }

    const { ministryId, positionId, limit } = queryResult.data

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, date: true },
    })

    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Check permission for ministry
    const hasPermission = await hasMinistryPermission(
      session.user.id,
      userRole,
      ministryId
    )
    if (!hasPermission) {
      return Response.json(
        { error: "Acesso negado a este ministerio" },
        { status: 403 }
      )
    }

    // Verify ministry exists
    const ministry = await prisma.ministry.findUnique({
      where: { id: ministryId },
      select: { id: true, name: true },
    })

    if (!ministry) {
      return Response.json(
        { error: "Ministerio nao encontrado" },
        { status: 404 }
      )
    }

    // Get suggestions
    const result = await getVolunteerSuggestions({
      eventId,
      ministryId,
      positionId,
      limit: limit || 10,
    })

    return Response.json({
      data: {
        event: {
          id: event.id,
          name: event.name,
          date: event.date,
        },
        ministry: {
          id: ministry.id,
          name: ministry.name,
        },
        positionId: result.positionId,
        positionName: result.positionName,
        suggestions: result.suggestions.map((s) => ({
          userId: s.userId,
          userName: s.userName,
          userEmail: s.userEmail,
          userImage: s.userImage,
          memberId: s.memberId,
          score: s.score,
          factors: s.factors,
          reason: s.reason,
          positions: s.positions,
          lastScheduledAt: s.lastScheduledAt,
          totalSchedules: s.totalSchedules,
          ministrySchedules: s.ministrySchedules,
        })),
        total: result.suggestions.length,
      },
    })
  } catch (error) {
    console.error("Error getting suggestions:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
