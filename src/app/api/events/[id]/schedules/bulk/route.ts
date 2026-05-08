import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { formatDateToISO } from "@/lib/date-utils"
import { z } from "zod"
import { sendScheduleInvite } from "@/lib/email/send"

// Schema for bulk schedule item
const bulkScheduleItemSchema = z.object({
  userId: z.string().min(1, "ID do usuario invalido"),
  ministryId: z.string().min(1, "ID do ministerio invalido"),
  vacancyId: z.string().min(1, "ID da vaga invalido").optional(),
  position: z.string().max(100).optional(),
})

// Schema for bulk schedule request
const bulkScheduleSchema = z.object({
  schedules: z.array(bulkScheduleItemSchema).min(1, "Pelo menos uma escala e necessaria"),
  sendNotifications: z.boolean().optional().default(true),
})

export type BulkScheduleItem = z.infer<typeof bulkScheduleItemSchema>

// Response types
export interface BulkScheduleResult {
  userId: string
  ministryId: string
  success: boolean
  scheduleId?: string
  error?: string
  warnings?: string[]
}

export interface TimeConflict {
  eventId: string
  eventName: string
  eventDate: string
  startTime: string
  endTime: string | null
  ministryName: string
  conflictType: "same_event" | "overlapping" | "close_proximity"
}

