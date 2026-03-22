import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { scheduleFiltersSchema } from "@/lib/validations/schedule"

// GET /api/schedules - List schedules with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const rawFilters = {
      userId: searchParams.get("userId") || undefined,
      eventId: searchParams.get("eventId") || undefined,
      ministryId: searchParams.get("ministryId") || undefined,
      status: searchParams.get("status") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    }

    const parseResult = scheduleFiltersSchema.safeParse(rawFilters)

    if (!parseResult.success) {
      return Response.json(
        { error: "Parametros invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const {
      userId,
      eventId,
      ministryId,
      status,
      startDate,
      endDate,
      page,
      limit,
    } = parseResult.data
    const skip = (page - 1) * limit

    // Regular users can only see their own schedules
    const userRole = session.user.role
    const isAdminOrCoordinator =
      userRole && ["ADMIN", "COORDINATOR", "LEADER"].includes(userRole)

    let effectiveUserId = userId
    if (!isAdminOrCoordinator && userId !== session.user.id) {
      // Non-admin users can only query their own schedules
      effectiveUserId = session.user.id
    }

    const where = {
      ...(effectiveUserId && { userId: effectiveUserId }),
      ...(eventId && { eventId }),
      ...(ministryId && { ministryId }),
      ...(status && { status }),
      ...(startDate || endDate
        ? {
            event: {
              date: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            },
          }
        : {}),
    }

    const [schedules, total] = await Promise.all([
      prisma.schedule.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
          ministry: {
            select: { id: true, name: true },
          },
          event: {
            select: {
              id: true,
              name: true,
              type: true,
              date: true,
              startTime: true,
              status: true,
            },
          },
        },
        orderBy: [{ event: { date: "asc" } }, { createdAt: "asc" }],
        skip,
        take: limit,
      }),
      prisma.schedule.count({ where }),
    ])

    return Response.json({
      data: schedules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching schedules:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
