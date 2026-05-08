import { hash } from "bcryptjs"
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
import { createUserSchema, userQuerySchema } from "@/lib/validations/user"

// GET /api/users - Listar usuarios
export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    const searchParams = request.nextUrl.searchParams
    const queryResult = validateQuery(searchParams, userQuerySchema)

    if (!queryResult.success) {
      return queryResult.response
    }

    const { page = 1, limit = 20, search, role, ministryId } = queryResult.data
    const active = request.nextUrl.searchParams.get("active")

    // Determina se o chamador pode ver PII (email e phone)
    const canSeePII = session.user.role === "ADMIN" || session.user.role === "LEADER"

    try {
      const { skip, take } = getPaginationParams(page, limit)

      // Construir filtro where
      const where: Record<string, unknown> = {}

      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ]
      }

      if (role) {
        where.role = role
      }

      if (active !== null) {
        where.active = active === "true"
      }

      if (ministryId) {
        where.ministryMemberships = {
          some: {
            ministryId,
            active: true,
          },
        }
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take,
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            email: canSeePII,
            phone: canSeePII,
            image: true,
            role: true,
            active: true,
            createdAt: true,
            ministryMemberships: {
              where: { active: true },
              include: {
                ministry: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ])

      return apiSuccessPaginated(users, total, page, limit)
    } catch (error) {
      console.error("Erro ao listar usuarios:", error)
      return apiError("Erro ao listar usuarios", 500)
    }
  })
}

// POST /api/users - Criar usuario (apenas ADMIN)
export async function POST(request: NextRequest) {
  return withRole(["ADMIN"], async () => {
    const bodyResult = await validateBody(request, createUserSchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    const { name, email, password, role, image } = bodyResult.data

    try {
      // Verificar se ja existe usuario com esse email
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return apiError("Ja existe um usuario com esse email", 409)
      }

      // Hash da senha
      const hashedPassword = await hash(password, 12)

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          image,
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
        },
      })

      return apiSuccess(user, 201)
    } catch (error) {
      console.error("Erro ao criar usuario:", error)
      return apiError("Erro ao criar usuario", 500)
    }
  })
}
