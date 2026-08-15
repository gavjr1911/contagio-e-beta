import { NextResponse, type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canViewEventMedia } from "@/lib/media/access"
import { generateDownloadPresignedUrl } from "@/lib/storage/r2"

/**
 * GET /api/media/[id]/download — redireciona para uma URL assinada que força o
 * download com o nome original do arquivo.
 *
 * Existe porque `<a href={urlPublica} download={nome}>` não funciona: o link é
 * cross-origin (domínio do bucket) e nesse caso o navegador ignora o atributo
 * `download`, abrindo o arquivo em vez de baixá-lo. Redirecionar mantém o
 * tráfego saindo do R2 — baixar via fetch+blob carregaria o arquivo inteiro na
 * memória do navegador, inviável para vídeo.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
    }

    const { id } = await params

    const media = await prisma.media.findUnique({
      where: { id },
      select: { filename: true, originalName: true, eventId: true },
    })

    if (!media) {
      return NextResponse.json({ error: "Midia nao encontrada" }, { status: 404 })
    }

    const podeVer = await canViewEventMedia(
      session.user.id!,
      session.user.role as string,
      media.eventId
    )
    if (!podeVer) {
      return NextResponse.json({ error: "Permissao negada" }, { status: 403 })
    }

    // `filename` guarda a key no R2; sem ela não há objeto para assinar.
    if (!media.filename) {
      return NextResponse.json(
        { error: "Arquivo sem referencia no storage" },
        { status: 409 }
      )
    }

    const url = await generateDownloadPresignedUrl(
      media.filename,
      media.originalName || media.filename.split("/").pop() || "arquivo"
    )

    // 302: a URL assinada é de curta duração, então não pode ser cacheada.
    return NextResponse.redirect(url, 302)
  } catch (error) {
    console.error("Erro ao gerar link de download:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
