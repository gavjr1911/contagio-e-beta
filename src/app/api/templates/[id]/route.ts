import { type NextRequest } from "next/server"
import { Prisma } from "@/generated/prisma/client"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { updateTemplateSchema } from "@/lib/validations/template"

// GET /api/templates/[id] - Get template details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id } = await params

    const template = await prisma.eventTemplate.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { events: true },
        },
      },
    })

    if (!template) {
      return Response.json({ error: "Template nao encontrado" }, { status: 404 })
    }

    return Response.json({ data: template })
  } catch (error) {
    console.error("Error fetching template:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// PATCH /api/templates/[id] - Update template (ADMIN only)
export async function PATCH(
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
        { error: "Acesso negado. Apenas ADMIN pode editar templates." },
        { status: 403 }
      )
    }

    const { id } = await params

    const existingTemplate = await prisma.eventTemplate.findUnique({
      where: { id },
    })
    if (!existingTemplate) {
      return Response.json({ error: "Template nao encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const parseResult = updateTemplateSchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const updateData = parseResult.data

    // Validate ministries and positions if defaultSchedules is provided
    if (updateData.defaultSchedules && updateData.defaultSchedules.length > 0) {
      const ministryIds = [...new Set(updateData.defaultSchedules.map((s) => s.ministryId))]
      const positionIds = [...new Set(updateData.defaultSchedules.map((s) => s.positionId))]

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

      for (const schedule of updateData.defaultSchedules) {
        if (!existingMinistryIds.has(schedule.ministryId)) {
          return Response.json(
            { error: `Ministerio ${schedule.ministryId} nao encontrado` },
            { status: 400 }
          )
        }
        if (!existingPositionIds.has(schedule.positionId)) {
          return Response.json(
            { error: `Funcao ${schedule.positionId} nao encontrada` },
            { status: 400 }
          )
        }
        if (positionMinistryMap.get(schedule.positionId) !== schedule.ministryId) {
          return Response.json(
            { error: `Funcao ${schedule.positionId} nao pertence ao ministerio ${schedule.ministryId}` },
            { status: 400 }
          )
        }
      }
    }

    // Prepare data for Prisma - handle null JSON values correctly
    const prismaData: Prisma.EventTemplateUpdateInput = {
      ...(updateData.name && { name: updateData.name }),
      ...(updateData.description !== undefined && { description: updateData.description }),
      ...(updateData.eventType && { eventType: updateData.eventType }),
      ...(updateData.duration !== undefined && { duration: updateData.duration }),
      ...(updateData.defaultSchedules !== undefined && {
        defaultSchedules: updateData.defaultSchedules === null
          ? Prisma.DbNull
          : updateData.defaultSchedules,
      }),
      ...(updateData.defaultItems !== undefined && {
        defaultItems: updateData.defaultItems === null
          ? Prisma.DbNull
          : updateData.defaultItems,
      }),
    }

    const template = await prisma.eventTemplate.update({
      where: { id },
      data: prismaData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { events: true },
        },
      },
    })

    return Response.json({ data: template })
  } catch (error) {
    console.error("Error updating template:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// DELETE /api/templates/[id] - Delete template (ADMIN only)
export async function DELETE(
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
        { error: "Acesso negado. Apenas ADMIN pode remover templates." },
        { status: 403 }
      )
    }

    const { id } = await params

    const existingTemplate = await prisma.eventTemplate.findUnique({
      where: { id },
    })
    if (!existingTemplate) {
      return Response.json({ error: "Template nao encontrado" }, { status: 404 })
    }

    await prisma.eventTemplate.delete({ where: { id } })

    return Response.json({ message: "Template removido com sucesso" })
  } catch (error) {
    console.error("Error deleting template:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
