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
import { updateUserSchema } from "@/lib/validations/user"

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/users/[id] - Detalhes do usuario
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (session: AuthSession) => {
    const { id } = await params

    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          ministryMemberships: {
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

      // Usuarios normais so podem ver seus proprios dados
      // Admins e coordenadores podem ver qualquer usuario
      if (
        !isAdmin(session) &&
        session.user.role !== "COORDINATOR" &&
        session.user.id !== id
      ) {
        return apiError("Permissao negada", 403)
      }

      return apiSuccess(user)
    } catch (error) {
      console.error("Erro ao buscar usuario:", error)
      return apiError("Erro ao buscar usuario", 500)
    }
  })
}

// PATCH /api/users/[id] - Atualizar usuario
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (session: AuthSession) => {
    const { id } = await params

    // Apenas admins podem atualizar outros usuarios
    if (!isAdmin(session) && session.user.id !== id) {
      return apiError("Permissao negada", 403)
    }

    const bodyResult = await validateBody(request, updateUserSchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    const { name, email, role, image } = bodyResult.data

    try {
      const user = await prisma.user.findUnique({
        where: { id },
      })

      if (!user) {
        return apiError("Usuario nao encontrado", 404)
      }

      // Apenas admins podem alterar role
      if (!isAdmin(session)) {
        if (role !== undefined) {
          return apiError("Apenas administradores podem alterar role", 403)
        }
      }

      // Se email foi fornecido e e diferente, verificar se ja existe
      if (email && email !== user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email },
        })

        if (existingUser) {
          return apiError("Ja existe um usuario com esse email", 409)
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(role !== undefined && { role }),
          ...(image !== undefined && { image }),
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
      console.error("Erro ao atualizar usuario:", error)
      return apiError("Erro ao atualizar usuario", 500)
    }
  })
}

// DELETE /api/users/[id] - Deletar usuario (apenas ADMIN)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (session: AuthSession) => {
    const { id } = await params

    // Apenas admins podem deletar usuarios
    if (!isAdmin(session)) {
      return apiError("Permissao negada", 403)
    }

    // Nao pode deletar a si mesmo
    if (session.user.id === id) {
      return apiError("Voce nao pode deletar sua propria conta", 400)
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id },
      })

      if (!user) {
        return apiError("Usuario nao encontrado", 404)
      }

      // Deleta o usuario (cascade remover relacionamentos)
      await prisma.user.delete({
        where: { id },
      })

      return apiSuccess({ message: "Usuario removido com sucesso" })
    } catch (error) {
      console.error("Erro ao remover usuario:", error)
      return apiError("Erro ao remover usuario", 500)
    }
  })
}
