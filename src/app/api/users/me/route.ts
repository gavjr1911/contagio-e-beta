import { compare, hash } from "bcryptjs"
import { NextRequest } from "next/server"

import {
  apiError,
  apiSuccess,
  AuthSession,
  validateBody,
  withAuth,
} from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { updateProfileSchema } from "@/lib/validations/user"

// GET /api/users/me - Dados do usuario logado
export async function GET() {
  return withAuth(async (session: AuthSession) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          ministryMemberships: {
            where: { active: true },
            include: {
              ministry: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
          leaderOfMinistries: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      })

      if (!user) {
        return apiError("Usuario nao encontrado", 404)
      }

      return apiSuccess(user)
    } catch (error) {
      console.error("Erro ao buscar usuario:", error)
      return apiError("Erro ao buscar dados do usuario", 500)
    }
  })
}

// PATCH /api/users/me - Atualizar proprio perfil
export async function PATCH(request: NextRequest) {
  return withAuth(async (session: AuthSession) => {
    const bodyResult = await validateBody(request, updateProfileSchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    const { name, image, currentPassword, newPassword } = bodyResult.data

    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      })

      if (!user) {
        return apiError("Usuario nao encontrado", 404)
      }

      // Se estiver alterando a senha, verificar senha atual
      let hashedNewPassword: string | undefined

      if (newPassword) {
        if (!currentPassword) {
          return apiError("Senha atual e obrigatoria para alterar a senha", 400)
        }

        if (!user.password) {
          return apiError("Usuario nao possui senha definida", 400)
        }

        const isPasswordValid = await compare(currentPassword, user.password)

        if (!isPasswordValid) {
          return apiError("Senha atual incorreta", 401)
        }

        hashedNewPassword = await hash(newPassword, 12)
      }

      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          ...(name !== undefined && { name }),
          ...(image !== undefined && { image }),
          ...(hashedNewPassword && { password: hashedNewPassword }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      return apiSuccess(updatedUser)
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error)
      return apiError("Erro ao atualizar perfil", 500)
    }
  })
}
