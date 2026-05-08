import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  createTemplateSchema,
  templateQuerySchema,
} from "@/lib/validations/template"

// GET /api/templates - List templates
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const rawQuery = {
      search: searchParams.get("search") || undefined,
      eventType: searchParams.get("eventType") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    }

    const parseResult = templateQuerySchema.safeParse(rawQuery)

    if (!parseResult.success) {
      return Response.json(
        { error: "Parametros invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { search, eventType, page, limit } = parseResult.data
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    if (eventType) {
      where.eventType = eventType
    }

    const [templates, total] = await Promise.all([
      prisma.eventTemplate.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { events: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.eventTemplate.count({ where }),
    ])

    return Response.json({
      data: templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching templates:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// POST /api/templates - Create template (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    if (userRole !== "ADMIN") {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN pode criar templates." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parseResult = createTemplateSchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { name, description, eventType, duration, defaultSchedules, defaultItems } =
      parseResult.data

    // Validate ministries and positions if defaultSchedules is provided
    if (defaultSchedules && defaultSchedules.length > 0) {
      const ministryIds = [...new Set(defaultSchedules.map((s) => s.ministryId))]
      const positionIds = [...new Set(defaultSchedules.map((s) => s.positionId))]

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

      const existingMinistryIds = new Set(ministries.map((m) => m.id))
      const existingPositionIds = new Set(positions.map((p) => p.id))
      const positionMinistryMap = new Map(positions.map((p) => [p.id, p.ministryId]))

      for (const schedule of defaultSchedules) {
        if (!existingMinistryIds.has(schedule.ministryId)) {
          return Response.json(
            { error: `Ministerio ${schedule.ministryId} nao encontrado` },
            { status: 400 }
          )
        }
        if (!existingPositionIds.has(schedule.positionId)) {
          return Response.json(
            { error: `Funcao ${schedule.positionId} nao encontrada` },
            { status: 400 }
          )
        }
        if (positionMinistryMap.get(schedule.positionId) !== schedule.ministryId) {
          return Response.json(
            { error: `Funcao ${schedule.positionId} nao pertence ao ministerio ${schedule.ministryId}` },
            { status: 400 }
          )
        }
      }
    }

    const template = await prisma.eventTemplate.create({
      data: {
        name,
        description,
        eventType,
        duration,
        defaultSchedules: defaultSchedules || [],
        defaultItems: defaultItems || [],
        createdById: session.user.id!,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return Response.json({ data: template }, { status: 201 })
  } catch (error) {
    console.error("Error creating template:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
