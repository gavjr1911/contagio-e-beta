import { NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import { apiError, apiSuccess, validateBody, withAuth } from "@/lib/api-utils"
import {
  canEditEventChecklistWith,
  CHECKLIST_DENIED_MESSAGE,
  CHECKLIST_EVENT_COMPLETED_MESSAGE,
} from "@/lib/permissions/event-access"
import { loadEventAssignments } from "@/lib/permissions/event-access.server"
import { initEventChecklistSchema } from "@/lib/validations/checklist"
import { resolveEventId } from "@/lib/events"

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/events/[id]/checklist/init - Instanciar checklist do template
export async function POST(request: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { id: idOrSlug } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
      return apiError("Evento nao encontrado", 404)
    }

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

    // Estado do evento antes da permissao — ver nota em `../route.ts`.
    if (event.status === "COMPLETED") {
      return apiError(CHECKLIST_EVENT_COMPLETED_MESSAGE, 400)
    }

    const canEdit = canEditEventChecklistWith(
      session.user.role,
      await loadEventAssignments(eventId, session.user.id)
    )
    if (!canEdit) {
      return apiError(CHECKLIST_DENIED_MESSAGE, 403)
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

    // Criar copias dos itens do template para o evento.
    //
    // SERIALIZADO POR EVENTO com advisory lock. Reconferir a contagem dentro da
    // transacao NAO basta: no isolamento padrao do Postgres (READ COMMITTED) duas
    // transacoes concorrentes leem zero e as duas inserem — medido, deu 24 itens
    // onde deviam ser 12. Isso ja valia para o botao manual, mas desde que a aba
    // passou a materializar sozinha ao abrir dentro da janela do culto, "duas
    // pessoas abrindo ao mesmo tempo" deixou de ser raro e virou o caso comum do
    // domingo.
    //
    // `pg_advisory_xact_lock` serializa apenas as execucoes DESTE evento e e
    // liberado no fim da transacao (inclusive em rollback), sem mexer no schema.
    // `hashtextextended` devolve bigint, que e o tipo que a versao de um
    // argumento espera.
    const createdItems = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`checklist-init:${eventId}`}, 0))`

      const jaExistem = await tx.eventChecklistItem.count({ where: { eventId } })
      if (jaExistem > 0) return null

      return Promise.all(
        template.items.map((templateItem) =>
          tx.eventChecklistItem.create({
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
    })

    if (createdItems === null) {
      return apiError("Checklist ja foi iniciado para este evento", 400)
    }

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
