import { NextRequest } from "next/server"

import {
  apiError,
  apiSuccess,
  AuthSession,
  createPaginatedResponse,
  getPaginationParams,
  isAdmin,
  validateBody,
  withAuth,
} from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { addMemberSchema } from "@/lib/validations/ministry"

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/ministries/[id]/members - Listar membros do ministerio
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAuth(async () => {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams

    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const activeOnly = searchParams.get("activeOnly") === "true"

    try {
      // Verificar se o ministerio existe
      const ministry = await prisma.ministry.findUnique({
        where: { id },
      })

      if (!ministry) {
        return apiError("Ministerio nao encontrado", 404)
      }

      const { skip, take } = getPaginationParams(page, limit)

      const where = {
        ministryId: id,
        ...(activeOnly && { active: true }),
      }

      const [members, total] = await Promise.all([
        prisma.ministryMember.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "asc" },
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
            positions: {
              include: {
                position: true,
              },
            },
          },
        }),
        prisma.ministryMember.count({ where }),
      ])

      return apiSuccess(createPaginatedResponse(members, total, page, limit))
    } catch (error) {
      console.error("Erro ao listar membros:", error)
      return apiError("Erro ao listar membros", 500)
    }
  })
}

// POST /api/ministries/[id]/members - Adicionar membro ao ministerio
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (session: AuthSession) => {
    const { id } = await params

    const bodyResult = await validateBody(request, addMemberSchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    const { userId, positionIds } = bodyResult.data

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

      // Verificar se o usuario existe
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        return apiError("Usuario nao encontrado", 404)
      }

      // Verificar se o usuario ja e membro do ministerio
      const existingMember = await prisma.ministryMember.findFirst({
        where: {
          ministryId: id,
          userId,
        },
      })

      if (existingMember) {
        return apiError("Usuario ja e membro deste ministerio", 409)
      }

      // Criar membro com posicoes
      const member = await prisma.ministryMember.create({
        data: {
          ministryId: id,
          userId,
          positions: positionIds && positionIds.length > 0
            ? {
                create: positionIds.map((positionId: string) => ({
                  positionId,
                })),
              }
            : undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          positions: {
            include: {
              position: true,
            },
          },
        },
      })

      return apiSuccess(member, 201)
    } catch (error) {
      console.error("Erro ao adicionar membro:", error)
      return apiError("Erro ao adicionar membro", 500)
    }
  })
}
