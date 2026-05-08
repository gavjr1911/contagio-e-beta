import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { setlistItemCreateSchema, setlistReorderSchema } from "@/lib/validations/music"
import { resolveEventId } from "@/lib/events"

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
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

    return Response.json({
      data: {
        eventId,
        eventName: event.name,
        eventDate: event.date,
        eventStatus: event.status,
        items: setlist,
      },
    })
  } catch (error) {
    console.error("Erro ao listar setlist:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const body = await request.json()
    const validationResult = setlistItemCreateSchema.safeParse(body)

    if (!validationResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { songId, key, notes, order: providedOrder } = validationResult.data

    // Verificar se o evento existe
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Verificar se a musica existe
    const song = await prisma.song.findUnique({ where: { id: songId } })
    if (!song) {
      return Response.json({ error: "Musica nao encontrada" }, { status: 404 })
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

    return Response.json({ data: setlistItem }, { status: 201 })
  } catch (error) {
    console.error("Erro ao adicionar ao setlist:", error)
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

    const { id: idOrSlug } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }
    const body = await request.json()
    const validationResult = setlistReorderSchema.safeParse(body)

    if (!validationResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { items } = validationResult.data

    // Verificar se o evento existe
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Verificar se todos os itens pertencem ao evento
    const setlistItems = await prisma.setlist.findMany({
      where: { eventId },
      select: { id: true },
    })
    const validIds = new Set(setlistItems.map((item) => item.id))

    const invalidIds = items.filter((item) => !validIds.has(item.id))
    if (invalidIds.length > 0) {
      return Response.json(
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

    return Response.json({
      data: updatedSetlist,
      message: "Setlist reordenado com sucesso",
    })
  } catch (error) {
    console.error("Erro ao reordenar setlist:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
