import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { setlistItemUpdateSchema } from "@/lib/validations/music"
import { EventStatus } from "@/generated/prisma/enums"

type RouteParams = {
  params: Promise<{ id: string; itemId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: eventId, itemId } = await params
    const body = await request.json()
    const validationResult = setlistItemUpdateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    // Verificar se o item existe e pertence ao evento
    const existingItem = await prisma.setlist.findUnique({
      where: { id: itemId },
      include: { event: true },
    })

    if (!existingItem) {
      return NextResponse.json({ error: "Item do setlist nao encontrado" }, { status: 404 })
    }

    if (existingItem.eventId !== eventId) {
      return NextResponse.json(
        { error: "Item nao pertence a este evento" },
        { status: 400 }
      )
    }

    const setlistItem = await prisma.setlist.update({
      where: { id: itemId },
      data: validationResult.data,
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

    return NextResponse.json(setlistItem)
  } catch (error) {
    console.error("Erro ao atualizar item do setlist:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: eventId, itemId } = await params

    // Verificar se o item existe e pertence ao evento
    const existingItem = await prisma.setlist.findUnique({
      where: { id: itemId },
      include: { event: true },
    })

    if (!existingItem) {
      return NextResponse.json({ error: "Item do setlist nao encontrado" }, { status: 404 })
    }

    if (existingItem.eventId !== eventId) {
      return NextResponse.json(
        { error: "Item nao pertence a este evento" },
        { status: 400 }
      )
    }

    // Nao permitir remocao se o evento ja foi concluido
    if (existingItem.event.status === EventStatus.COMPLETED) {
      return NextResponse.json(
        { error: "Nao e possivel modificar setlist de evento concluido" },
        { status: 400 }
      )
    }

    await prisma.setlist.delete({ where: { id: itemId } })

    // Reordenar os itens restantes
    const remainingItems = await prisma.setlist.findMany({
      where: { eventId },
      orderBy: { order: "asc" },
    })

    await prisma.$transaction(
      remainingItems.map((item, index) =>
        prisma.setlist.update({
          where: { id: item.id },
          data: { order: index },
        })
      )
    )

    return NextResponse.json({ message: "Item removido do setlist com sucesso" })
  } catch (error) {
    console.error("Erro ao remover item do setlist:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
