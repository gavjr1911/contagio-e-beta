import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { uploadUrlRequestSchema } from "@/lib/validations/media"
import {
  generateUploadPresignedUrl,
  generateFileKey,
  isR2Configured,
} from "@/lib/storage/r2"

// POST /api/media/upload-url - Solicitar URL presigned para upload
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Verificar se R2 esta configurado
    const r2Ready = await isR2Configured()
    if (!r2Ready) {
      return Response.json(
        { error: "Storage nao configurado. Configure o Cloudflare R2 nas Configuracoes do sistema." },
        { status: 503 }
      )
    }

    const body = await request.json()

    const parseResult = uploadUrlRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { filename, contentType, fileSize, eventId, eventItemId } = parseResult.data

    // Verificar se evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, status: true },
    })

    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Verificar se evento nao esta concluido
    if (event.status === "COMPLETED") {
      return Response.json(
        { error: "Nao e possivel adicionar midia a evento concluido" },
        { status: 400 }
      )
    }

    // Se eventItemId fornecido, verificar se item existe
    if (eventItemId) {
      const item = await prisma.eventItem.findUnique({
        where: { id: eventItemId },
        select: { id: true, eventId: true },
      })

      if (!item) {
        return Response.json({ error: "Item do evento nao encontrado" }, { status: 404 })
      }

      if (item.eventId !== eventId) {
        return Response.json(
          { error: "Item nao pertence ao evento especificado" },
          { status: 400 }
        )
      }
    }

    // Gerar key e URL presigned
    const key = generateFileKey(eventId, filename)
    const { uploadUrl, expiresIn } = await generateUploadPresignedUrl(
      key,
      contentType,
      fileSize
    )

    return Response.json({
      data: {
        uploadUrl,
        key,
        expiresIn,
      },
    })
  } catch (error) {
    console.error("Error generating upload URL:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