// Helper function to check for time conflicts
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
      event: true,
      ministry: true,
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

    // Same event
    if (schedule.eventId === eventId) {
      // This is handled separately as a blocking error
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

// POST /api/events/[id]/schedules/bulk - Create multiple schedules
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

    const { id: eventId } = await params

    const body = await request.json()
    const parseResult = bulkScheduleSchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { schedules: scheduleRequests, sendNotifications } = parseResult.data

    // LEADER so pode escalar em ministerios que lidera
    if (session.user.role === "LEADER") {
      const ministryIds = [...new Set(scheduleRequests.map((s: BulkScheduleItem) => s.ministryId))]
      const leaderMinistries = await prisma.ministry.findMany({
        where: { id: { in: ministryIds }, leaderId: session.user.id },
        select: { id: true },
      })
      const owned = new Set(leaderMinistries.map((m) => m.id))
      const invalid = ministryIds.filter((id) => !owned.has(id))
      if (invalid.length > 0) {
        return Response.json({ error: "Você não lidera todos os ministérios indicados" }, { status: 403 })
      }
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        schedules: {
          select: { userId: true, ministryId: true },
        },
      },
    })
    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    const results: BulkScheduleResult[] = []
    const createdSchedules: Array<{
      id: string
      userId: string
      ministryId: string
      position: string | null
      event: { id: string; name: string; date: Date; startTime: Date }
      ministry: { id: string; name: string }
      user: { id: string; name: string | null; email: string | null }
    }> = []

    // Pre-validate all requests
    const userIds = [...new Set(scheduleRequests.map((s) => s.userId))]
    const ministryIds = [...new Set(scheduleRequests.map((s) => s.ministryId))]
    const vacancyIds = scheduleRequests
      .filter((s) => s.vacancyId)
      .map((s) => s.vacancyId as string)

    // Batch fetch users, ministries, and vacancies
    const [users, ministries, vacancies, blockedDates] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      }),
      prisma.ministry.findMany({
        where: { id: { in: ministryIds } },
        select: { id: true, name: true },
      }),
      vacancyIds.length > 0
        ? prisma.eventVacancy.findMany({
            where: {
              id: { in: vacancyIds },
              eventId,
            },
            select: { id: true, ministryId: true, positionId: true },
          })
        : Promise.resolve([]),
      prisma.blockedDate.findMany({
        where: {
          userId: { in: userIds },
          startDate: { lte: event.date },
          endDate: { gte: event.date },
        },
        select: { userId: true, startDate: true, endDate: true, reason: true },
      }),
    ])

    const userMap = new Map(users.map((u) => [u.id, u]))
    const ministryMap = new Map(ministries.map((m) => [m.id, m]))
    const vacancyMap = new Map(vacancies.map((v) => [v.id, v]))
    const blockedDateMap = new Map<string, typeof blockedDates[0]>()
    blockedDates.forEach((bd) => blockedDateMap.set(bd.userId, bd))

    // Existing schedules lookup
    const existingScheduleSet = new Set(
      event.schedules.map((s) => `${s.userId}-${s.ministryId}`)
    )

    // Process each schedule request
    for (const scheduleReq of scheduleRequests) {
      const { userId, ministryId, vacancyId, position } = scheduleReq
      const warnings: string[] = []

      // Validate user
      const user = userMap.get(userId)
      if (!user) {
        results.push({
          userId,
          ministryId,
          success: false,
          error: "Usuario nao encontrado",
        })
        continue
      }

      // Validate ministry
      const ministry = ministryMap.get(ministryId)
      if (!ministry) {
        results.push({
          userId,
          ministryId,
          success: false,
          error: "Ministerio nao encontrado",
        })
        continue
      }

      // Check if already scheduled in this ministry for this event
      if (existingScheduleSet.has(`${userId}-${ministryId}`)) {
        results.push({
          userId,
          ministryId,
          success: false,
          error: "Usuario ja esta escalado neste ministerio para este evento",
        })
        continue
      }

      // Check for blocked date
      const blockedDate = blockedDateMap.get(userId)
      if (blockedDate) {
        results.push({
          userId,
          ministryId,
          success: false,
          error: `Usuario possui data bloqueada: ${blockedDate.reason || "Indisponivel"}`,
        })
        continue
      }

      // Validate vacancy if provided
      if (vacancyId) {
        const vacancy = vacancyMap.get(vacancyId)
        if (!vacancy) {
          results.push({
            userId,
            ministryId,
            success: false,
            error: "Vaga nao encontrada ou nao pertence a este evento",
          })
          continue
        }
        if (vacancy.ministryId !== ministryId) {
          results.push({
            userId,
            ministryId,
            success: false,
            error: "Vaga nao pertence ao ministerio especificado",
          })
          continue
        }
      }

      // Check for time conflicts (warnings only)
      const timeConflicts = await checkTimeConflicts(
        userId,
        eventId,
        event.date,
        event.startTime,
        event.endTime
      )

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

      // Check for conflict in another ministry for the same event
      const conflictingMinistry = event.schedules.find(
        (s) => s.userId === userId && s.ministryId !== ministryId
      )
      if (conflictingMinistry) {
        const conflictMinistryData = ministryMap.get(conflictingMinistry.ministryId)
        warnings.push(
          `Usuario ja escalado em outro ministerio (${conflictMinistryData?.name || "desconhecido"})`
        )
      }

      // Create the schedule
      try {
        const schedule = await prisma.schedule.create({
          data: {
            eventId,
            userId,
            ministryId,
            vacancyId,
            status: "PENDING",
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
            ministry: { select: { id: true, name: true } },
            event: { select: { id: true, name: true, date: true, startTime: true } },
          },
        })

        // Add to existing set to prevent duplicates within the same request
        existingScheduleSet.add(`${userId}-${ministryId}`)

        createdSchedules.push(schedule)

        results.push({
          userId,
          ministryId,
          success: true,
          scheduleId: schedule.id,
          warnings: warnings.length > 0 ? warnings : undefined,
        })
      } catch (error) {
        console.error("Error creating schedule:", error)
        results.push({
          userId,
          ministryId,
          success: false,
          error: "Erro ao criar escala",
        })
      }
    }

    // Send notifications in batch (non-blocking)
    if (sendNotifications && createdSchedules.length > 0) {
      // Fire and forget - don't wait for emails
      Promise.all(
        createdSchedules.map((schedule) =>
          sendScheduleInvite({
            id: schedule.id,
            eventId: schedule.event.id,
            ministryId: schedule.ministry.id,
            userId: schedule.user.id,
            position: schedule.position,
            status: "PENDING",
            event: {
              id: schedule.event.id,
              name: schedule.event.name,
              date: schedule.event.date,
              startTime: schedule.event.startTime,
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
          }).catch((err) =>
            console.error(`Failed to send invite to ${schedule.user.email}:`, err)
          )
        )
      )
    }

    // Calculate summary
    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length
    const warningCount = results.filter((r) => r.warnings && r.warnings.length > 0).length

    return Response.json(
      {
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            success: successCount,
            failed: failureCount,
            withWarnings: warningCount,
          },
          notificationsSent: sendNotifications && createdSchedules.length > 0,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error in bulk schedule creation:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// GET /api/events/[id]/schedules/bulk/conflicts - Check conflicts for multiple users
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
    const userIdsParam = searchParams.get("userIds")

    if (!userIdsParam) {
      return Response.json(
        { error: "userIds e obrigatorio" },
        { status: 400 }
      )
    }

    const userIds = userIdsParam.split(",").filter(Boolean)

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    const conflictsByUser: Record<string, TimeConflict[]> = {}

    for (const userId of userIds) {
      const conflicts = await checkTimeConflicts(
        userId,
        eventId,
        event.date,
        event.startTime,
        event.endTime
      )
      if (conflicts.length > 0) {
        conflictsByUser[userId] = conflicts
      }
    }

    return Response.json({
      success: true,
      data: conflictsByUser,
    })
  } catch (error) {
    console.error("Error checking conflicts:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
