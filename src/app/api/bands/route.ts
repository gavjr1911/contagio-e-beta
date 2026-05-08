import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { bandCreateSchema, bandQuerySchema } from "@/lib/validations/music"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const queryResult = bandQuerySchema.safeParse({
      search: searchParams.get("search") || undefined,
      active: searchParams.get("active") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    })

    if (!queryResult.success) {
      return Response.json(
        { error: "Parametros invalidos", details: queryResult.error.flatten() },
        { status: 400 }
      )
    }

    const { search, active, page, limit } = queryResult.data
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.name = { contains: search, mode: "insensitive" }
    }

    if (active !== "all") {
      where.active = active === "true"
    }

    const [bands, total] = await Promise.all([
      prisma.band.findMany({
        where,
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          _count: {
            select: { members: true },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.band.count({ where }),
    ])

    return Response.json({
      data: bands,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Erro ao listar bandas:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = bandCreateSchema.safeParse(body)

    if (!validationResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const band = await prisma.band.create({
      data: validationResult.data,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    })

    return Response.json({ data: band }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar banda:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
