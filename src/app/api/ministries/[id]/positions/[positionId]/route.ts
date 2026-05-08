import { NextRequest } from "next/server"
import { z } from "zod"

import {
  apiError,
  apiSuccess,
  requireMinistryAccess,
  validateBody,
} from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

type RouteParams = {
  params: Promise<{ id: string; positionId: string }>
}

// Schema para atualizar funcao
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
  icon: z
    .string()
    .max(50, "Nome do icone deve ter no maximo 50 caracteres")
    .optional()
    .nullable(),
})

// PATCH /api/ministries/[id]/positions/[positionId] - Atualizar funcao
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id, positionId } = await params

  const access = await requireMinistryAccess(id)
  if ("error" in access) return access.error

  const bodyResult = await validateBody(request, updatePositionSchema)

  if (!bodyResult.success) {
    return bodyResult.response
  }

  try {
      // Verificar se a funcao existe
      const position = await prisma.ministryPosition.findFirst({
        where: {
          id: positionId,
          ministryId: id,
        },
      })

      if (!position) {
        return apiError("Funcao nao encontrada", 404)
      }

      const { name, description, icon } = bodyResult.data

      // Se name foi fornecido, verificar se ja existe outra funcao com esse nome
      if (name && name !== position.name) {
        const existingPosition = await prisma.ministryPosition.findFirst({
          where: {
            ministryId: id,
            name: { equals: name, mode: "insensitive" },
            id: { not: positionId },
          },
        })

        if (existingPosition) {
          return apiError("Ja existe uma funcao com esse nome neste ministerio", 409)
        }
      }

      const updatedPosition = await prisma.ministryPosition.update({
        where: { id: positionId },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(icon !== undefined && { icon }),
        },
      })

      return apiSuccess(updatedPosition)
  } catch (error) {
    console.error("Erro ao atualizar funcao:", error)
    return apiError("Erro ao atualizar funcao", 500)
  }
}

// DELETE /api/ministries/[id]/positions/[positionId] - Remover funcao
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id, positionId } = await params

  const access = await requireMinistryAccess(id)
  if ("error" in access) return access.error

  try {
      // Verificar se a funcao existe
      const position = await prisma.ministryPosition.findFirst({
        where: {
          id: positionId,
          ministryId: id,
        },
      })

      if (!position) {
        return apiError("Funcao nao encontrada", 404)
      }

      // Verificar se existem membros usando essa funcao
      const membersUsingPosition = await prisma.memberPosition.count({
        where: { positionId },
      })

      if (membersUsingPosition > 0) {
        return apiError(
          `Nao e possivel remover funcao com ${membersUsingPosition} membro(s) atribuido(s). Remova os membros primeiro.`,
          400
        )
      }

      await prisma.ministryPosition.delete({
        where: { id: positionId },
      })

      return apiSuccess({ message: "Funcao removida com sucesso" })
  } catch (error) {
    console.error("Erro ao remover funcao:", error)
    return apiError("Erro ao remover funcao", 500)
  }
}
