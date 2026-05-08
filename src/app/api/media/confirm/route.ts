import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { confirmUploadSchema } from "@/lib/validations/media"
import {
  fileExistsInR2,
  getPublicUrl,
  getMediaTypeFromMime,
  type AllowedMimeType,
} from "@/lib/storage/r2"
import { resolveEventId } from "@/lib/events"

// POST /api/media/confirm - Confirmar upload e criar registro no banco
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const parseResult = confirmUploadSchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { key, eventId: eventIdOrSlug, eventItemId, originalName, fileSize, mimeType, category } =
      parseResult.data

    // Resolver eventId (aceita cuid ou slug)
    const eventId = await resolveEventId(eventIdOrSlug)
    if (!eventId) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Verificar se evento existe e nao esta concluido
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, status: true },
    })

    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    if (event.status === "COMPLETED") {
      return Response.json(
        { error: "Nao e possivel adicionar midia a evento concluido" },
        { status: 400 }
      )
    }

    // Verificar se arquivo existe no R2
    const exists = await fileExistsInR2(key)
    if (!exists) {
      return Response.json(
        { error: "Arquivo nao encontrado no storage. O upload pode ter falhado." },
        { status: 400 }
      )
    }

    // Obter tipo de media e URL publica
    const mediaType = getMediaTypeFromMime(mimeType as AllowedMimeType)
    const publicUrl = await getPublicUrl(key)

    // Verificar se o usuario existe no banco
    let uploadedById: string | null = null
    if (session.user.id) {
      const userExists = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true },
      })
      if (userExists) {
        uploadedById = userExists.id
      }
    }

    // Criar registro no banco
    const media = await prisma.media.create({
      data: {
        eventId,
        eventItemId: eventItemId || null,
        type: mediaType,
        url: publicUrl,
        filename: key,
        originalName,
        fileSize,
        mimeType,
        category,
        uploadedById,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    })

    return Response.json({ data: media })
  } catch (error) {
    console.error("Error confirming upload:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
