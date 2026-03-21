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
  params: Promise<{ id: string }>
}

// PATCH /api/ministry-members/[id] - Atualizar membro
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (session: AuthSession) => {
    const { id } = await params

    const bodyResult = await validateBody(request, updateMemberSchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    try {
      // Buscar o membro com o ministerio
      const member = await prisma.ministryMember.findUnique({
        where: { id },
        include: {
          ministry: true,
        },
      })

      if (!member) {
        return apiError("Membro nao encontrado", 404)
      }

      // Verificar permissao (admin ou lider do ministerio)
      if (!isAdmin(session) && member.ministry.leaderId !== session.user.id) {
        return apiError("Permissao negada", 403)
      }

      const { position, active } = bodyResult.data

      const updatedMember = await prisma.ministryMember.update({
        where: { id },
        data: {
          ...(position !== undefined && { position }),
          ...(active !== undefined && { active }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
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

// DELETE /api/ministry-members/[id] - Remover membro
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (session: AuthSession) => {
    const { id } = await params

    try {
      // Buscar o membro com o ministerio
      const member = await prisma.ministryMember.findUnique({
        where: { id },
        include: {
          ministry: true,
        },
      })

      if (!member) {
        return apiError("Membro nao encontrado", 404)
      }

      // Verificar permissao (admin ou lider do ministerio)
      if (!isAdmin(session) && member.ministry.leaderId !== session.user.id) {
        return apiError("Permissao negada", 403)
      }

      await prisma.ministryMember.delete({
        where: { id },
      })

      return apiSuccess({ message: "Membro removido com sucesso" })
    } catch (error) {
      console.error("Erro ao remover membro:", error)
      return apiError("Erro ao remover membro", 500)
    }
  })
}
