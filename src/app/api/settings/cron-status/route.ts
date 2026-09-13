import { apiError, apiSuccess, withRole } from "@/lib/api-utils"
import { readLastReminderRun } from "@/lib/cron/last-run.store"
import { evaluateReminderRun } from "@/lib/cron/last-run"

/**
 * GET /api/settings/cron-status
 *
 * Expoe o resultado da ultima execucao do cron de lembretes, gravado em
 * AppSettings (`last_reminder_run`). Somente ADMIN, mesmo criterio das demais
 * rotas de /api/settings (a tela de Configuracoes ja e restrita a admin).
 */
export async function GET() {
  return withRole(["ADMIN"], async () => {
    try {
      const lastRun = await readLastReminderRun()
      return apiSuccess(evaluateReminderRun(lastRun))
    } catch (error) {
      console.error("Erro ao obter status do cron de lembretes:", error)
      return apiError("Erro ao obter status do cron de lembretes", 500)
    }
  })
}

export const dynamic = "force-dynamic"
