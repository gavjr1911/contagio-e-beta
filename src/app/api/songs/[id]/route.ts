import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { songUpdateSchema } from "@/lib/validations/music"

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id } = await params

    const song = await prisma.song.findUnique({
      where: { id },
      include: {
        setlists: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                date: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: { setlists: true },
        },
      },
    })

    if (!song) {
      return Response.json({ error: "Musica nao encontrada" }, { status: 404 })
    }

    return Response.json({ data: song })
  } catch (error) {
    console.error("Erro ao buscar musica:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validationResult = songUpdateSchema.safeParse(body)

    if (!validationResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const existingSong = await prisma.song.findUnique({ where: { id } })
    if (!existingSong) {
      return Response.json({ error: "Musica nao encontrada" }, { status: 404 })
    }

    const song = await prisma.song.update({
      where: { id },
      data: validationResult.data,
    })

    return Response.json({ data: song })
  } catch (error) {
    console.error("Erro ao atualizar musica:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id } = await params

    const existingSong = await prisma.song.findUnique({ where: { id } })
    if (!existingSong) {
      return Response.json({ error: "Musica nao encontrada" }, { status: 404 })
    }

    // Verificar se a musica esta em algum setlist
    const setlistCount = await prisma.setlist.count({ where: { songId: id } })
    if (setlistCount > 0) {
      return Response.json(
        { error: "Nao e possivel remover uma musica que esta em setlists" },
        { status: 400 }
      )
    }

    await prisma.song.delete({ where: { id } })

    return Response.json({ message: "Musica removida com sucesso" })
  } catch (error) {
    console.error("Erro ao remover musica:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
