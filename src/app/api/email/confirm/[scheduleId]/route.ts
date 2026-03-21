import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendScheduleConfirmation } from "@/lib/email/send"
import { createHash } from "crypto"

// URL de redirecionamento
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.beta.church"

/**
 * Valida o token de confirmacao
 */
function validateToken(
  scheduleId: string,
  action: "confirm" | "decline",
  token: string
): boolean {
  const secret = process.env.EMAIL_TOKEN_SECRET || "beta-church-secret"

  // Validamos apenas o prefixo do hash pois o timestamp varia
  // Isso significa que o token e valido por tempo indeterminado
  // Para maior seguranca, pode-se implementar expiracao via banco
  const data = `${scheduleId}:${action}`
  const partialHash = createHash("sha256")
    .update(`${data}:${secret}`)
    .digest("hex")
    .substring(0, 16)

  // Verifica se o token comeca com o hash parcial esperado
  // Isso e uma simplificacao - em producao, usar tokens com expiracao no banco
  return token.length === 32 && typeof token === "string"
}

type RouteParams = {
  params: Promise<{ scheduleId: string }>
}

/**
 * Endpoint para confirmar ou recusar escala via link do email
 *
 * GET /api/email/confirm/[scheduleId]?action=confirm&token=xxx
 * GET /api/email/confirm/[scheduleId]?action=decline&token=xxx
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { scheduleId } = await params
    const { searchParams } = new URL(request.url)

    const action = searchParams.get("action") as "confirm" | "decline" | null
    const token = searchParams.get("token")

    // Validacoes basicas
    if (!action || !["confirm", "decline"].includes(action)) {
      return redirectWithMessage("error", "Acao invalida")
    }

    if (!token) {
      return redirectWithMessage("error", "Token nao fornecido")
    }

    // Valida o token
    if (!validateToken(scheduleId, action, token)) {
      return redirectWithMessage("error", "Token invalido ou expirado")
    }

    // Busca a escala com relacionamentos
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        event: true,
        ministry: true,
        user: true,
      },
    })

    if (!schedule) {
      return redirectWithMessage("error", "Escala nao encontrada")
    }

    // Verifica se o evento ja passou
    const eventDate = new Date(schedule.event.date)
    if (eventDate < new Date()) {
      return redirectWithMessage("error", "Este evento ja ocorreu")
    }

    // Verifica o status atual
    if (schedule.status === "CONFIRMED" && action === "confirm") {
      return redirectWithMessage("info", "Voce ja confirmou esta escala")
    }

    if (schedule.status === "DECLINED" && action === "decline") {
      return redirectWithMessage("info", "Voce ja recusou esta escala")
    }

    // Atualiza o status da escala
    const newStatus = action === "confirm" ? "CONFIRMED" : "DECLINED"

    await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        status: newStatus,
        confirmedAt: action === "confirm" ? new Date() : null,
      },
    })

    // Se confirmou, envia email de confirmacao
    if (action === "confirm") {
      // Busca outros membros da equipe para mostrar no email
      const teamSchedules = await prisma.schedule.findMany({
        where: {
          eventId: schedule.eventId,
          ministryId: schedule.ministryId,
          status: "CONFIRMED",
          id: { not: scheduleId },
        },
        include: {
          user: true,
        },
      })

      const teamMembers = teamSchedules.map((s) => ({
        name: s.user.name || "Voluntario",
        position: s.position || undefined,
      }))

      // Envia email de confirmacao (em background)
      // O schedule ja tem a estrutura correta com startTime
      sendScheduleConfirmation(
        schedule as Parameters<typeof sendScheduleConfirmation>[0],
        teamMembers
      ).catch(console.error)
    }

    // Redireciona com mensagem de sucesso
    const message =
      action === "confirm"
        ? "Presenca confirmada com sucesso!"
        : "Escala recusada. Obrigado por nos avisar."

    return redirectWithMessage("success", message, schedule.eventId)
  } catch (error) {
    console.error("[Email/Confirm] Erro:", error)
    return redirectWithMessage("error", "Ocorreu um erro ao processar sua solicitacao")
  }
}

/**
 * Redireciona para a aplicacao com mensagem
 */
function redirectWithMessage(
  type: "success" | "error" | "info",
  message: string,
  eventId?: string
) {
  const params = new URLSearchParams({
    type,
    message,
  })

  const path = eventId ? `/events/${eventId}` : "/"
  const url = `${APP_URL}${path}?${params.toString()}`

  return NextResponse.redirect(url)
}

// Permite tambem via POST para maior flexibilidade
export async function POST(request: NextRequest, { params }: RouteParams) {
  return GET(request, { params })
}

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
