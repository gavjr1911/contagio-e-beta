import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  previewAutoAssign,
  executeAutoAssign,
} from "@/lib/scheduling/auto-assign"
import {
  autoAssignPreviewQuerySchema,
  autoAssignExecuteSchema,
} from "@/lib/validations/auto-assign"

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
  // ADMIN and COORDINATOR have access to all ministries
  if (userRole === "ADMIN" || userRole === "COORDINATOR") {
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
// GET /api/events/[id]/auto-assign - Preview auto-assign suggestions
// ============================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    if (!userRole || !["ADMIN", "COORDINATOR", "LEADER"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN, COORDINATOR ou LEADER podem visualizar preview." },
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

    const queryResult = autoAssignPreviewQuerySchema.safeParse(queryParams)
    if (!queryResult.success) {
      return Response.json(
        { error: "Parametros invalidos", details: queryResult.error.flatten() },
        { status: 400 }
      )
    }

    const { ministryId } = queryResult.data

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    })

    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // If specific ministry requested, check permission
    if (ministryId) {
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

      // Get preview for specific ministry
      const preview = await previewAutoAssign(eventId, ministryId)

      // Get ministry name
      const ministry = await prisma.ministry.findUnique({
        where: { id: ministryId },
        select: { id: true, name: true },
      })

      return Response.json({
        data: {
          ministries: [
            {
              ministryId: preview.ministryId,
              ministryName: ministry?.name || "Ministerio",
              vacancies: preview.vacancies.map((v) => ({
                vacancyId: v.vacancyId,
                positionName: v.positionName,
                quantity: v.quantity,
                filled: v.filledCount,
                candidates: v.candidates.map((c) => ({
                  userId: c.userId,
                  userName: c.userName,
                  score: c.score,
                  factors: c.factors,
                })),
              })),
            },
          ],
        },
      })
    }

    // Get all ministries with vacancies for this event
    const vacancies = await prisma.eventVacancy.findMany({
      where: { eventId },
      select: {
        ministryId: true,
        ministry: { select: { id: true, name: true, leaderId: true } },
      },
      distinct: ["ministryId"],
    })

    // Filter ministries based on user permission (for LEADER)
    const allowedMinistries =
      userRole === "ADMIN" || userRole === "COORDINATOR"
        ? vacancies
        : vacancies.filter((v) => v.ministry.leaderId === session.user.id)

    // Get preview for each ministry
    const ministriesPreview = await Promise.all(
      allowedMinistries.map(async (v) => {
        const preview = await previewAutoAssign(eventId, v.ministryId)
        return {
          ministryId: v.ministryId,
          ministryName: v.ministry.name,
          vacancies: preview.vacancies.map((vac) => ({
            vacancyId: vac.vacancyId,
            positionName: vac.positionName,
            quantity: vac.quantity,
            filled: vac.filledCount,
            candidates: vac.candidates.map((c) => ({
              userId: c.userId,
              userName: c.userName,
              score: c.score,
              factors: c.factors,
            })),
          })),
        }
      })
    )

    return Response.json({
      data: {
        ministries: ministriesPreview,
      },
    })
  } catch (error) {
    console.error("Error getting auto-assign preview:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/events/[id]/auto-assign - Execute auto-assign
// ============================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    if (!userRole || !["ADMIN", "COORDINATOR"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN e COORDINATOR podem executar distribuicao automatica." },
        { status: 403 }
      )
    }

    const { id: eventId } = await params

    // Parse body
    let body = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is allowed
    }

    const parseResult = autoAssignExecuteSchema.safeParse(body)
    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { ministryId } = parseResult.data

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    })

    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // If specific ministry, execute only for that ministry
    if (ministryId) {
      // Verify ministry exists
      const ministry = await prisma.ministry.findUnique({
        where: { id: ministryId },
        select: { id: true },
      })

      if (!ministry) {
        return Response.json(
          { error: "Ministerio nao encontrado" },
          { status: 404 }
        )
      }

      const result = await executeAutoAssign(eventId, ministryId)

      // Get user names for the response
      const userIds = result.assigned.map((a) => a.userId)
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      })
      const userMap = new Map(users.map((u) => [u.id, u.name]))

      return Response.json({
        data: {
          assigned: result.assigned.map((a) => ({
            vacancyId: a.vacancyId,
            userId: a.userId,
            userName: userMap.get(a.userId) || a.userId,
            score: a.score,
          })),
          unassigned: result.unassigned,
          totalAssigned: result.assigned.length,
          totalUnassigned: result.unassigned.length,
        },
      })
    }

    // Execute for all ministries with vacancies
    const vacancies = await prisma.eventVacancy.findMany({
      where: { eventId },
      select: { ministryId: true },
      distinct: ["ministryId"],
    })

    const allAssigned: Array<{
      vacancyId: string
      userId: string
      userName: string
      score: number
    }> = []
    const allUnassigned: string[] = []

    for (const v of vacancies) {
      const result = await executeAutoAssign(eventId, v.ministryId)

      // Get user names
      const userIds = result.assigned.map((a) => a.userId)
      if (userIds.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
        const userMap = new Map(users.map((u) => [u.id, u.name]))

        allAssigned.push(
          ...result.assigned.map((a) => ({
            vacancyId: a.vacancyId,
            userId: a.userId,
            userName: userMap.get(a.userId) || a.userId,
            score: a.score,
          }))
        )
      }

      allUnassigned.push(...result.unassigned)
    }

    return Response.json({
      data: {
        assigned: allAssigned,
        unassigned: allUnassigned,
        totalAssigned: allAssigned.length,
        totalUnassigned: allUnassigned.length,
      },
    })
  } catch (error) {
    console.error("Error executing auto-assign:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
