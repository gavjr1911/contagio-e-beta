import { type NextRequest } from "next/server"
import { z } from "zod"

import { auth } from "@/auth"
import { getAuditLogs, type AuditEntityType, type AuditAction } from "@/lib/audit"
import { prisma } from "@/lib/prisma"

// Schema de validacao dos filtros
const auditFiltersSchema = z.object({
  entityType: z.enum(["Schedule", "Event", "EventItem", "EventVacancy"]).optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  action: z
    .enum(["created", "updated", "deleted", "confirmed", "declined", "assigned", "unassigned"])
    .optional(),
  startDate: z
    .string()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
  endDate: z
    .string()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
  page: z
    .string()
    .default("1")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1)),
  limit: z
    .string()
    .default("20")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100)),
})

// GET /api/audit - List audit logs with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Apenas admins e leaders podem ver logs de auditoria
    const userRole = session.user.role
    if (!userRole || !["ADMIN", "LEADER"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN ou LEADER podem ver logs de auditoria." },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const rawFilters = {
      entityType: searchParams.get("entityType") || undefined,
      entityId: searchParams.get("entityId") || undefined,
      userId: searchParams.get("userId") || undefined,
      action: searchParams.get("action") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    }

    const parseResult = auditFiltersSchema.safeParse(rawFilters)

    if (!parseResult.success) {
      return Response.json(
        { error: "Parametros invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const filters = parseResult.data

    // LEADER: restringir logs aos ministerios liderados por ele
    let leaderMinistryIds: string[] | undefined
    if (userRole === "LEADER") {
      const ownedMinistries = await prisma.ministry.findMany({
        where: { leaderId: session.user.id },
        select: { id: true },
      })
      leaderMinistryIds = ownedMinistries.map((m) => m.id)
    }

    const result = await getAuditLogs({
      entityType: filters.entityType as AuditEntityType | undefined,
      entityId: filters.entityId,
      userId: filters.userId,
      action: filters.action as AuditAction | undefined,
      startDate: filters.startDate,
      endDate: filters.endDate,
      page: filters.page,
      limit: filters.limit,
      leaderMinistryIds,
    })

    return Response.json(result)
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
