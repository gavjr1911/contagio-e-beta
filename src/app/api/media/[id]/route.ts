import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { deleteFromR2 } from "@/lib/storage/r2"

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

    // Verificar permissao (quem fez upload ou admin)
    const userRole = session.user.role
    const isOwner = media.uploadedById === session.user.id
    const canDelete = isOwner || userRole === "ADMIN"

    if (!canDelete) {
      return Response.json(
        { error: "Sem permissao para remover esta midia" },
        { status: 403 }
      )
    }

    // Deletar do R2 se tiver filename (key)
    if (media.filename) {
      try {
        await deleteFromR2(media.filename)
      } catch (error) {
        console.error("Error deleting from R2:", error)
        // Continua para deletar do banco mesmo se falhar no R2
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

    return Response.json({ data: media })
  } catch (error) {
    console.error("Error fetching media:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
