import { NextRequest } from "next/server"
import { z } from "zod"

import {
  apiError,
  apiSuccess,
  AuthSession,
  isAdmin,
  validateBody,
  withAuth,
} from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

type RouteParams = {
  params: Promise<{ id: string; positionId: string }>
}

// Schema para atualizar posicao
const updatePositionSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no maximo 100 caracteres")
    .optional(),
  description: z
    .string()
    .max(500, "Descricao deve ter no maximo 500 caracteres")
    .optional()
    .nullable(),
})

// PATCH /api/ministries/[id]/positions/[positionId] - Atualizar posicao
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (session: AuthSession) => {
    const { id, positionId } = await params

    const bodyResult = await validateBody(request, updatePositionSchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    try {
      // Verificar se o ministerio existe
      const ministry = await prisma.ministry.findUnique({
        where: { id },
      })

      if (!ministry) {
        return apiError("Ministerio nao encontrado", 404)
      }

      // Verificar permissao (admin ou lider do ministerio)
      if (!isAdmin(session) && ministry.leaderId !== session.user.id) {
        return apiError("Permissao negada", 403)
      }

      // Verificar se a posicao existe
      const position = await prisma.ministryPosition.findFirst({
        where: {
          id: positionId,
          ministryId: id,
        },
      })

      if (!position) {
        return apiError("Posicao nao encontrada", 404)
      }

      const { name, description } = bodyResult.data

      // Se name foi fornecido, verificar se ja existe outra posicao com esse nome
      if (name && name !== position.name) {
        const existingPosition = await prisma.ministryPosition.findFirst({
          where: {
            ministryId: id,
            name: { equals: name, mode: "insensitive" },
            id: { not: positionId },
          },
        })

        if (existingPosition) {
          return apiError("Ja existe uma posicao com esse nome neste ministerio", 409)
        }
      }

      const updatedPosition = await prisma.ministryPosition.update({
        where: { id: positionId },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
        },
      })

      return apiSuccess(updatedPosition)
    } catch (error) {
      console.error("Erro ao atualizar posicao:", error)
      return apiError("Erro ao atualizar posicao", 500)
    }
  })
}

// DELETE /api/ministries/[id]/positions/[positionId] - Remover posicao
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (session: AuthSession) => {
    const { id, positionId } = await params

    try {
      // Verificar se o ministerio existe
      const ministry = await prisma.ministry.findUnique({
        where: { id },
      })

      if (!ministry) {
        return apiError("Ministerio nao encontrado", 404)
      }

      // Verificar permissao (admin ou lider do ministerio)
      if (!isAdmin(session) && ministry.leaderId !== session.user.id) {
        return apiError("Permissao negada", 403)
      }

      // Verificar se a posicao existe
      const position = await prisma.ministryPosition.findFirst({
        where: {
          id: positionId,
          ministryId: id,
        },
      })

      if (!position) {
        return apiError("Posicao nao encontrada", 404)
      }

      // Verificar se existem membros usando essa posicao
      const membersUsingPosition = await prisma.ministryMember.count({
        where: { positionId },
      })

      if (membersUsingPosition > 0) {
        return apiError(
          `Nao e possivel remover posicao com ${membersUsingPosition} membro(s) atribuido(s). Remova os membros primeiro.`,
          400
        )
      }

      await prisma.ministryPosition.delete({
        where: { id: positionId },
      })

      return apiSuccess({ message: "Posicao removida com sucesso" })
    } catch (error) {
      console.error("Erro ao remover posicao:", error)
      return apiError("Erro ao remover posicao", 500)
    }
  })
}
