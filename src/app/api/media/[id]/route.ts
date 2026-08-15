import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { deleteFromR2 } from "@/lib/storage/r2"
import { resolveUserPermissions } from "@/lib/permissions/resolver"
import { hasPermission } from "@/lib/permissions/check"
import { canViewEventMedia } from "@/lib/media/access"

// DELETE /api/media/[id] - Deletar midia
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id } = await params

    // Buscar midia
    const media = await prisma.media.findUnique({
      where: { id },
      include: {
        event: {
          select: { id: true, status: true },
        },
      },
    })

    if (!media) {
      return Response.json({ error: "Midia nao encontrada" }, { status: 404 })
    }

    // Verificar se evento nao esta concluido
    if (media.event?.status === "COMPLETED") {
      return Response.json(
        { error: "Nao e possivel remover midia de evento concluido" },
        { status: 400 }
      )
    }

    // Quem subiu pode remover o próprio arquivo; além disso, vale a permissão
    // de mídia do ministério — antes só ADMIN passava, o que deixava o líder
    // (justamente quem limpa mídia errada) de fora.
    const userRole = session.user.role as string
    const isOwner = media.uploadedById === session.user.id
    let canDelete = isOwner || userRole === "ADMIN"

    if (!canDelete) {
      const permissions = await resolveUserPermissions(session.user.id!, userRole)
      canDelete = hasPermission(permissions, "media", "edit")
    }

    if (!canDelete) {
      return Response.json(
        { error: "Sem permissao para remover esta midia" },
        { status: 403 }
      )
    }

    // Ordem importa: se o objeto não sair do R2, manter a linha no banco
    // preserva o ponteiro. Apagar a linha assim mesmo (comportamento anterior)
    // transformava a falha num arquivo órfão permanente, pago e invisível.
    if (media.filename) {
      try {
        await deleteFromR2(media.filename)
      } catch (error) {
        console.error("Error deleting from R2:", error)
        return Response.json(
          { error: "Nao foi possivel remover o arquivo do storage. Tente novamente." },
          { status: 502 }
        )
      }
    }

    // Deletar do banco
    await prisma.media.delete({ where: { id } })

    return Response.json({ message: "Midia removida com sucesso" })
  } catch (error) {
    console.error("Error deleting media:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// GET /api/media/[id] - Obter detalhes de uma midia
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id } = await params

    const media = await prisma.media.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: { id: true, name: true, image: true },
        },
        eventItem: {
          select: { id: true, title: true, type: true },
        },
      },
    })

    if (!media) {
      return Response.json({ error: "Midia nao encontrada" }, { status: 404 })
    }

    // Mesma regra da listagem e da tela: permissão de mídia ou estar escalado.
    const podeVer = await canViewEventMedia(
      session.user.id!,
      session.user.role as string,
      media.eventId
    )
    if (!podeVer) {
      return Response.json({ error: "Permissao negada" }, { status: 403 })
    }

    return Response.json({ data: media })
  } catch (error) {
    console.error("Error fetching media:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
