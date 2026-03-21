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
import { updateMinistrySchema } from "@/lib/validations/ministry"

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/ministries/[id] - Detalhes do ministerio
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAuth(async () => {
    const { id } = await params

    try {
      const ministry = await prisma.ministry.findUnique({
        where: { id },
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      })

      if (!ministry) {
        return apiError("Ministerio nao encontrado", 404)
      }

      return apiSuccess(ministry)
    } catch (error) {
      console.error("Erro ao buscar ministerio:", error)
      return apiError("Erro ao buscar ministerio", 500)
    }
  })
}

// PATCH /api/ministries/[id] - Atualizar ministerio (ADMIN ou LEADER do ministerio)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (session: AuthSession) => {
    const { id } = await params

    const bodyResult = await validateBody(request, updateMinistrySchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    try {
      // Buscar ministerio
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

      const { name, description, type, leaderId } = bodyResult.data

      // Se name foi fornecido, verificar se ja existe outro ministerio com esse nome
      if (name && name !== ministry.name) {
        const existingMinistry = await prisma.ministry.findFirst({
          where: {
            name: { equals: name, mode: "insensitive" },
            id: { not: id },
          },
        })

        if (existingMinistry) {
          return apiError("Ja existe um ministerio com esse nome", 409)
        }
      }

      // Se leaderId foi fornecido, verificar se o usuario existe
      if (leaderId) {
        const leader = await prisma.user.findUnique({
          where: { id: leaderId },
        })

        if (!leader) {
          return apiError("Lider nao encontrado", 404)
        }
      }

      const updatedMinistry = await prisma.ministry.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(type !== undefined && { type }),
          ...(leaderId !== undefined && { leaderId }),
        },
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      return apiSuccess(updatedMinistry)
    } catch (error) {
      console.error("Erro ao atualizar ministerio:", error)
      return apiError("Erro ao atualizar ministerio", 500)
    }
  })
}

// DELETE /api/ministries/[id] - Remover ministerio (apenas ADMIN)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (session: AuthSession) => {
    const { id } = await params

    // Apenas admin pode deletar ministerios
    if (!isAdmin(session)) {
      return apiError("Permissao negada", 403)
    }

    try {
      const ministry = await prisma.ministry.findUnique({
        where: { id },
        include: {
          _count: {
            select: { members: true },
          },
        },
      })

      if (!ministry) {
        return apiError("Ministerio nao encontrado", 404)
      }

      // Verificar se o ministerio tem membros
      if (ministry._count.members > 0) {
        return apiError(
          "Nao e possivel remover ministerio com membros. Remova os membros primeiro.",
          400
        )
      }

      await prisma.ministry.delete({
        where: { id },
      })

      return apiSuccess({ message: "Ministerio removido com sucesso" })
    } catch (error) {
      console.error("Erro ao remover ministerio:", error)
      return apiError("Erro ao remover ministerio", 500)
    }
  })
}
