import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getTodayLocal } from "@/lib/date-utils"

// ============================================
// GET /api/events/[id]/series
// Returns all events in the series (parent + children)
// If requested event is a child, find parent first
// ============================================
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

    // Get the requested event
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        parentEventId: true,
      },
    })

    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Determine the parent event ID
    const parentEventId = event.parentEventId ?? event.id

    // Get the parent event
    const parentEvent = await prisma.event.findUnique({
      where: { id: parentEventId },
      select: {
        id: true,
        name: true,
        date: true,
        status: true,
        isRecurring: true,
        recurrencePattern: true,
        recurrenceEndDate: true,
      },
    })

    if (!parentEvent) {
      return Response.json(
        { error: "Evento pai nao encontrado" },
        { status: 404 }
      )
    }

    // Get all child events
    const childEvents = await prisma.event.findMany({
      where: { parentEventId },
      select: {
        id: true,
        name: true,
        date: true,
        status: true,
      },
      orderBy: { date: "asc" },
    })

    // Combine parent and children
    const allEvents = [
      {
        id: parentEvent.id,
        name: parentEvent.name,
        date: parentEvent.date,
        status: parentEvent.status,
        isParent: true,
      },
      ...childEvents.map((child) => ({
        id: child.id,
        name: child.name,
        date: child.date,
        status: child.status,
        isParent: false,
      })),
    ]

    return Response.json({
      data: {
        parentEvent: {
          id: parentEvent.id,
          name: parentEvent.name,
          date: parentEvent.date,
          status: parentEvent.status,
          isRecurring: parentEvent.isRecurring,
          recurrencePattern: parentEvent.recurrencePattern,
          recurrenceEndDate: parentEvent.recurrenceEndDate,
        },
        events: allEvents,
        totalCount: allEvents.length,
      },
    })
  } catch (error) {
    console.error("Error fetching event series:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH /api/events/[id]/series
// Update all events in series (future only or all)
// Body: { field: value, updateScope: "all" | "future" }
// Only ADMIN can update
// ============================================
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
        { error: "Acesso negado. Apenas ADMIN pode atualizar series." },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const { updateScope = "all", ...updateData } = body

    if (!["all", "future"].includes(updateScope)) {
      return Response.json(
        { error: "updateScope deve ser 'all' ou 'future'" },
        { status: 400 }
      )
    }

    // Get the requested event
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        parentEventId: true,
        date: true,
      },
    })

    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Determine the parent event ID
    const parentEventId = event.parentEventId ?? event.id

    // Build the where clause based on updateScope
    const now = getTodayLocal()
    const whereClause = updateScope === "future"
      ? {
          OR: [
            { id: parentEventId, date: { gte: now } },
            { parentEventId, date: { gte: now } },
          ],
        }
      : {
          OR: [
            { id: parentEventId },
            { parentEventId },
          ],
        }

    // Only allow updating specific fields
    const allowedFields = ["name", "startTime", "endTime", "status", "templateId"]
    const filteredUpdateData: Record<string, unknown> = {}

    for (const key of Object.keys(updateData)) {
      if (allowedFields.includes(key)) {
        filteredUpdateData[key] = updateData[key]
      }
    }

    if (Object.keys(filteredUpdateData).length === 0) {
      return Response.json(
        { error: "Nenhum campo valido para atualizar" },
        { status: 400 }
      )
    }

    // Update all events in the series
    const result = await prisma.event.updateMany({
      where: whereClause,
      data: filteredUpdateData,
    })

    return Response.json({
      data: {
        updatedCount: result.count,
        updateScope,
      },
    })
  } catch (error) {
    console.error("Error updating event series:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/events/[id]/series
// Delete entire series (parent + all children)
// CASCADE will handle schedules/vacancies
// Only ADMIN can delete
// ============================================
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
        { error: "Acesso negado. Apenas ADMIN pode remover series." },
        { status: 403 }
      )
    }

    const { id } = await params

    // Get the requested event
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        parentEventId: true,
      },
    })

    if (!event) {
      return Response.json({ error: "Evento nao encontrado" }, { status: 404 })
    }

    // Determine the parent event ID
    const parentEventId = event.parentEventId ?? event.id

    // Delete all child events first (due to foreign key constraints)
    const childDeleteResult = await prisma.event.deleteMany({
      where: { parentEventId },
    })

    // Delete the parent event
    await prisma.event.delete({
      where: { id: parentEventId },
    })

    return Response.json({
      data: {
        deletedCount: childDeleteResult.count + 1,
        message: "Serie de eventos removida com sucesso",
      },
    })
  } catch (error) {
    console.error("Error deleting event series:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
