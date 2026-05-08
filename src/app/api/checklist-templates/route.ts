import { NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import {
  apiError,
  apiSuccess,
  apiSuccessPaginated,
  getPaginationParams,
  validateBody,
  validateQuery,
  withRole,
} from "@/lib/api-utils"
import {
  checklistTemplateQuerySchema,
  createChecklistTemplateSchema,
} from "@/lib/validations/checklist"

// GET /api/checklist-templates - Listar templates
export async function GET(request: NextRequest) {
  return withRole(["ADMIN"], async () => {
    const searchParams = request.nextUrl.searchParams
    const queryResult = validateQuery(searchParams, checklistTemplateQuerySchema)

    if (!queryResult.success) {
      return queryResult.response
    }

    const { search, page, limit } = queryResult.data
    const { skip, take } = getPaginationParams(page, limit)

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}

    const [templates, total] = await Promise.all([
      prisma.checklistTemplate.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          items: {
            orderBy: { order: "asc" },
          },
          _count: {
            select: { events: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.checklistTemplate.count({ where }),
    ])

    return apiSuccessPaginated(templates, total, page, limit)
  })
}

// POST /api/checklist-templates - Criar template
export async function POST(request: NextRequest) {
  return withRole(["ADMIN"], async (session) => {
    const bodyResult = await validateBody(request, createChecklistTemplateSchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    const { name, description } = bodyResult.data

    // Verificar se ja existe template com mesmo nome
    const existingTemplate = await prisma.checklistTemplate.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    })

    if (existingTemplate) {
      return apiError("Ja existe um template com esse nome", 400)
    }

    // Buscar o usuario pelo email para garantir que temos o ID correto
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })

    if (!user) {
      return apiError("Usuario nao encontrado", 404)
    }

    const template = await prisma.checklistTemplate.create({
      data: {
        name,
        description,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: true,
      },
    })

    return apiSuccess(template, 201)
  })
}
