import { NextRequest } from "next/server"

import {
  apiError,
  apiSuccess,
  AuthSession,
  validateBody,
  withAuth,
} from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { updateProfileWithPhotoSchema } from "@/lib/validations/user"

// PATCH /api/users/me/profile - Atualizar nome, phone e image do usuario logado
export async function PATCH(request: NextRequest) {
  return withAuth(async (session: AuthSession) => {
    const bodyResult = await validateBody(request, updateProfileWithPhotoSchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    const { name, phone, image } = bodyResult.data

    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      })

      if (!user) {
        return apiError("Usuario nao encontrado", 404)
      }

      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          ...(name !== undefined && { name }),
          ...(phone !== undefined && { phone: phone || null }),
          ...(image !== undefined && { image }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
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
