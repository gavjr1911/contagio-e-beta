import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  createVacancySchema,
  createBulkVacanciesSchema,
} from "@/lib/validations/vacancy"
import { resolveEventId } from "@/lib/events"

// GET /api/events/[id]/vacancies - List event vacancies with filled count
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

    const vacancies = await prisma.eventVacancy.findMany({
      where: { eventId },
      include: {
        ministry: {
          select: { id: true, name: true },
        },
        position: {
          select: { id: true, name: true },
        },
        _count: {
          select: { schedules: true },
        },
      },
      orderBy: [{ ministry: { name: "asc" } }, { position: { name: "asc" } }],
    })

    // Transform to add filled and remaining counts
    const vacanciesWithCounts = vacancies.map((vacancy: typeof vacancies[number]) => ({
      id: vacancy.id,
      eventId: vacancy.eventId,
      ministryId: vacancy.ministryId,
      positionId: vacancy.positionId,
      quantity: vacancy.quantity,
      ministry: vacancy.ministry,
      position: vacancy.position,
      _count: vacancy._count,
      filled: vacancy._count.schedules,
      remaining: Math.max(0, vacancy.quantity - vacancy._count.schedules),
    }))

    return Response.json({ data: vacanciesWithCounts })
  } catch (error) {
    console.error("Error fetching event vacancies:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// POST /api/events/[id]/vacancies - Create vacancy (single or bulk)
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
    if (userRole !== "ADMIN") {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN pode gerenciar vagas." },
        { status: 403 }
      )
    }

    const { id: idOrSlug } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    const body = await request.json()

    // Check if it's a bulk creation request
    const bulkParseResult = createBulkVacanciesSchema.safeParse(body)
    if (bulkParseResult.success) {
      // Bulk creation
      const { vacancies: vacanciesData } = bulkParseResult.data

      // Validate all ministries and positions exist
      const ministryIds = [...new Set(vacanciesData.map((v) => v.ministryId))]
      const positionIds = [...new Set(vacanciesData.map((v) => v.positionId))]

      const [ministries, positions] = await Promise.all([
        prisma.ministry.findMany({
          where: { id: { in: ministryIds } },
          select: { id: true },
        }),
        prisma.ministryPosition.findMany({
          where: { id: { in: positionIds } },
          select: { id: true, ministryId: true },
        }),
      ])

      const existingMinistryIds = new Set(ministries.map((m: { id: string }) => m.id))
      const existingPositionIds = new Set(positions.map((p: { id: string; ministryId: string }) => p.id))
      const positionMinistryMap = new Map(
        positions.map((p: { id: string; ministryId: string }) => [p.id, p.ministryId])
      )

      // Validate all references
      for (const v of vacanciesData) {
        if (!existingMinistryIds.has(v.ministryId)) {
          return Response.json(
            { error: `Ministerio ${v.ministryId} nao encontrado` },
            { status: 400 }
          )
        }
        if (!existingPositionIds.has(v.positionId)) {
          return Response.json(
            { error: `Funcao ${v.positionId} nao encontrada` },
            { status: 400 }
          )
        }
        if (positionMinistryMap.get(v.positionId) !== v.ministryId) {
          return Response.json(
            { error: `Funcao ${v.positionId} nao pertence ao ministerio ${v.ministryId}` },
            { status: 400 }
          )
        }
      }

      // Check for existing vacancies
      const existingVacancies = await prisma.eventVacancy.findMany({
        where: {
          eventId,
          OR: vacanciesData.map((v) => ({
            ministryId: v.ministryId,
            positionId: v.positionId,
          })),
        },
        select: { ministryId: true, positionId: true },
      })

      const existingKeys = new Set(
        existingVacancies.map((v: { ministryId: string; positionId: string }) => `${v.ministryId}-${v.positionId}`)
      )

      // Filter out existing vacancies and prepare data for creation
      const toCreate = vacanciesData.filter(
        (v) => !existingKeys.has(`${v.ministryId}-${v.positionId}`)
      )

      if (toCreate.length === 0) {
        return Response.json(
          { error: "Todas as vagas ja existem para este evento" },
          { status: 409 }
        )
      }

      const createdVacancies = await prisma.eventVacancy.createMany({
        data: toCreate.map((v) => ({
          eventId,
          ministryId: v.ministryId,
          positionId: v.positionId,
          quantity: v.quantity,
        })),
      })

      // Fetch the created vacancies with relations
      const vacancies = await prisma.eventVacancy.findMany({
        where: {
          eventId,
          OR: toCreate.map((v) => ({
            ministryId: v.ministryId,
            positionId: v.positionId,
          })),
        },
        include: {
          ministry: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
          _count: { select: { schedules: true } },
        },
      })

      const vacanciesWithCounts = vacancies.map((vacancy: typeof vacancies[number]) => ({
        id: vacancy.id,
        eventId: vacancy.eventId,
        ministryId: vacancy.ministryId,
        positionId: vacancy.positionId,
        quantity: vacancy.quantity,
        ministry: vacancy.ministry,
        position: vacancy.position,
        _count: vacancy._count,
        filled: vacancy._count.schedules,
        remaining: Math.max(0, vacancy.quantity - vacancy._count.schedules),
      }))

      return Response.json(
        {
          data: vacanciesWithCounts,
          created: createdVacancies.count,
          skipped: vacanciesData.length - toCreate.length,
        },
        { status: 201 }
      )
    }

    // Single vacancy creation
    const parseResult = createVacancySchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        {
          error: "Dados invalidos",
          details: parseResult.error.flatten(),
          bulkDetails: bulkParseResult.error?.flatten(),
        },
        { status: 400 }
      )
    }

    const { ministryId, positionId, quantity } = parseResult.data

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

    // Validate position exists and belongs to the ministry
    const position = await prisma.ministryPosition.findUnique({
      where: { id: positionId },
    })
    if (!position) {
      return Response.json(
        { error: "Funcao nao encontrada" },
        { status: 400 }
      )
    }
    if (position.ministryId !== ministryId) {
      return Response.json(
        { error: "Funcao nao pertence ao ministerio especificado" },
        { status: 400 }
      )
    }

    // Check if vacancy already exists
    const existingVacancy = await prisma.eventVacancy.findUnique({
      where: {
        eventId_ministryId_positionId: {
          eventId,
          ministryId,
          positionId,
        },
      },
    })
    if (existingVacancy) {
      return Response.json(
        { error: "Vaga ja existe para esta funcao neste evento" },
        { status: 409 }
      )
    }

    const vacancy = await prisma.eventVacancy.create({
      data: {
        eventId,
        ministryId,
        positionId,
        quantity,
      },
      include: {
        ministry: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        _count: { select: { schedules: true } },
      },
    })

    return Response.json(
      {
        data: {
          id: vacancy.id,
          eventId: vacancy.eventId,
          ministryId: vacancy.ministryId,
          positionId: vacancy.positionId,
          quantity: vacancy.quantity,
          ministry: vacancy.ministry,
          position: vacancy.position,
          _count: vacancy._count,
          filled: vacancy._count.schedules,
          remaining: vacancy.quantity - vacancy._count.schedules,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating event vacancy:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
