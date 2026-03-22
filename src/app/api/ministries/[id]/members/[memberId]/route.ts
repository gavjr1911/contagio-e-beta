import { NextRequest } from "next/server"

import {
  apiError,
  apiSuccess,
  AuthSession,
  isAdmin,
  validateBody,
  withAuth,
} from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { updateMemberSchema } from "@/lib/validations/ministry"

type RouteParams = {
  params: Promise<{ id: string; memberId: string }>
}

// PATCH /api/ministries/[id]/members/[memberId] - Atualizar posicao do membro
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (session: AuthSession) => {
    const { id, memberId } = await params

    const bodyResult = await validateBody(request, updateMemberSchema)

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

      // Verificar se o membro existe
      const member = await prisma.ministryMember.findFirst({
        where: {
          id: memberId,
          ministryId: id,
        },
      })

      if (!member) {
        return apiError("Membro nao encontrado", 404)
      }

      const { positionIds, active } = bodyResult.data

      // If positionIds is provided, update positions (delete old and create new)
      if (positionIds !== undefined) {
        // Delete existing positions
        await prisma.memberPosition.deleteMany({
          where: { memberId },
        })

        // Create new positions
        if (positionIds.length > 0) {
          await prisma.memberPosition.createMany({
            data: positionIds.map((positionId: string) => ({
              memberId,
              positionId,
            })),
          })
        }
      }

      const updatedMember = await prisma.ministryMember.update({
        where: { id: memberId },
        data: {
          ...(active !== undefined && { active }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          positions: {
            include: {
              position: true,
            },
          },
        },
      })

      return apiSuccess(updatedMember)
    } catch (error) {
      console.error("Erro ao atualizar membro:", error)
      return apiError("Erro ao atualizar membro", 500)
    }
  })
}

// DELETE /api/ministries/[id]/members/[memberId] - Remover membro do ministerio
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (session: AuthSession) => {
    const { id, memberId } = await params

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

      // Verificar se o membro existe
      const member = await prisma.ministryMember.findFirst({
        where: {
          id: memberId,
          ministryId: id,
        },
      })

      if (!member) {
        return apiError("Membro nao encontrado", 404)
      }

      await prisma.ministryMember.delete({
        where: { id: memberId },
      })

      return apiSuccess({ message: "Membro removido com sucesso" })
    } catch (error) {
      console.error("Erro ao remover membro:", error)
      return apiError("Erro ao remover membro", 500)
    }
  })
}
