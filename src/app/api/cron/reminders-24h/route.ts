import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendScheduleReminder } from "@/lib/email/send"

// Chave de autenticacao para cron jobs
const CRON_SECRET = process.env.CRON_SECRET;
if (!CRON_SECRET) {
  throw new Error("CRON_SECRET não configurado — defina a variável de ambiente");
}

/**
 * Endpoint para envio automatico de lembretes de escala 24h antes
 *
 * Configuracao do Vercel Cron (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/reminders-24h",
 *     "schedule": "0 8 * * *"
 *   }]
 * }
 *
 * Isso executa todos os dias as 8h da manha
 *
 * Tambem pode ser chamado manualmente via POST para testes
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
      console.log("[Cron/Reminders-24h] Acesso nao autorizado")
      return NextResponse.json(
        { error: "Nao autorizado" },
        { status: 401 }
      )
    }

    console.log("[Cron/Reminders-24h] Iniciando envio de lembretes 24h...")

    // Envia lembretes para escalas de amanha
    const result = await sendReminders24h()

    console.log(
      `[Cron/Reminders-24h] Concluido - Enviados: ${result.sent}, Falhas: ${result.failed}`
    )

    if (result.errors.length > 0) {
      console.log("[Cron/Reminders-24h] Erros:", result.errors)
    }

    return NextResponse.json({
      success: true,
      message: "Lembretes 24h processados",
      sent: result.sent,
      failed: result.failed,
      schedulesFound: result.schedulesFound,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido"
    console.error("[Cron/Reminders-24h] Erro:", message)

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}

/**
 * Busca e envia lembretes para escalas confirmadas que acontecerao em 24h
 */
async function sendReminders24h(): Promise<{
  sent: number
  failed: number
  schedulesFound: number
  errors: string[]
}> {
  // Calcula a data de amanha (24h a partir de agora)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const dayAfterTomorrow = new Date(tomorrow)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

  // Busca escalas confirmadas para amanha
  const schedules = await prisma.schedule.findMany({
    where: {
      status: "CONFIRMED",
      event: {
        date: {
          gte: tomorrow,
          lt: dayAfterTomorrow,
        },
      },
    },
    include: {
      event: true,
      ministry: true,
      user: true,
    },
  })

  let sent = 0
  let failed = 0
  const errors: string[] = []

  // Envia lembrete para cada escala
  for (const schedule of schedules) {
    if (!schedule.user.email) {
      failed++
      errors.push(`${schedule.user.name || schedule.userId}: Sem email cadastrado`)
      continue
    }

    try {
      const result = await sendScheduleReminder(
        {
          id: schedule.id,
          eventId: schedule.eventId,
          ministryId: schedule.ministryId,
          userId: schedule.userId,
          position: schedule.position,
          status: schedule.status,
          event: {
            id: schedule.event.id,
            name: schedule.event.name,
            date: schedule.event.date,
            startTime: schedule.event.startTime,
            endTime: schedule.event.endTime,
          },
          ministry: {
            id: schedule.ministry.id,
            name: schedule.ministry.name,
          },
          user: {
            id: schedule.user.id,
            name: schedule.user.name,
            email: schedule.user.email,
          },
        },
        1 // 1 dia ate o evento
      )

      if (result.success) {
        sent++
      } else {
        failed++
        errors.push(`${schedule.user.email}: ${result.error}`)
      }
    } catch (error) {
      failed++
      const errorMsg = error instanceof Error ? error.message : "Erro desconhecido"
      errors.push(`${schedule.user.email}: ${errorMsg}`)
    }
  }

  return {
    sent,
    failed,
    schedulesFound: schedules.length,
    errors,
  }
}

// Permite POST para testes manuais
export async function POST(request: NextRequest) {
  return GET(request)
}

// Configuracao para Vercel
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60 // 60 segundos max
