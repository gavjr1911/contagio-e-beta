import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { updateAutoAssignConfigSchema } from "@/lib/validations/auto-assign"

type RouteParams = {
  params: Promise<{ id: string }>
}

// ============================================
// Helper: Check if user has permission for ministry
// ============================================

async function hasMinistryPermission(
  userId: string,
  userRole: string,
  ministryId: string
): Promise<boolean> {
  // ADMIN and COORDINATOR have access to all ministries
  if (userRole === "ADMIN" || userRole === "COORDINATOR") {
    return true
  }

  // LEADER has access if they lead the ministry
  if (userRole === "LEADER") {
    const ministry = await prisma.ministry.findFirst({
      where: {
        id: ministryId,
        leaderId: userId,
      },
    })
    return !!ministry
  }

  return false
}

// ============================================
// GET /api/ministries/[id]/auto-assign-config - Get config
// ============================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    if (!userRole || !["ADMIN", "COORDINATOR", "LEADER"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN, COORDINATOR ou LEADER podem visualizar configuracao." },
        { status: 403 }
      )
    }

    const { id: ministryId } = await params

    // Check if ministry exists
    const ministry = await prisma.ministry.findUnique({
      where: { id: ministryId },
      select: { id: true, leaderId: true },
    })

    if (!ministry) {
      return Response.json({ error: "Ministerio nao encontrado" }, { status: 404 })
    }

    // Check permission
    const hasPermission = await hasMinistryPermission(
      session.user.id,
      userRole,
      ministryId
    )

    if (!hasPermission) {
      return Response.json(
        { error: "Acesso negado a este ministerio" },
        { status: 403 }
      )
    }

    // Get config or return defaults
    const config = await prisma.ministryAutoAssignConfig.findUnique({
      where: { ministryId },
    })

    if (!config) {
      // Return default values
      return Response.json({
        data: {
          enabled: false,
          autoAssignUntil: null,
          avoidConsecutive: true,
          maxEventsPerMonth: null,
          rotationWeight: 40,
          availabilityWeight: 40,
        },
      })
    }

    return Response.json({
      data: {
        enabled: config.enabled,
        autoAssignUntil: config.autoAssignUntil?.toISOString() || null,
        avoidConsecutive: config.avoidConsecutive,
        maxEventsPerMonth: config.maxEventsPerMonth,
        rotationWeight: config.rotationWeight,
        availabilityWeight: config.availabilityWeight,
      },
    })
  } catch (error) {
    console.error("Error getting auto-assign config:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH /api/ministries/[id]/auto-assign-config - Update config
// ============================================

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    if (!userRole || !["ADMIN", "COORDINATOR", "LEADER"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN, COORDINATOR ou LEADER podem atualizar configuracao." },
        { status: 403 }
      )
    }

    const { id: ministryId } = await params

    // Check if ministry exists
    const ministry = await prisma.ministry.findUnique({
      where: { id: ministryId },
      select: { id: true, leaderId: true },
    })

    if (!ministry) {
      return Response.json({ error: "Ministerio nao encontrado" }, { status: 404 })
    }

    // Check permission
    const hasPermission = await hasMinistryPermission(
      session.user.id,
      userRole,
      ministryId
    )

    if (!hasPermission) {
      return Response.json(
        { error: "Acesso negado a este ministerio" },
        { status: 403 }
      )
    }

    // Parse body
    const body = await request.json()
    const parseResult = updateAutoAssignConfigSchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const updateData = parseResult.data

    // Build update object with only provided fields
    const dataToUpdate: {
      enabled?: boolean
      autoAssignUntil?: Date | null
      avoidConsecutive?: boolean
      maxEventsPerMonth?: number | null
      rotationWeight?: number
      availabilityWeight?: number
    } = {}

    if (updateData.enabled !== undefined) {
      dataToUpdate.enabled = updateData.enabled
    }
    if (updateData.autoAssignUntil !== undefined) {
      dataToUpdate.autoAssignUntil = updateData.autoAssignUntil
    }
    if (updateData.avoidConsecutive !== undefined) {
      dataToUpdate.avoidConsecutive = updateData.avoidConsecutive
    }
    if (updateData.maxEventsPerMonth !== undefined) {
      dataToUpdate.maxEventsPerMonth = updateData.maxEventsPerMonth
    }
    if (updateData.rotationWeight !== undefined) {
      dataToUpdate.rotationWeight = updateData.rotationWeight
    }
    if (updateData.availabilityWeight !== undefined) {
      dataToUpdate.availabilityWeight = updateData.availabilityWeight
    }

    // Upsert config
    const config = await prisma.ministryAutoAssignConfig.upsert({
      where: { ministryId },
      update: dataToUpdate,
      create: {
        ministryId,
        enabled: dataToUpdate.enabled ?? false,
        autoAssignUntil: dataToUpdate.autoAssignUntil ?? null,
        avoidConsecutive: dataToUpdate.avoidConsecutive ?? true,
        maxEventsPerMonth: dataToUpdate.maxEventsPerMonth ?? null,
        rotationWeight: dataToUpdate.rotationWeight ?? 40,
        availabilityWeight: dataToUpdate.availabilityWeight ?? 40,
      },
    })

    return Response.json({
      data: {
        enabled: config.enabled,
        autoAssignUntil: config.autoAssignUntil?.toISOString() || null,
        avoidConsecutive: config.avoidConsecutive,
        maxEventsPerMonth: config.maxEventsPerMonth,
        rotationWeight: config.rotationWeight,
        availabilityWeight: config.availabilityWeight,
      },
    })
  } catch (error) {
    console.error("Error updating auto-assign config:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
