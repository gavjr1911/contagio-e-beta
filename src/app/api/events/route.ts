import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  createEventSchema,
  eventFiltersSchema,
} from "@/lib/validations/event"
import {
  createRecurringEvents,
  copyVacanciesToEvent,
} from "@/lib/scheduling/recurrence"
import type { RecurrencePattern } from "@/generated/prisma/client"

// GET /api/events - List events with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const rawFilters = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      status: searchParams.get("status") || undefined,
      type: searchParams.get("type") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    }

    const parseResult = eventFiltersSchema.safeParse(rawFilters)

    if (!parseResult.success) {
      return Response.json(
        { error: "Parametros invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { startDate, endDate, status, type, page, limit } = parseResult.data
    const skip = (page - 1) * limit

    const where = {
      ...(startDate && { date: { gte: startDate } }),
      ...(endDate && { date: { lte: endDate } }),
      ...(status && { status }),
      ...(type && { type }),
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          template: { select: { id: true, name: true } },
          _count: {
            select: { schedules: true, items: true },
          },
        },
        orderBy: { date: "asc" },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ])

    return Response.json({
      data: events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching events:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// POST /api/events - Create event (ADMIN, COORDINATOR only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    if (!userRole || !["ADMIN", "COORDINATOR"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN e COORDINATOR podem criar eventos." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parseResult = createEventSchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const {
      name,
      type,
      date,
      startTime,
      endTime,
      status,
      templateId,
      isRecurring,
      recurrencePattern,
      recurrenceEndDate,
    } = parseResult.data

    // Validate templateId if provided
    if (templateId) {
      const templateExists = await prisma.eventTemplate.findUnique({
        where: { id: templateId },
      })
      if (!templateExists) {
        return Response.json(
          { error: "Template nao encontrado" },
          { status: 400 }
        )
      }
    }

    // Create the parent event
    const event = await prisma.event.create({
      data: {
        name,
        type,
        date,
        startTime,
        endTime,
        status,
        templateId,
        isRecurring: isRecurring ?? false,
        recurrencePattern: isRecurring
          ? (recurrencePattern as RecurrencePattern)
          : null,
        recurrenceEndDate: isRecurring && recurrenceEndDate
          ? new Date(recurrenceEndDate)
          : null,
      },
      include: {
        template: { select: { id: true, name: true } },
      },
    })

    // If recurring, create child events and copy vacancies
    let childEventsCount = 0
    if (isRecurring && recurrencePattern && recurrenceEndDate) {
      const childEventIds = await createRecurringEvents(
        {
          id: event.id,
          name: event.name,
          type: event.type,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          templateId: event.templateId,
        },
        {
          pattern: recurrencePattern as RecurrencePattern,
          endDate: new Date(recurrenceEndDate),
        }
      )

      childEventsCount = childEventIds.length

      // Copy vacancies from parent to all child events
      // Note: At this point, the parent event may not have vacancies yet
      // Vacancies will be copied when they are added to the parent
      // But if vacancies were created before (e.g., via template), copy them now
      for (const childEventId of childEventIds) {
        await copyVacanciesToEvent(event.id, childEventId)
      }
    }

    return Response.json(
      {
        data: event,
        ...(isRecurring && { childEventsCreated: childEventsCount }),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating event:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
