import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { applyTemplateSchema, TemplateItem, TemplateSchedule } from "@/lib/validations/template"
import type { EventItemType } from "@/generated/prisma/client"

// POST /api/templates/[id]/apply - Apply template to an event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    if (userRole !== "ADMIN") {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN pode aplicar templates." },
        { status: 403 }
      )
    }

    const { id: templateId } = await params
    const body = await request.json()
    const parseResult = applyTemplateSchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { eventId, applyItems, applyVacancies } = parseResult.data

    // Get template
    const template = await prisma.eventTemplate.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      return Response.json({ error: "Template nao encontrado" }, { status: 404 })
    }

    // Get event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        items: true,
        vacancies: true,
      },
    })

    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    const results = {
      itemsCreated: 0,
      vacanciesCreated: 0,
    }

    // Apply items if requested
    if (applyItems && template.defaultItems) {
      const defaultItems = template.defaultItems as TemplateItem[]

      if (defaultItems.length > 0) {
        // Get current max order
        const maxOrder = event.items.length > 0
          ? Math.max(...event.items.map((item) => item.order))
          : -1

        // Create items
        const itemsData = defaultItems.map((item, index) => ({
          eventId,
          order: maxOrder + 1 + index,
          type: item.type as EventItemType,
          title: item.title,
          description: item.description || null,
          durationMinutes: item.durationMinutes || null,
          requiresMedia: item.requiresMedia || false,
          bibleReference: item.bibleReference || null,
          notes: item.notes || null,
          isPublic: item.isPublic ?? true,
          expectedSongCount: item.expectedSongCount || null,
        }))

        await prisma.eventItem.createMany({
          data: itemsData,
        })

        results.itemsCreated = itemsData.length
      }
    }

    // Apply vacancies if requested
    if (applyVacancies && template.defaultSchedules) {
      const defaultSchedules = template.defaultSchedules as TemplateSchedule[]

      if (defaultSchedules.length > 0) {
        // Validate ministries and positions
        const ministryIds = [...new Set(defaultSchedules.map((s) => s.ministryId))]
        const positionIds = [...new Set(defaultSchedules.map((s) => s.positionId))]

        const [ministries, positions] = await Promise.all([
          prisma.ministry.findMany({
            where: { id: { in: ministryIds } },
            select: { id: true },
          }),
          prisma.ministryPosition.findMany({
            where: { id: { in: positionIds } },
            select: { id: true, ministryId: true },
          }),
        ])

        const existingMinistryIds = new Set(ministries.map((m) => m.id))
        const existingPositionIds = new Set(positions.map((p) => p.id))
        const positionMinistryMap = new Map(positions.map((p) => [p.id, p.ministryId]))

        // Filter only valid schedules
        const validSchedules = defaultSchedules.filter((schedule) => {
          if (!existingMinistryIds.has(schedule.ministryId)) return false
          if (!existingPositionIds.has(schedule.positionId)) return false
          if (positionMinistryMap.get(schedule.positionId) !== schedule.ministryId) return false
          return true
        })

        // Check for existing vacancies
        const existingVacancyKeys = new Set(
          event.vacancies.map((v) => `${v.ministryId}-${v.positionId}`)
        )

        // Filter out already existing vacancies
        const newSchedules = validSchedules.filter(
          (schedule) => !existingVacancyKeys.has(`${schedule.ministryId}-${schedule.positionId}`)
        )

        if (newSchedules.length > 0) {
          await prisma.eventVacancy.createMany({
            data: newSchedules.map((schedule) => ({
              eventId,
              ministryId: schedule.ministryId,
              positionId: schedule.positionId,
              quantity: schedule.quantity,
            })),
          })

          results.vacanciesCreated = newSchedules.length
        }
      }
    }

    // Update event to link to template
    await prisma.event.update({
      where: { id: eventId },
      data: { templateId },
    })

    // Fetch updated event
    const updatedEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        template: { select: { id: true, name: true } },
        items: { orderBy: { order: "asc" } },
        vacancies: {
          include: {
            ministry: { select: { id: true, name: true } },
            position: { select: { id: true, name: true } },
          },
        },
      },
    })

    return Response.json({
      data: updatedEvent,
      applied: results,
      message: `Template aplicado: ${results.itemsCreated} itens e ${results.vacanciesCreated} vagas criados.`,
    })
  } catch (error) {
    console.error("Error applying template:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
