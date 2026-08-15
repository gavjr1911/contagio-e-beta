import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canViewEventMedia } from "@/lib/media/access"
import { resolveEventId } from "@/lib/events"
import type { EventMediaResponse, MediaResponse, EventItemMediaStatus } from "@/lib/validations/media"

// GET /api/events/[id]/media - Listar midia do evento
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Sem isto, proteger as rotas de item e de download seria decorativo: a
    // listagem já devolve todas as URLs públicas do evento.
    const podeVer = await canViewEventMedia(
      session.user.id!,
      session.user.role as string,
      eventId
    )
    if (!podeVer) {
      return Response.json({ error: "Permissao negada" }, { status: 403 })
    }

    // Buscar itens do evento com midia
    const items = await prisma.eventItem.findMany({
      where: { eventId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        type: true,
        order: true,
        requiresMedia: true,
        mediaFiles: {
          include: {
            uploadedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    // Buscar midia avulsa (nao vinculada a item)
    const looseMediaList = await prisma.media.findMany({
      where: {
        eventId,
        eventItemId: null,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Transformar dados
    const itemsWithStatus: EventItemMediaStatus[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      order: item.order,
      requiresMedia: item.requiresMedia,
      mediaCount: item.mediaFiles.length,
      mediaFiles: item.mediaFiles.map((media): MediaResponse => ({
        id: media.id,
        eventId: media.eventId,
        eventItemId: media.eventItemId,
        type: media.type,
        url: media.url,
        filename: media.filename,
        originalName: media.originalName,
        fileSize: media.fileSize,
        mimeType: media.mimeType,
        category: media.category,
        uploadedById: media.uploadedById,
        uploadedBy: media.uploadedBy
          ? { id: media.uploadedBy.id, name: media.uploadedBy.name }
          : undefined,
        createdAt: media.createdAt.toISOString(),
      })),
    }))

    const looseMedia: MediaResponse[] = looseMediaList.map((media) => ({
      id: media.id,
      eventId: media.eventId,
      eventItemId: media.eventItemId,
      type: media.type,
      url: media.url,
      filename: media.filename,
      originalName: media.originalName,
      fileSize: media.fileSize,
      mimeType: media.mimeType,
      category: media.category,
      uploadedById: media.uploadedById,
      uploadedBy: media.uploadedBy
        ? { id: media.uploadedBy.id, name: media.uploadedBy.name }
        : undefined,
      createdAt: media.createdAt.toISOString(),
    }))

    // Calcular estatisticas
    const itemsRequiringMedia = items.filter((i) => i.requiresMedia)
    const itemsWithMedia = itemsRequiringMedia.filter((i) => i.mediaFiles.length > 0)
    const totalFiles = items.reduce((acc, i) => acc + i.mediaFiles.length, 0) + looseMediaList.length

    const response: EventMediaResponse = {
      items: itemsWithStatus,
      looseMedia,
      stats: {
        totalItems: items.length,
        itemsRequiringMedia: itemsRequiringMedia.length,
        itemsWithMedia: itemsWithMedia.length,
        pendingItems: itemsRequiringMedia.length - itemsWithMedia.length,
        totalFiles,
      },
    }

    return Response.json({ data: response })
  } catch (error) {
    console.error("Error fetching event media:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
