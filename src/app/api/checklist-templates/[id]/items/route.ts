import { NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import {
  apiError,
  apiSuccess,
  validateBody,
  withPermission,
} from "@/lib/api-utils"
import {
  createChecklistTemplateItemSchema,
  reorderChecklistItemsSchema,
} from "@/lib/validations/checklist"

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/checklist-templates/[id]/items - Listar itens do template
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withPermission("checklists", "view", async () => {
    const { id: templateId } = await params

    const template = await prisma.checklistTemplate.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      return apiError("Template nao encontrado", 404)
    }

    const items = await prisma.checklistTemplateItem.findMany({
      where: { templateId },
      orderBy: { order: "asc" },
    })

    return apiSuccess(items)
  })
}

// POST /api/checklist-templates/[id]/items - Adicionar item ao template
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withPermission("checklists", "edit", async () => {
    const { id: templateId } = await params

    const template = await prisma.checklistTemplate.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      return apiError("Template nao encontrado", 404)
    }

    const bodyResult = await validateBody(request, createChecklistTemplateItemSchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    const { title, order } = bodyResult.data

    // Se order nao foi especificado, colocar no final
    let itemOrder = order
    if (itemOrder === undefined) {
      const lastItem = await prisma.checklistTemplateItem.findFirst({
        where: { templateId },
        orderBy: { order: "desc" },
      })
      itemOrder = (lastItem?.order ?? -1) + 1
    }

    const item = await prisma.checklistTemplateItem.create({
      data: {
        templateId,
        title,
        order: itemOrder,
      },
    })

    return apiSuccess(item, 201)
  })
}

// PATCH /api/checklist-templates/[id]/items - Reordenar itens
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withPermission("checklists", "edit", async () => {
    const { id: templateId } = await params

    const template = await prisma.checklistTemplate.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      return apiError("Template nao encontrado", 404)
    }

    const bodyResult = await validateBody(request, reorderChecklistItemsSchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    const { itemIds } = bodyResult.data

    // Verificar se todos os itens pertencem ao template
    const existingItems = await prisma.checklistTemplateItem.findMany({
      where: {
        templateId,
        id: { in: itemIds },
      },
    })

    if (existingItems.length !== itemIds.length) {
      return apiError("Alguns itens nao pertencem a este template", 400)
    }

    // Atualizar ordem de cada item
    await prisma.$transaction(
      itemIds.map((itemId, index) =>
        prisma.checklistTemplateItem.update({
          where: { id: itemId },
          data: { order: index },
        })
      )
    )

    // Retornar itens atualizados
    const items = await prisma.checklistTemplateItem.findMany({
      where: { templateId },
      orderBy: { order: "asc" },
    })

    return apiSuccess(items)
  })
}
