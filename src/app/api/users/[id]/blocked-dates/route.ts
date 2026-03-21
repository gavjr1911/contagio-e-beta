import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  createBlockedDateSchema,
  blockedDateFiltersSchema,
} from "@/lib/validations/schedule"

// GET /api/users/[id]/blocked-dates - List blocked dates for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: userId } = await params

    // Check if user can access this data
    const userRole = session.user.role
    const isOwner = userId === session.user.id
    const isAdminOrCoordinator =
      userRole && ["ADMIN", "COORDINATOR", "LEADER"].includes(userRole)

    if (!isOwner && !isAdminOrCoordinator) {
      return Response.json(
        { error: "Acesso negado." },
        { status: 403 }
      )
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return Response.json({ error: "Usuario nao encontrado" }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const rawFilters = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    }

    const parseResult = blockedDateFiltersSchema.safeParse(rawFilters)

    if (!parseResult.success) {
      return Response.json(
        { error: "Parametros invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { startDate, endDate, page, limit } = parseResult.data
    const skip = (page - 1) * limit

    const where = {
      userId,
      ...(startDate && { endDate: { gte: startDate } }),
      ...(endDate && { startDate: { lte: endDate } }),
    }

    const [blockedDates, total] = await Promise.all([
      prisma.blockedDate.findMany({
        where,
        orderBy: { startDate: "asc" },
        skip,
        take: limit,
      }),
      prisma.blockedDate.count({ where }),
    ])

    return Response.json({
      data: blockedDates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching blocked dates:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// POST /api/users/[id]/blocked-dates - Add blocked date
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: userId } = await params

    // Check if user can add blocked dates for this user
    const userRole = session.user.role
    const isOwner = userId === session.user.id
    const isAdminOrCoordinator =
      userRole && ["ADMIN", "COORDINATOR"].includes(userRole)

    if (!isOwner && !isAdminOrCoordinator) {
      return Response.json(
        { error: "Acesso negado." },
        { status: 403 }
      )
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return Response.json({ error: "Usuario nao encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const parseResult = createBlockedDateSchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { startDate, endDate, reason } = parseResult.data

    // Check for overlapping blocked dates
    const overlapping = await prisma.blockedDate.findFirst({
      where: {
        userId,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    })

    if (overlapping) {
      return Response.json(
        {
          error: "Ja existe uma data bloqueada que sobrepoe este periodo",
          overlapping: {
            id: overlapping.id,
            startDate: overlapping.startDate,
            endDate: overlapping.endDate,
          },
        },
        { status: 409 }
      )
    }

    const blockedDate = await prisma.blockedDate.create({
      data: {
        userId,
        startDate,
        endDate,
        reason,
      },
    })

    return Response.json({ data: blockedDate }, { status: 201 })
  } catch (error) {
    console.error("Error creating blocked date:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id]/blocked-dates - Remove blocked date
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: userId } = await params

    // Check if user can delete blocked dates for this user
    const userRole = session.user.role
    const isOwner = userId === session.user.id
    const isAdminOrCoordinator =
      userRole && ["ADMIN", "COORDINATOR"].includes(userRole)

    if (!isOwner && !isAdminOrCoordinator) {
      return Response.json(
        { error: "Acesso negado." },
        { status: 403 }
      )
    }

    // Get blocked date ID from query params
    const searchParams = request.nextUrl.searchParams
    const blockedDateId = searchParams.get("blockedDateId")

    if (!blockedDateId) {
      return Response.json(
        { error: "blockedDateId e obrigatorio" },
        { status: 400 }
      )
    }

    // Verify blocked date exists and belongs to this user
    const blockedDate = await prisma.blockedDate.findUnique({
      where: { id: blockedDateId },
    })

    if (!blockedDate) {
      return Response.json(
        { error: "Data bloqueada nao encontrada" },
        { status: 404 }
      )
    }

    if (blockedDate.userId !== userId) {
      return Response.json(
        { error: "Data bloqueada nao pertence a este usuario" },
        { status: 400 }
      )
    }

    await prisma.blockedDate.delete({ where: { id: blockedDateId } })

    return Response.json({ message: "Data bloqueada removida com sucesso" })
  } catch (error) {
    console.error("Error deleting blocked date:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
