import { type NextRequest } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { resolveEventId } from "@/lib/events"

const updateAttendanceSchema = z.object({
  attendees: z.number().int().min(0).max(100000).optional(),
  visitors: z.number().int().min(0).max(100000).optional(),
  conversions: z.number().int().min(0).max(100000).optional(),
  notes: z.string().max(2000).nullable().optional(),
})

// GET /api/events/[id]/attendance — retorna a presença (ou zeros se ainda não existir)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id: idOrSlug } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
      return Response.json({ error: "Evento não encontrado" }, { status: 404 })
    }

    const attendance = await prisma.eventAttendance.findUnique({
      where: { eventId },
      include: {
        updatedBy: { select: { id: true, name: true } },
      },
    })

    if (!attendance) {
      return Response.json({
        data: {
          eventId,
          attendees: 0,
          visitors: 0,
          conversions: 0,
          notes: null,
          updatedBy: null,
          updatedAt: null,
        },
      })
    }

    return Response.json({ data: attendance })
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// PUT /api/events/[id]/attendance — cria ou atualiza
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Não autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    if (userRole !== "ADMIN" && userRole !== "LEADER") {
      return Response.json(
        { error: "Acesso negado" },
        { status: 403 }
      )
    }

    const { id: idOrSlug } = await params
    const eventId = await resolveEventId(idOrSlug)
    if (!eventId) {
      return Response.json({ error: "Evento não encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateAttendanceSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data

    const attendance = await prisma.eventAttendance.upsert({
      where: { eventId },
      create: {
        eventId,
        attendees: data.attendees ?? 0,
        visitors: data.visitors ?? 0,
        conversions: data.conversions ?? 0,
        notes: data.notes ?? null,
        updatedById: session.user.id,
      },
      update: {
        ...(data.attendees !== undefined && { attendees: data.attendees }),
        ...(data.visitors !== undefined && { visitors: data.visitors }),
        ...(data.conversions !== undefined && { conversions: data.conversions }),
        ...(data.notes !== undefined && { notes: data.notes }),
        updatedById: session.user.id,
      },
      include: {
        updatedBy: { select: { id: true, name: true } },
      },
    })

    await prisma.eventAttendanceLog.create({
      data: {
        attendanceId: attendance.id,
        eventId,
        attendees: attendance.attendees,
        visitors: attendance.visitors,
        conversions: attendance.conversions,
        notes: attendance.notes,
        updatedById: session.user.id,
      },
    })

    return Response.json({ data: attendance })
  } catch (error) {
    console.error("Error updating attendance:", error)
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
