import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { songSearchSchema } from "@/lib/validations/music"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const queryResult = songSearchSchema.safeParse({
      q: searchParams.get("q") || "",
      limit: searchParams.get("limit") || undefined,
    })

    if (!queryResult.success) {
      return Response.json(
        { error: "Parametros invalidos", details: queryResult.error.flatten() },
        { status: 400 }
      )
    }

    const { q, limit } = queryResult.data

    const songs = await prisma.song.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { artist: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        artist: true,
        defaultKey: true,
        playCount: true,
        lastPlayedAt: true,
      },
      orderBy: [
        { playCount: "desc" },
        { name: "asc" },
      ],
      take: limit,
    })

    return Response.json({ data: songs })
  } catch (error) {
    console.error("Erro ao buscar musicas:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
