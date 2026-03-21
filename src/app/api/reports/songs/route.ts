import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { songReportQuerySchema } from "@/lib/validations/music"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const queryResult = songReportQuerySchema.safeParse({
      type: searchParams.get("type") || undefined,
      limit: searchParams.get("limit") || undefined,
      daysAgo: searchParams.get("daysAgo") || undefined,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Parametros invalidos", details: queryResult.error.flatten() },
        { status: 400 }
      )
    }

    const { type, limit, daysAgo } = queryResult.data
    const dateThreshold = new Date()
    dateThreshold.setDate(dateThreshold.getDate() - daysAgo)

    let songs
    let reportTitle = ""
    let reportDescription = ""

    switch (type) {
      case "most_played":
        reportTitle = "Musicas Mais Tocadas"
        reportDescription = "Ranking das musicas com maior numero de execucoes"
        songs = await prisma.song.findMany({
          where: { playCount: { gt: 0 } },
          orderBy: { playCount: "desc" },
          take: limit,
          select: {
            id: true,
            name: true,
            artist: true,
            playCount: true,
            lastPlayedAt: true,
            tags: true,
          },
        })
        break

      case "least_played":
        reportTitle = "Musicas Menos Tocadas"
        reportDescription = "Musicas que foram tocadas mas com menor frequencia"
        songs = await prisma.song.findMany({
          where: { playCount: { gt: 0 } },
          orderBy: { playCount: "asc" },
          take: limit,
          select: {
            id: true,
            name: true,
            artist: true,
            playCount: true,
            lastPlayedAt: true,
            tags: true,
          },
        })
        break

      case "never_played":
        reportTitle = "Musicas Nunca Tocadas"
        reportDescription = "Musicas cadastradas que ainda nao foram executadas"
        songs = await prisma.song.findMany({
          where: { playCount: 0 },
          orderBy: { name: "asc" },
          take: limit,
          select: {
            id: true,
            name: true,
            artist: true,
            playCount: true,
            lastPlayedAt: true,
            tags: true,
            createdAt: true,
          },
        })
        break

      case "recently_played":
        reportTitle = "Musicas Tocadas Recentemente"
        reportDescription = `Musicas tocadas nos ultimos ${daysAgo} dias`
        songs = await prisma.song.findMany({
          where: {
            lastPlayedAt: { gte: dateThreshold },
          },
          orderBy: { lastPlayedAt: "desc" },
          take: limit,
          select: {
            id: true,
            name: true,
            artist: true,
            playCount: true,
            lastPlayedAt: true,
            tags: true,
          },
        })
        break

      case "not_played_recently":
        reportTitle = "Musicas Sem Tocar Recentemente"
        reportDescription = `Musicas que nao foram tocadas nos ultimos ${daysAgo} dias`
        songs = await prisma.song.findMany({
          where: {
            OR: [
              { lastPlayedAt: { lt: dateThreshold } },
              { lastPlayedAt: null },
            ],
            playCount: { gt: 0 },
          },
          orderBy: { lastPlayedAt: "asc" },
          take: limit,
          select: {
            id: true,
            name: true,
            artist: true,
            playCount: true,
            lastPlayedAt: true,
            tags: true,
          },
        })
        break

      default:
        return NextResponse.json({ error: "Tipo de relatorio invalido" }, { status: 400 })
    }

    // Estatisticas gerais
    const [totalSongs, totalPlayed, averagePlayCount] = await Promise.all([
      prisma.song.count(),
      prisma.song.count({ where: { playCount: { gt: 0 } } }),
      prisma.song.aggregate({
        _avg: { playCount: true },
        where: { playCount: { gt: 0 } },
      }),
    ])

    return NextResponse.json({
      report: {
        type,
        title: reportTitle,
        description: reportDescription,
        generatedAt: new Date().toISOString(),
        parameters: { limit, daysAgo },
      },
      statistics: {
        totalSongs,
        totalPlayed,
        neverPlayed: totalSongs - totalPlayed,
        averagePlayCount: Math.round(averagePlayCount._avg.playCount || 0),
      },
      data: songs,
    })
  } catch (error) {
    console.error("Erro ao gerar relatorio:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
