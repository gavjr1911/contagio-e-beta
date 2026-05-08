import { NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import { apiError, apiSuccess, validateBody } from "@/lib/api-utils"
import { withCerimonial } from "@/lib/permissions"
import { initEventChecklistSchema } from "@/lib/validations/checklist"

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/events/[id]/checklist/init - Instanciar checklist do template
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withCerimonial(async () => {
    const { id: eventId } = await params

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        checklistTemplate: {
          include: {
            items: {
              orderBy: { order: "asc" },
            },
          },
        },
        checklistItems: true,
      },
    })

    if (!event) {
      return apiError("Evento nao encontrado", 404)
    }

    // Verificar se evento esta concluido
    if (event.status === "COMPLETED") {
      return apiError("Nao e possivel iniciar checklist em eventos concluidos", 400)
    }

    // Verificar se ja tem itens instanciados
    if (event.checklistItems.length > 0) {
      return apiError("Checklist ja foi iniciado para este evento", 400)
    }

    // Permitir passar um templateId diferente do associado ao evento
    const bodyResult = await validateBody(request, initEventChecklistSchema)

    let templateId = event.checklistTemplateId

    if (bodyResult.success && bodyResult.data.templateId) {
      templateId = bodyResult.data.templateId
    }

    if (!templateId) {
      return apiError("Nenhum template de checklist associado ao evento", 400)
    }

    // Buscar template com itens
    const template = await prisma.checklistTemplate.findUnique({
      where: { id: templateId },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
      },
    })

    if (!template) {
      return apiError("Template de checklist nao encontrado", 404)
    }

    if (template.items.length === 0) {
      return apiError("Template nao tem itens para instanciar", 400)
    }

    // Criar copias dos itens do template para o evento
    const createdItems = await prisma.$transaction(
      template.items.map((templateItem) =>
        prisma.eventChecklistItem.create({
          data: {
            eventId,
            title: templateItem.title,
            order: templateItem.order,
            fromTemplate: true,
          },
          include: {
            completedBy: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        })
      )
    )

    // Se o evento nao tinha template associado, associar agora
    if (!event.checklistTemplateId && templateId) {
      await prisma.event.update({
        where: { id: eventId },
        data: { checklistTemplateId: templateId },
      })
    }

    return apiSuccess({
      items: createdItems,
      message: `Checklist iniciado com ${createdItems.length} itens`,
    }, 201)
  })
}
