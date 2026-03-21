import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { setlistItemCreateSchema, setlistReorderSchema } from "@/lib/validations/music"

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: eventId } = await params

    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return NextResponse.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    const setlist = await prisma.setlist.findMany({
      where: { eventId },
      include: {
        song: {
          select: {
            id: true,
            name: true,
            artist: true,
            defaultKey: true,
            chordLink: true,
            playCount: true,
            lastPlayedAt: true,
          },
        },
      },
      orderBy: { order: "asc" },
    })

    return NextResponse.json({
      eventId,
      eventName: event.name,
      eventDate: event.date,
      eventStatus: event.status,
      items: setlist,
    })
  } catch (error) {
    console.error("Erro ao listar setlist:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: eventId } = await params
    const body = await request.json()
    const validationResult = setlistItemCreateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { songId, key, notes, order: providedOrder } = validationResult.data

    // Verificar se o evento existe
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return NextResponse.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Verificar se a musica existe
    const song = await prisma.song.findUnique({ where: { id: songId } })
    if (!song) {
      return NextResponse.json({ error: "Musica nao encontrada" }, { status: 404 })
    }

    // Determinar a ordem (proxima disponivel se nao fornecida)
    let order = providedOrder
    if (order === undefined) {
      const lastItem = await prisma.setlist.findFirst({
        where: { eventId },
        orderBy: { order: "desc" },
      })
      order = lastItem ? lastItem.order + 1 : 0
    }

    // Usar o tom padrao da musica se nao fornecido
    const finalKey = key ?? song.defaultKey

    const setlistItem = await prisma.setlist.create({
      data: {
        eventId,
        songId,
        key: finalKey,
        notes,
        order,
      },
      include: {
        song: {
          select: {
            id: true,
            name: true,
            artist: true,
            defaultKey: true,
            chordLink: true,
          },
        },
      },
    })

    return NextResponse.json(setlistItem, { status: 201 })
  } catch (error) {
    console.error("Erro ao adicionar ao setlist:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: eventId } = await params
    const body = await request.json()
    const validationResult = setlistReorderSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { items } = validationResult.data

    // Verificar se o evento existe
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return NextResponse.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Verificar se todos os itens pertencem ao evento
    const setlistItems = await prisma.setlist.findMany({
      where: { eventId },
      select: { id: true },
    })
    const validIds = new Set(setlistItems.map((item) => item.id))

    const invalidIds = items.filter((item) => !validIds.has(item.id))
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "Alguns itens nao pertencem ao setlist deste evento" },
        { status: 400 }
      )
    }

    // Atualizar as ordens em uma transacao
    await prisma.$transaction(
      items.map((item) =>
        prisma.setlist.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    )

    // Retornar o setlist atualizado
    const updatedSetlist = await prisma.setlist.findMany({
      where: { eventId },
      include: {
        song: {
          select: {
            id: true,
            name: true,
            artist: true,
            defaultKey: true,
            chordLink: true,
          },
        },
      },
      orderBy: { order: "asc" },
    })

    return NextResponse.json({
      message: "Setlist reordenado com sucesso",
      items: updatedSetlist,
    })
  } catch (error) {
    console.error("Erro ao reordenar setlist:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
