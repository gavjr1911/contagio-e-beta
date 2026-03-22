import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createScheduleSchema } from "@/lib/validations/schedule"

// GET /api/events/[id]/schedules - List schedules for an event (by ministry)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: eventId } = await params
    const searchParams = request.nextUrl.searchParams
    const ministryId = searchParams.get("ministryId")

    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    const where = {
      eventId,
      ...(ministryId && { ministryId }),
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        ministry: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ ministry: { name: "asc" } }, { createdAt: "asc" }],
    })

    // Group by ministry
    const groupedByMinistry = schedules.reduce(
      (acc, schedule) => {
        const ministryId = schedule.ministry.id
        if (!acc[ministryId]) {
          acc[ministryId] = {
            ministry: schedule.ministry,
            schedules: [],
          }
        }
        acc[ministryId].schedules.push({
          id: schedule.id,
          user: schedule.user,
          position: schedule.position,
          status: schedule.status,
          confirmedAt: schedule.confirmedAt,
          createdAt: schedule.createdAt,
        })
        return acc
      },
      {} as Record<string, { ministry: typeof schedules[0]["ministry"]; schedules: unknown[] }>
    )

    return Response.json({
      data: Object.values(groupedByMinistry),
      raw: schedules,
    })
  } catch (error) {
    console.error("Error fetching event schedules:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// POST /api/events/[id]/schedules - Create schedule (assign volunteer)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    if (!userRole || !["ADMIN", "COORDINATOR", "LEADER"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN, COORDINATOR ou LEADER podem criar escalas." },
        { status: 403 }
      )
    }

    const { id: eventId } = await params

    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const parseResult = createScheduleSchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { userId, ministryId, position } = parseResult.data

    // Validate user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return Response.json(
        { error: "Usuario nao encontrado" },
        { status: 400 }
      )
    }

    // Validate ministry exists
    const ministry = await prisma.ministry.findUnique({
      where: { id: ministryId },
    })
    if (!ministry) {
      return Response.json(
        { error: "Ministerio nao encontrado" },
        { status: 400 }
      )
    }

    // Check if user is already scheduled for this ministry in this event
    const existingSchedule = await prisma.schedule.findUnique({
      where: {
        eventId_ministryId_userId: {
          eventId,
          ministryId,
          userId,
        },
      },
    })
    if (existingSchedule) {
      return Response.json(
        { error: "Usuario ja esta escalado neste ministerio para este evento" },
        { status: 409 }
      )
    }

    // Check for conflict: user already scheduled in ANOTHER ministry for the same event
    const conflictingSchedule = await prisma.schedule.findFirst({
      where: {
        eventId,
        userId,
        ministryId: { not: ministryId },
      },
      include: {
        ministry: { select: { name: true } },
      },
    })
    if (conflictingSchedule) {
      return Response.json(
        {
          error: `Conflito: usuario ja esta escalado no ministerio "${conflictingSchedule.ministry.name}" para este evento`,
          conflict: {
            scheduleId: conflictingSchedule.id,
            ministryName: conflictingSchedule.ministry.name,
          },
        },
        { status: 409 }
      )
    }

    // Check if user has blocked date for the event date
    const blockedDate = await prisma.blockedDate.findFirst({
      where: {
        userId,
        startDate: { lte: event.date },
        endDate: { gte: event.date },
      },
    })
    if (blockedDate) {
      return Response.json(
        {
          error: "Usuario possui data bloqueada para este periodo",
          blockedDate: {
            id: blockedDate.id,
            startDate: blockedDate.startDate,
            endDate: blockedDate.endDate,
            reason: blockedDate.reason,
          },
        },
        { status: 409 }
      )
    }

    const schedule = await prisma.schedule.create({
      data: {
        eventId,
        userId,
        ministryId,
        position,
        status: "PENDING",
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

    return Response.json({ data: schedule }, { status: 201 })
  } catch (error) {
    console.error("Error creating schedule:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
