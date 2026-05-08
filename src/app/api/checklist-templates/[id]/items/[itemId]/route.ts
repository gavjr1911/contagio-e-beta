import { NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import {
  apiError,
  apiSuccess,
  validateBody,
  withRole,
} from "@/lib/api-utils"
import { updateChecklistTemplateItemSchema } from "@/lib/validations/checklist"

type RouteParams = { params: Promise<{ id: string; itemId: string }> }

// PATCH /api/checklist-templates/[id]/items/[itemId] - Atualizar item
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withRole(["ADMIN"], async () => {
    const { id: templateId, itemId } = await params

    const item = await prisma.checklistTemplateItem.findFirst({
      where: {
        id: itemId,
        templateId,
      },
    })

    if (!item) {
      return apiError("Item nao encontrado", 404)
    }

    const bodyResult = await validateBody(request, updateChecklistTemplateItemSchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    const { title } = bodyResult.data

    const updatedItem = await prisma.checklistTemplateItem.update({
      where: { id: itemId },
      data: {
        ...(title !== undefined && { title }),
      },
    })

    return apiSuccess(updatedItem)
  })
}

// DELETE /api/checklist-templates/[id]/items/[itemId] - Remover item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withRole(["ADMIN"], async () => {
    const { id: templateId, itemId } = await params

    const item = await prisma.checklistTemplateItem.findFirst({
      where: {
        id: itemId,
        templateId,
      },
    })

    if (!item) {
      return apiError("Item nao encontrado", 404)
    }

    await prisma.checklistTemplateItem.delete({
      where: { id: itemId },
    })

    // Reordenar itens restantes
    const remainingItems = await prisma.checklistTemplateItem.findMany({
      where: { templateId },
      orderBy: { order: "asc" },
    })

    await prisma.$transaction(
      remainingItems.map((item, index) =>
        prisma.checklistTemplateItem.update({
          where: { id: item.id },
          data: { order: index },
        })
      )
    )

    return apiSuccess({ deleted: true })
  })
}
