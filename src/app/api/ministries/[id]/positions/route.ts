import { NextRequest } from "next/server"
import { z } from "zod"

import {
  apiError,
  apiSuccess,
  requireMinistryAccess,
  validateBody,
  withAuth,
} from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

type RouteParams = {
  params: Promise<{ id: string }>
}

// Schema para criar funcao
const createPositionSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no maximo 100 caracteres"),
  description: z
    .string()
    .max(500, "Descricao deve ter no maximo 500 caracteres")
    .optional()
    .nullable(),
  icon: z
    .string()
    .max(50, "Nome do icone deve ter no maximo 50 caracteres")
    .optional()
    .nullable(),
})

// GET /api/ministries/[id]/positions - Listar posicoes do ministerio
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withAuth(async () => {
    const { id } = await params

    try {
      // Verificar se o ministerio existe
      const ministry = await prisma.ministry.findUnique({
        where: { id },
      })

      if (!ministry) {
        return apiError("Ministerio nao encontrado", 404)
      }

      const positions = await prisma.ministryPosition.findMany({
        where: { ministryId: id },
        orderBy: { name: "asc" },
      })

      return apiSuccess(positions)
    } catch (error) {
      console.error("Erro ao listar posicoes:", error)
      return apiError("Erro ao listar posicoes", 500)
    }
  })
}

// POST /api/ministries/[id]/positions - Criar nova funcao
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const access = await requireMinistryAccess(id)
  if ("error" in access) return access.error

  const bodyResult = await validateBody(request, createPositionSchema)

  if (!bodyResult.success) {
    return bodyResult.response
  }

  const { name, description, icon } = bodyResult.data

  try {
    // Verificar se ministerio ainda existe (pode ter sido removido entre o check e agora)
    const ministry = await prisma.ministry.findUnique({ where: { id } })
    if (!ministry) {
      return apiError("Ministerio nao encontrado", 404)
    }

    // Verificar se ja existe uma funcao com esse nome no ministerio
    const existingPosition = await prisma.ministryPosition.findFirst({
      where: {
        ministryId: id,
        name: { equals: name, mode: "insensitive" },
      },
    })

    if (existingPosition) {
      return apiError("Ja existe uma funcao com esse nome neste ministerio", 409)
    }

    const position = await prisma.ministryPosition.create({
      data: {
        ministryId: id,
        name,
        description,
        icon,
      },
    })

    return apiSuccess(position, 201)
  } catch (error) {
    console.error("Erro ao criar funcao:", error)
    return apiError("Erro ao criar funcao", 500)
  }
}
