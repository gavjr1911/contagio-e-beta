import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendScheduleConfirmation, TOKEN_EXPIRATION_MS } from "@/lib/email/send"
import { createHmac } from "crypto"
import { formatDateToISO, getTodayLocal } from "@/lib/date-utils"

// URL de redirecionamento
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.beta.church"

// ============================================
// RATE LIMITING (em memoria - para dev)
// Em producao, usar Redis ou similar
// ============================================

interface RateLimitEntry {
  count: number
  firstAttempt: number
}

// Map de IP -> tentativas (limpa automaticamente apos 1 hora)
const rateLimitMap = new Map<string, RateLimitEntry>()

// Configuracao: 5 tentativas por IP por hora
const RATE_LIMIT_MAX_ATTEMPTS = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hora

/**
 * Verifica e atualiza rate limit para um IP
 * Retorna true se a requisicao deve ser bloqueada
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  // Limpa entradas antigas periodicamente
  if (rateLimitMap.size > 10000) {
    cleanupRateLimitMap()
  }

  if (!entry) {
    // Primeira tentativa deste IP
    rateLimitMap.set(ip, { count: 1, firstAttempt: now })
    return false
  }

  // Verifica se a janela expirou
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    // Reset: janela expirou
    rateLimitMap.set(ip, { count: 1, firstAttempt: now })
    return false
  }

  // Dentro da janela - incrementa contador
  entry.count++

  // Bloqueia se excedeu limite
  if (entry.count > RATE_LIMIT_MAX_ATTEMPTS) {
    return true
  }

  return false
}

/**
 * Remove entradas antigas do rate limit map
 */
function cleanupRateLimitMap(): void {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip)
    }
  }
}

// ============================================
// VALIDACAO DE TOKEN
// ============================================

/**
 * Valida o token de confirmacao com HMAC e expiracao
 * Token formato: <timestamp_base64>.<hmac_signature>
 */
function validateToken(
  scheduleId: string,
  action: "confirm" | "decline",
  token: string
): { valid: boolean; error?: string } {
  const secret = process.env.NEXTAUTH_SECRET || process.env.EMAIL_TOKEN_SECRET;
  if (!secret) {
    return { valid: false, error: "Configuração inválida do servidor" };
  }

  // Verifica formato basico do token
  const parts = token.split(".")
  if (parts.length !== 2) {
    return { valid: false, error: "Formato de token invalido" }
  }

  const [timestampBase64, providedHmac] = parts

  // Decodifica timestamp
  let timestamp: number
  try {
    const timestampStr = Buffer.from(timestampBase64, "base64url").toString("utf8")
    timestamp = parseInt(timestampStr, 10)

    if (isNaN(timestamp)) {
      return { valid: false, error: "Timestamp invalido" }
    }
  } catch {
    return { valid: false, error: "Erro ao decodificar token" }
  }

  // Verifica expiracao (24 horas)
  const now = Date.now()
  if (now - timestamp > TOKEN_EXPIRATION_MS) {
    return { valid: false, error: "Token expirado. Solicite um novo convite." }
  }

  // Verifica se o token nao e do futuro (tolerancia de 5 minutos)
  if (timestamp > now + 5 * 60 * 1000) {
    return { valid: false, error: "Token invalido" }
  }

  // Recalcula HMAC para verificar assinatura
  const data = `${scheduleId}:${action}:${timestamp}`
  const expectedHmac = createHmac("sha256", secret).update(data).digest("base64url").substring(0, 32)

  // Comparacao segura contra timing attacks
  if (providedHmac.length !== expectedHmac.length) {
    return { valid: false, error: "Token invalido" }
  }

  let isValid = true
  for (let i = 0; i < expectedHmac.length; i++) {
    if (providedHmac[i] !== expectedHmac[i]) {
      isValid = false
    }
  }

  if (!isValid) {
    return { valid: false, error: "Token invalido" }
  }

  return { valid: true }
}

type RouteParams = {
  params: Promise<{ scheduleId: string }>
}

/**
 * Obtem o IP do cliente da requisicao
 */
function getClientIp(request: NextRequest): string {
  // Tenta obter IP de headers comuns de proxies
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    // x-forwarded-for pode ter multiplos IPs, pega o primeiro
    return forwardedFor.split(",")[0].trim()
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp
  }

  // Fallback para IP do request (em desenvolvimento)
  return "127.0.0.1"
}

/**
 * Endpoint para confirmar ou recusar escala via link do email
 *
 * GET /api/email/confirm/[scheduleId]?action=confirm&token=xxx
 * GET /api/email/confirm/[scheduleId]?action=decline&token=xxx
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limiting por IP
    const clientIp = getClientIp(request)
    if (checkRateLimit(clientIp)) {
      console.warn(`[Email/Confirm] Rate limit excedido para IP: ${clientIp}`)
      return redirectWithMessage(
        "error",
        "Muitas tentativas. Aguarde alguns minutos e tente novamente."
      )
    }

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

    // Valida o token com HMAC e expiracao
    const tokenValidation = validateToken(scheduleId, action, token)
    if (!tokenValidation.valid) {
      return redirectWithMessage("error", tokenValidation.error || "Token invalido ou expirado")
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
    const eventDateStr = formatDateToISO(schedule.event.date)
    const todayStr = formatDateToISO(getTodayLocal())
    if (eventDateStr < todayStr) {
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
