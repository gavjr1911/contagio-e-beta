import { type NextRequest } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import {
  withAuth,
  withRole,
  apiSuccess,
  apiError,
  validateBody,
} from "@/lib/api-utils"
import { songSelectWithChord } from "@/lib/prisma-includes"

type RouteParams = {
  params: Promise<{ id: string; itemId: string }>
}

const addSongsSchema = z.object({
  songIds: z.array(z.string().min(1)).min(1, "Selecione pelo menos uma musica"),
})

const reorderSongsSchema = z.object({
  songIds: z.array(z.string().min(1)).min(1),
})

const setlistInclude = {
  song: { select: songSelectWithChord },
} as const

// GET /api/events/[id]/items/[itemId]/songs - Get songs for this worship block
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAuth(async () => {
    const { id: eventId, itemId } = await params

    // Verify item exists and is a worship block
    const item = await prisma.eventItem.findFirst({
      where: { id: itemId, eventId },
    })

    if (!item) {
      return apiError("Item nao encontrado", 404)
    }

    const setlistItems = await prisma.setlist.findMany({
      where: { eventId, eventItemId: itemId },
      include: setlistInclude,
      orderBy: { order: "asc" },
    })

    return apiSuccess(setlistItems)
  })
}

// POST /api/events/[id]/items/[itemId]/songs - Add songs to this worship block
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withRole(["ADMIN", "COORDINATOR", "LEADER"], async () => {
    const { id: eventId, itemId } = await params

    // Verify item exists
    const item = await prisma.eventItem.findFirst({
      where: { id: itemId, eventId },
    })

    if (!item) {
      return apiError("Item nao encontrado", 404)
    }

    const validation = await validateBody(request, addSongsSchema)
    if (!validation.success) {
      return validation.response
    }

    const { songIds } = validation.data

    // Verify all songs exist
    const songs = await prisma.song.findMany({
      where: { id: { in: songIds } },
      select: { id: true, defaultKey: true },
    })

    if (songs.length !== songIds.length) {
      return apiError("Uma ou mais musicas nao foram encontradas", 400)
    }

    // Get current max order for this event's setlist
    const maxOrder = await prisma.setlist.findFirst({
      where: { eventId },
      orderBy: { order: "desc" },
      select: { order: true },
    })

    let currentOrder = (maxOrder?.order ?? -1) + 1

    // Create setlist entries for each song
    const createdItems = await prisma.$transaction(
      songIds.map((songId) => {
        const song = songs.find((s) => s.id === songId)
        return prisma.setlist.create({
          data: {
            eventId,
            eventItemId: itemId,
            songId,
            order: currentOrder++,
            key: song?.defaultKey,
          },
          include: setlistInclude,
        })
      })
    )

    return apiSuccess(createdItems, 201)
  })
}

// PATCH /api/events/[id]/items/[itemId]/songs - Reorder songs in this worship block
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withRole(["ADMIN", "COORDINATOR", "LEADER"], async () => {
    const { id: eventId, itemId } = await params

    const validation = await validateBody(request, reorderSongsSchema)
    if (!validation.success) {
      return validation.response
    }

    const { songIds } = validation.data

    // Get setlist items for this block
    const existingItems = await prisma.setlist.findMany({
      where: { eventId, eventItemId: itemId },
      select: { id: true, songId: true },
    })

    // Create a map of songId to setlist id
    const songToSetlistId = new Map(
      existingItems.map((item) => [item.songId, item.id])
    )

    // Validate all songIds exist in this block
    for (const songId of songIds) {
      if (!songToSetlistId.has(songId)) {
        return apiError(`Musica ${songId} nao encontrada no bloco`, 400)
      }
    }

    // Update orders in two steps to avoid unique constraint violations
    // Step 1: Set all orders to negative values (offset by -1000)
    await prisma.$transaction(
      songIds.map((songId, index) => {
        const setlistId = songToSetlistId.get(songId)!
        return prisma.setlist.update({
          where: { id: setlistId },
          data: { order: -(index + 1000) },
        })
      })
    )

    // Step 2: Set correct positive orders
    await prisma.$transaction(
      songIds.map((songId, index) => {
        const setlistId = songToSetlistId.get(songId)!
        return prisma.setlist.update({
          where: { id: setlistId },
          data: { order: index },
        })
      })
    )

    const updatedItems = await prisma.setlist.findMany({
      where: { eventId, eventItemId: itemId },
      include: setlistInclude,
      orderBy: { order: "asc" },
    })

    return apiSuccess(updatedItems)
  })
}

// DELETE /api/events/[id]/items/[itemId]/songs - Remove a song from this worship block
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withRole(["ADMIN", "COORDINATOR", "LEADER"], async () => {
    const { id: eventId, itemId } = await params
    const { searchParams } = new URL(request.url)
    const songId = searchParams.get("songId")

    if (!songId) {
      return apiError("songId e obrigatorio", 400)
    }

    // Find and delete the setlist entry
    const setlistItem = await prisma.setlist.findFirst({
      where: { eventId, eventItemId: itemId, songId },
    })

    if (!setlistItem) {
      return apiError("Musica nao encontrada neste bloco", 404)
    }

    await prisma.setlist.delete({
      where: { id: setlistItem.id },
    })

    return apiSuccess({ deleted: true })
  })
}
