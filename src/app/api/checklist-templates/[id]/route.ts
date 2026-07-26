import { NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import {
  apiError,
  apiSuccess,
  validateBody,
  withPermission,
} from "@/lib/api-utils"
import { updateChecklistTemplateSchema } from "@/lib/validations/checklist"

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/checklist-templates/[id] - Detalhes do template
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withPermission("checklists", "view", async () => {
    const { id } = await params

    const template = await prisma.checklistTemplate.findUnique({
      where: { id },
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
    })

    if (!template) {
      return apiError("Template nao encontrado", 404)
    }

    return apiSuccess(template)
  })
}

// PATCH /api/checklist-templates/[id] - Atualizar template
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return withPermission("checklists", "edit", async () => {
    const { id } = await params

    const template = await prisma.checklistTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      return apiError("Template nao encontrado", 404)
    }

    const bodyResult = await validateBody(request, updateChecklistTemplateSchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    const { name, description } = bodyResult.data

    // Verificar se ja existe outro template com mesmo nome
    if (name) {
      const existingTemplate = await prisma.checklistTemplate.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          id: { not: id },
        },
      })

      if (existingTemplate) {
        return apiError("Ja existe outro template com esse nome", 400)
      }
    }

    const updatedTemplate = await prisma.checklistTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
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
    })

    return apiSuccess(updatedTemplate)
  })
}

// DELETE /api/checklist-templates/[id] - Excluir template
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withPermission("checklists", "edit", async () => {
    const { id } = await params

    const template = await prisma.checklistTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: { events: true },
        },
      },
    })

    if (!template) {
      return apiError("Template nao encontrado", 404)
    }

    // Avisar se template esta em uso (mas permitir deletar)
    // Os eventos que usam esse template terao checklistTemplateId = null (onDelete: SetNull)

    await prisma.checklistTemplate.delete({
      where: { id },
    })

    return apiSuccess({ deleted: true, eventsAffected: template._count.events })
  })
}
