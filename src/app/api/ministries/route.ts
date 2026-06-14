import { NextRequest } from "next/server"

import {
  apiError,
  apiSuccess,
  apiSuccessPaginated,
  getPaginationParams,
  validateBody,
  validateQuery,
  withAuth,
  withRole,
} from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import {
  createMinistrySchema,
  ministryQuerySchema,
} from "@/lib/validations/ministry"

// GET /api/ministries - Listar ministerios
export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const searchParams = request.nextUrl.searchParams
    const queryResult = validateQuery(searchParams, ministryQuerySchema)

    if (!queryResult.success) {
      return queryResult.response
    }

    const { page = 1, limit = 20, search, includeMembers, includeLeader, includePositions } = queryResult.data

    try {
      const { skip, take } = getPaginationParams(page, limit)

      const where: Record<string, unknown> = {}

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ]
      }

      const [ministries, total] = await Promise.all([
        prisma.ministry.findMany({
          where,
          skip,
          take,
          orderBy: { name: "asc" },
          include: {
            leader: includeLeader
              ? {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                }
              : false,
            members: includeMembers
              ? {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                }
              : false,
            positions: includePositions
              ? {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    ministryId: true,
                  },
                  orderBy: { name: "asc" as const },
                }
              : false,
          },
        }),
        prisma.ministry.count({ where }),
      ])

      return apiSuccessPaginated(ministries, total, page, limit)
    } catch (error) {
      console.error("Erro ao listar ministerios:", error)
      return apiError("Erro ao listar ministerios", 500)
    }
  })
}

// POST /api/ministries - Criar ministerio (apenas ADMIN)
export async function POST(request: NextRequest) {
  return withRole(["ADMIN"], async () => {
    const bodyResult = await validateBody(request, createMinistrySchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    const { name, description, leaderId, permissions } = bodyResult.data

    try {
      // Verificar se ja existe ministerio com esse nome
      const existingMinistry = await prisma.ministry.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
      })

      if (existingMinistry) {
        return apiError("Ja existe um ministerio com esse nome", 409)
      }

      // Se leaderId foi fornecido, verificar se o usuario existe
      if (leaderId) {
        const leader = await prisma.user.findUnique({
          where: { id: leaderId },
        })

        if (!leader) {
          return apiError("Lider nao encontrado", 404)
        }

        // Promove o papel para LEADER se ainda nao for ADMIN ou LEADER
        if (leader.role !== "ADMIN" && leader.role !== "LEADER") {
          await prisma.user.update({
            where: { id: leaderId },
            data: { role: "LEADER" },
          })
        }
      }

      const ministry = await prisma.ministry.create({
        data: {
          name,
          description,
          leaderId,
          permissions: permissions ?? undefined,
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

      // Garante que o líder também seja membro ativo do ministério, para que
      // apareça na lista de membros e possa receber funções (idempotente).
      if (leaderId) {
        await prisma.ministryMember.upsert({
          where: { userId_ministryId: { userId: leaderId, ministryId: ministry.id } },
          update: { active: true },
          create: { userId: leaderId, ministryId: ministry.id, active: true },
        })
      }

      return apiSuccess(ministry, 201)
    } catch (error) {
      console.error("Erro ao criar ministerio:", error)
      return apiError("Erro ao criar ministerio", 500)
    }
  })
}
