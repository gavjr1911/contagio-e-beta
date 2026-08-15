import { NextResponse, type NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import { withPermission } from "@/lib/api-utils"
import { confirmUploadSchema } from "@/lib/validations/media"
import {
  deleteFromR2,
  getObjectMetadata,
  getPublicUrl,
  getMediaTypeFromMime,
  isAllowedMimeType,
  getMaxSizeForMime,
  type AllowedMimeType,
} from "@/lib/storage/r2"
import { resolveEventId } from "@/lib/events"

// POST /api/media/confirm - Confirmar upload e criar registro no banco
export async function POST(request: NextRequest) {
  return withPermission("media", "edit", async (session) => {
  try {
    const body = await request.json()
    const parseResult = confirmUploadSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    // `fileSize` do corpo é ignorado de propósito: o tamanho gravado vem do
    // HeadObject no R2, mais abaixo.
    const { key, eventId: eventIdOrSlug, eventItemId, originalName, mimeType, category } =
      parseResult.data

    // Resolver eventId (aceita cuid ou slug)
    const eventId = await resolveEventId(eventIdOrSlug)
    if (!eventId) {
      return NextResponse.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Verificar se evento existe e nao esta concluido
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, status: true },
    })

    if (!event) {
      return NextResponse.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    if (event.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Nao e possivel adicionar midia a evento concluido" },
        { status: 400 }
      )
    }

    // A key vem do cliente. Sem amarrá-la ao evento, qualquer usuário poderia
    // confirmar um objeto de OUTRO evento e anexá-lo ao seu — ou registrar a
    // mesma key em vários eventos, e aí apagar um registro derrubaria a URL dos
    // demais. O presign sempre gera a key com este prefixo (generateFileKey).
    const expectedPrefix = `events/${eventId}/`
    if (!key.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: "Arquivo nao pertence a este evento" },
        { status: 400 }
      )
    }

    // Mesma key não pode virar dois registros: a exclusão de um apagaria o
    // objeto e deixaria o outro apontando para 404.
    //
    // A key é única por upload (timestamp + aleatório em generateFileKey), então
    // reencontrá-la aqui significa quase sempre que a resposta do confirm se
    // perdeu e o cliente está repetindo a chamada. Nesse caso devolver o
    // registro existente é o certo: responder 409 faria o usuário reenviar um
    // arquivo que já está salvo. Só é conflito de verdade se for outro evento.
    const jaRegistrado = await prisma.media.findFirst({
      where: { filename: key },
      include: { uploadedBy: { select: { id: true, name: true } } },
    })
    if (jaRegistrado) {
      if (jaRegistrado.eventId === eventId) {
        return NextResponse.json({ data: jaRegistrado })
      }
      return NextResponse.json(
        { error: "Este arquivo ja foi registrado em outro evento" },
        { status: 409 }
      )
    }

    // O item também precisa ser do mesmo evento. A checagem existe no
    // upload-url, mas sem repetir aqui daria para subir para o evento A e, no
    // confirm, anexar a mídia a um item do evento B — a linha ficaria com
    // eventId de A aparecendo na aba de B, com URL cruzada.
    if (eventItemId) {
      const item = await prisma.eventItem.findUnique({
        where: { id: eventItemId },
        select: { eventId: true },
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

    // Metadados REAIS do objeto — `fileSize` e `mimeType` do corpo da requisição
    // são declarações do cliente e não podem ser a fonte da verdade.
    const metadata = await getObjectMetadata(key)
    if (!metadata) {
      return NextResponse.json(
        { error: "Arquivo nao encontrado no storage. O upload pode ter falhado." },
        { status: 400 }
      )
    }

    // O tipo efetivo é o que o R2 gravou no PUT (assinado no presign); só cai
    // para o declarado se o bucket não tiver devolvido nada utilizável.
    const effectiveMime: AllowedMimeType =
      metadata.contentType && isAllowedMimeType(metadata.contentType)
        ? metadata.contentType
        : (mimeType as AllowedMimeType)

    // Limite conferido contra o tamanho real. Se estourou, o objeto não pode
    // ficar no bucket ocupando espaço sem registro.
    const maxSize = getMaxSizeForMime(effectiveMime)
    if (metadata.contentLength > maxSize) {
      await deleteFromR2(key).catch((err) =>
        console.error("Falha ao remover objeto acima do limite:", err)
      )
      return NextResponse.json(
        {
          error: `Arquivo maior que o limite para este tipo (${Math.round(maxSize / (1024 * 1024))}MB).`,
        },
        { status: 400 }
      )
    }

    // Obter tipo de media e URL publica
    const mediaType = getMediaTypeFromMime(effectiveMime)
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
        // Tamanho e tipo vindos do R2, não do cliente.
        fileSize: metadata.contentLength,
        mimeType: effectiveMime,
        category,
        uploadedById,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ data: media })
  } catch (error) {
    console.error("Error confirming upload:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
  })
}
