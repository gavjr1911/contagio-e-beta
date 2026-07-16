import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { songCreateSchema, songQuerySchema } from "@/lib/validations/music"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const queryResult = songQuerySchema.safeParse({
      search: searchParams.get("search") || undefined,
      tag: searchParams.get("tag") || undefined,
      orderBy: searchParams.get("orderBy") || undefined,
      order: searchParams.get("order") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    })

    if (!queryResult.success) {
      return Response.json(
        { error: "Parametros invalidos", details: queryResult.error.flatten() },
        { status: 400 }
      )
    }

    const { search, tag, orderBy, order, page, limit, all } = queryResult.data
    const fetchAll = all === "true"
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { artist: { contains: search, mode: "insensitive" } },
      ]
    }

    if (tag) {
      where.tags = { has: tag }
    }

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        orderBy: { [orderBy]: order },
        ...(fetchAll ? {} : { skip, take: limit }),
      }),
      prisma.song.count({ where }),
    ])

    return Response.json({
      data: songs,
      pagination: {
        page: fetchAll ? 1 : page,
        limit: fetchAll ? total : limit,
        total,
        totalPages: fetchAll ? 1 : Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Erro ao listar musicas:", error)
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
    const validationResult = songCreateSchema.safeParse(body)

    if (!validationResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const song = await prisma.song.create({
      data: validationResult.data,
    })

    return Response.json({ data: song }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar musica:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
