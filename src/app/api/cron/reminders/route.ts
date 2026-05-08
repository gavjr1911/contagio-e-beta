import { NextRequest, NextResponse } from "next/server"
import { sendAllReminders } from "@/lib/email/send"

// Chave de autenticacao para cron jobs
const CRON_SECRET = process.env.CRON_SECRET;
if (!CRON_SECRET) {
  throw new Error("CRON_SECRET não configurado — defina a variável de ambiente");
}

/**
 * Endpoint para envio automatico de lembretes de escala
 *
 * Configuracao do Vercel Cron (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/reminders",
 *     "schedule": "0 8 * * *"
 *   }]
 * }
 *
 * Isso executa todos os dias as 8h da manha
 */
export async function GET(request: NextRequest) {
  try {
    // Valida autenticacao
    const authHeader = request.headers.get("authorization")
    const cronSecret = request.headers.get("x-cron-secret")

    // Verifica se a chamada e do Vercel Cron ou tem a chave secreta
    const isVercelCron = request.headers.get("x-vercel-cron") === "true"
    const hasValidSecret =
      cronSecret === CRON_SECRET ||
      authHeader === `Bearer ${CRON_SECRET}`

    if (!isVercelCron && !hasValidSecret && process.env.NODE_ENV === "production") {
      console.log("[Cron/Reminders] Acesso nao autorizado")
      return NextResponse.json(
        { error: "Nao autorizado" },
        { status: 401 }
      )
    }

    console.log("[Cron/Reminders] Iniciando envio de lembretes...")

    // Envia todos os lembretes
    const result = await sendAllReminders()

    console.log(
      `[Cron/Reminders] Concluido - Enviados: ${result.sent}, Falhas: ${result.failed}`
    )

    if (result.errors.length > 0) {
      console.log("[Cron/Reminders] Erros:", result.errors)
    }

    return NextResponse.json({
      success: true,
      message: "Lembretes processados",
      sent: result.sent,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido"
    console.error("[Cron/Reminders] Erro:", message)

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}

// Configuracao para Vercel
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60 // 60 segundos max
