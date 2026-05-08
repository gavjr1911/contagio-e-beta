import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { formatDateToISO } from "@/lib/date-utils"
import { createScheduleSchema } from "@/lib/validations/schedule"
import { sendScheduleInvite } from "@/lib/email"
import { logAuditAsync, getAuditContext, getRequestMetadata } from "@/lib/audit"
import { resolveEventId } from "@/lib/events"

// Helper function to check for time conflicts
interface TimeConflict {
  eventId: string
  eventName: string
  eventDate: string
  startTime: string
  endTime: string | null
  ministryName: string
  conflictType: "same_event" | "overlapping" | "close_proximity"
}

async function checkTimeConflicts(
  userId: string,
  eventId: string,
  eventDate: Date,
  startTime: Date,
  endTime: Date | null
): Promise<TimeConflict[]> {
  const conflicts: TimeConflict[] = []

  // Calculate time window: 1 hour before and after
  const eventStart = new Date(eventDate)
  eventStart.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0)

  const eventEnd = endTime
    ? new Date(eventDate).setHours(endTime.getHours(), endTime.getMinutes(), 0, 0)
    : new Date(eventStart.getTime() + 2 * 60 * 60 * 1000) // Default 2 hours if no end time

  // Get all schedules for the user on the same date
  const dateStart = new Date(eventDate)
  dateStart.setHours(0, 0, 0, 0)
  const dateEnd = new Date(eventDate)
  dateEnd.setHours(23, 59, 59, 999)

  const existingSchedules = await prisma.schedule.findMany({
    where: {
      userId,
      event: {
        date: {
          gte: dateStart,
          lte: dateEnd,
        },
      },
    },
    include: {
      event: { select: { id: true, name: true, startTime: true, endTime: true, date: true } },
      ministry: { select: { id: true, name: true } },
    },
  })

  for (const schedule of existingSchedules) {
    const scheduleEventDate = new Date(schedule.event.date)
    const scheduleStart = new Date(scheduleEventDate)
    scheduleStart.setHours(
      schedule.event.startTime.getHours(),
      schedule.event.startTime.getMinutes(),
      0,
      0
    )

    const scheduleEnd = schedule.event.endTime
      ? new Date(scheduleEventDate).setHours(
          schedule.event.endTime.getHours(),
          schedule.event.endTime.getMinutes(),
          0,
          0
        )
      : new Date(scheduleStart.getTime() + 2 * 60 * 60 * 1000)

    // Same event - skip
    if (schedule.eventId === eventId) {
      continue
    }

    // Check for overlapping times
    const eventStartTime = eventStart.getTime()
    const eventEndTime = typeof eventEnd === "number" ? eventEnd : eventEnd.getTime()
    const scheduleStartTime = scheduleStart.getTime()
    const scheduleEndTime = typeof scheduleEnd === "number" ? scheduleEnd : scheduleEnd.getTime()

    // Check if times overlap
    if (eventStartTime < scheduleEndTime && eventEndTime > scheduleStartTime) {
      conflicts.push({
        eventId: schedule.event.id,
        eventName: schedule.event.name,
        eventDate: formatDateToISO(schedule.event.date),
        startTime: schedule.event.startTime.toTimeString().substring(0, 5),
        endTime: schedule.event.endTime?.toTimeString().substring(0, 5) || null,
        ministryName: schedule.ministry.name,
        conflictType: "overlapping",
      })
      continue
    }

    // Check for close proximity (within 1 hour)
    const oneHour = 60 * 60 * 1000
    const timeDiff = Math.min(
      Math.abs(eventStartTime - scheduleEndTime),
      Math.abs(scheduleStartTime - eventEndTime)
    )

    if (timeDiff <= oneHour) {
      conflicts.push({
        eventId: schedule.event.id,
        eventName: schedule.event.name,
        eventDate: formatDateToISO(schedule.event.date),
        startTime: schedule.event.startTime.toTimeString().substring(0, 5),
        endTime: schedule.event.endTime?.toTimeString().substring(0, 5) || null,
        ministryName: schedule.ministry.name,
        conflictType: "close_proximity",
      })
    }
  }

  return conflicts
}

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

    const { id: idOrSlug } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }
    const searchParams = request.nextUrl.searchParams
    const ministryId = searchParams.get("ministryId")

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
        vacancy: {
          select: {
            id: true,
            positionId: true,
            position: { select: { id: true, name: true } },
          },
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
          vacancyId: schedule.vacancyId,
          vacancy: schedule.vacancy,
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
    if (!userRole || !["ADMIN", "LEADER"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN ou LEADER podem criar escalas." },
        { status: 403 }
      )
    }

    const { id: idOrSlug } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

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

    const { userId, ministryId, vacancyId, position } = parseResult.data

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

    // Validate vacancy if provided
    if (vacancyId) {
      const vacancy = await prisma.eventVacancy.findFirst({
        where: {
          id: vacancyId,
          eventId,
          ministryId,
        },
      })
      if (!vacancy) {
        return Response.json(
          { error: "Vaga nao encontrada ou nao pertence a este evento/ministerio" },
          { status: 400 }
        )
      }
    }

    // Check for time conflicts with other events (warnings only, not blocking)
    const timeConflicts = await checkTimeConflicts(
      userId,
      eventId,
      event.date,
      event.startTime,
      event.endTime
    )

    const warnings: string[] = []
    for (const conflict of timeConflicts) {
      if (conflict.conflictType === "overlapping") {
        warnings.push(
          `Conflito de horario com "${conflict.eventName}" (${conflict.startTime})`
        )
      } else if (conflict.conflictType === "close_proximity") {
        warnings.push(
          `Proximo ao evento "${conflict.eventName}" (menos de 1h de intervalo)`
        )
      }
    }

    const schedule = await prisma.schedule.create({
      data: {
        eventId,
        userId,
        ministryId,
        vacancyId,
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
          select: { id: true, name: true, date: true, startTime: true, endTime: true },
        },
      },
    })

    // Envia email de convite para o voluntario escalado (em background)
    if (schedule.user.email) {
      sendScheduleInvite({
        id: schedule.id,
        eventId: schedule.event.id,
        ministryId: schedule.ministry.id,
        userId: schedule.user.id,
        position: position || null,
        status: "PENDING",
        event: {
          id: schedule.event.id,
          name: schedule.event.name,
          date: schedule.event.date,
          startTime: schedule.event.startTime,
          endTime: schedule.event.endTime,
        },
        ministry: {
          id: schedule.ministry.id,
          name: schedule.ministry.name,
        },
        user: {
          id: schedule.user.id,
          name: schedule.user.name,
          email: schedule.user.email,
        },
      }).catch((error) => {
        console.error("[Schedule] Erro ao enviar email de convite:", error)
      })
    }

    // Registrar auditoria
    const auditContext = getAuditContext(session)
    logAuditAsync({
      entityType: "Schedule",
      entityId: schedule.id,
      action: "created",
      ...auditContext,
      changes: {
        eventId: { old: null, new: eventId },
        userId: { old: null, new: userId },
        ministryId: { old: null, new: ministryId },
        position: { old: null, new: position || null },
        userName: { old: null, new: schedule.user.name },
        eventName: { old: null, new: schedule.event.name },
        ministryName: { old: null, new: schedule.ministry.name },
      },
      metadata: getRequestMetadata(request),
    })

    return Response.json({
      data: schedule,
      warnings: warnings.length > 0 ? warnings : undefined,
      timeConflicts: timeConflicts.length > 0 ? timeConflicts : undefined,
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating schedule:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
