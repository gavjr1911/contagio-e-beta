import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import {
  getDistributionStats,
  getGlobalDistributionStats,
} from "@/lib/scheduling/suggestions"
import { distributionStatsQuerySchema } from "@/lib/validations/auto-assign"

// ============================================
// GET /api/schedules/stats - Get distribution statistics
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const userRole = session.user.role
    if (!userRole || !["ADMIN", "LEADER"].includes(userRole)) {
      return Response.json(
        { error: "Acesso negado. Apenas ADMIN ou LEADER podem ver estatisticas." },
        { status: 403 }
      )
    }

    // Validate query params
    const searchParams = request.nextUrl.searchParams
    const queryParams: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      queryParams[key] = value
    })

    const queryResult = distributionStatsQuerySchema.safeParse(queryParams)
    if (!queryResult.success) {
      return Response.json(
        { error: "Parametros invalidos", details: queryResult.error.flatten() },
        { status: 400 }
      )
    }

    const { ministryId, days } = queryResult.data
    const daysToAnalyze = days || 30

    // If ministryId provided, get stats for specific ministry
    if (ministryId) {
      const stats = await getDistributionStats(ministryId, daysToAnalyze)
      return Response.json({
        data: {
          type: "ministry",
          days: daysToAnalyze,
          ...stats,
        },
      })
    }

    // Otherwise, get global stats
    const stats = await getGlobalDistributionStats(daysToAnalyze)
    return Response.json({
      data: {
        type: "global",
        days: daysToAnalyze,
        ...stats,
      },
    })
  } catch (error) {
    console.error("Error getting distribution stats:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
