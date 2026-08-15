import { NextResponse, type NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import { withPermission } from "@/lib/api-utils"
import { uploadUrlRequestSchema } from "@/lib/validations/media"
import {
  generateUploadPresignedUrl,
  generateFileKey,
  isR2Configured,
} from "@/lib/storage/r2"
import { resolveEventId } from "@/lib/events"

// POST /api/media/upload-url - Solicitar URL presigned para upload
// Exige permissao de midia: antes bastava estar logado, o que permitia gerar
// presign para qualquer evento.
export async function POST(request: NextRequest) {
  return withPermission("media", "edit", async () => {
  try {

    // Verificar se R2 esta configurado
    const r2Ready = await isR2Configured()
    if (!r2Ready) {
      return NextResponse.json(
        { error: "Storage nao configurado. Configure o Cloudflare R2 nas Configuracoes do sistema." },
        { status: 503 }
      )
    }

    const body = await request.json()

    const parseResult = uploadUrlRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { filename, contentType, fileSize, eventId: eventIdOrSlug, eventItemId } = parseResult.data

    // Resolver eventId (aceita cuid ou slug)
    const eventId = await resolveEventId(eventIdOrSlug)
    if (!eventId) {
      return NextResponse.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Verificar status do evento
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, status: true },
    })

    if (!event) {
      return NextResponse.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Verificar se evento nao esta concluido
    if (event.status === "COMPLETED") {
      return NextResponse.json(
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
        return NextResponse.json({ error: "Item do evento nao encontrado" }, { status: 404 })
      }

      if (item.eventId !== eventId) {
        return NextResponse.json(
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

    return NextResponse.json({
      data: {
        uploadUrl,
        key,
        expiresIn,
      },
    })
  } catch (error) {
    console.error("Error generating upload URL:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
  })
}
