/**
 * Guardas da rota de confirmação de escala por e-mail.
 *
 * Este módulo existe separado de `route.ts` porque um arquivo `route.ts` do App
 * Router só pode exportar os handlers HTTP e a configuração de segmento — nada
 * mais. Mantendo a lógica pura aqui ela fica testável sem subir o Next nem
 * tocar o banco.
 */
import { createHmac, timingSafeEqual } from "crypto"

import { TOKEN_EXPIRATION_MS } from "@/lib/email/send"

export type ConfirmAction = "confirm" | "decline"

// ============================================================
// RATE LIMIT — por scheduleId, contando apenas tentativas com token INVÁLIDO
// ============================================================
//
// Desenho anterior: 5 tentativas por IP por hora, contando qualquer acesso.
// Três defeitos práticos:
//
//   1. Chave errada. Vários voluntários atrás do mesmo NAT (família no mesmo
//      Wi-Fi, CGNAT de operadora móvel, rede da igreja) compartilham IP e se
//      bloqueavam mutuamente. O atacante, por outro lado, troca de IP de graça
//      — então a chave punia exatamente quem não era o alvo da defesa.
//   2. Contava sucesso. Scanners de link de antivírus/provedor de e-mail e
//      recliques do próprio voluntário queimavam o orçamento antes do clique
//      real, transformando a proteção em falha de entrega.
//   3. Estado em memória. Com restart de container ou múltiplas réplicas o
//      contador é, na melhor das hipóteses, aproximado.
//
// Desenho atual: a chave é o `scheduleId` — o alvo real de uma força bruta —
// e só tentativa com token inválido consome orçamento. Consequências:
//
//   - Rede compartilhada deixa de ser penalizada: cada voluntário tem o seu
//     próprio scheduleId, e o caminho feliz nunca incrementa nada.
//   - Não existe lockout do voluntário legítimo. O bloqueio é aplicado
//     DEPOIS da validação do token e só vale para tentativas inválidas; quem
//     chega com token válido passa mesmo com o contador estourado. Como o
//     atacante, por definição, só possui tokens inválidos, ele é barrado e o
//     dono da escala não é — o inverso do que acontecia com a chave por IP.
//   - A defesa primária continua sendo a entropia do token: HMAC-SHA256
//     truncado em 32 caracteres base64url (~192 bits). O teto de validade é
//     `TOKEN_EXPIRATION_MS` (ver `src/lib/email/send.ts`), mas a barreira real
//     é a data do evento: `resolveRequest` recusa escala de evento que já
//     passou. O rate limit é defesa em profundidade e sinal de alerta em log,
//     não a tranca principal.
//   - O `Map` em memória continua sendo best-effort e some no restart. Isso é
//     aceitável justamente porque não é a tranca principal; se um dia houver
//     Redis no projeto, trocar a implementação deste módulo basta — a rota não
//     conhece o armazenamento.

const FAILED_ATTEMPTS_LIMIT = 10
const FAILED_ATTEMPTS_WINDOW_MS = 15 * 60 * 1000 // 15 minutos
const MAX_TRACKED_SCHEDULES = 10_000

type FailureEntry = { count: number; windowStart: number }

const failuresBySchedule = new Map<string, FailureEntry>()

function pruneExpired(now: number): void {
  for (const [key, entry] of failuresBySchedule.entries()) {
    if (now - entry.windowStart > FAILED_ATTEMPTS_WINDOW_MS) {
      failuresBySchedule.delete(key)
    }
  }
}

/**
 * Registra uma tentativa com token inválido para a escala e devolve `true` se,
 * a partir de agora, novas tentativas inválidas devem ser recusadas.
 */
export function registerInvalidAttempt(
  scheduleId: string,
  now: number = Date.now()
): boolean {
  if (failuresBySchedule.size > MAX_TRACKED_SCHEDULES) {
    pruneExpired(now)
  }

  const entry = failuresBySchedule.get(scheduleId)

  if (!entry || now - entry.windowStart > FAILED_ATTEMPTS_WINDOW_MS) {
    failuresBySchedule.set(scheduleId, { count: 1, windowStart: now })
    return 1 > FAILED_ATTEMPTS_LIMIT
  }

  entry.count += 1
  return entry.count > FAILED_ATTEMPTS_LIMIT
}

/**
 * Consulta (sem incrementar) se a escala está em janela de bloqueio.
 * Só deve ser usada para decidir a mensagem de erro — nunca para barrar um
 * token válido.
 */
export function isThrottled(
  scheduleId: string,
  now: number = Date.now()
): boolean {
  const entry = failuresBySchedule.get(scheduleId)
  if (!entry) return false
  if (now - entry.windowStart > FAILED_ATTEMPTS_WINDOW_MS) return false
  return entry.count > FAILED_ATTEMPTS_LIMIT
}

/** Apenas para testes: zera o estado do rate limit. */
export function resetRateLimitState(): void {
  failuresBySchedule.clear()
}

export const rateLimitConfig = {
  limit: FAILED_ATTEMPTS_LIMIT,
  windowMs: FAILED_ATTEMPTS_WINDOW_MS,
} as const

// ============================================================
// VALIDAÇÃO DE TOKEN
// ============================================================

export type TokenValidation = { valid: boolean; error?: string }

/**
 * Valida o token de confirmação (HMAC + expiração).
 * Token: `<timestamp_base64url>.<hmac_truncado_32>` — ver `generateConfirmToken`.
 */
export function validateToken(
  scheduleId: string,
  action: ConfirmAction,
  token: string,
  now: number = Date.now()
): TokenValidation {
  const secret = process.env.NEXTAUTH_SECRET || process.env.EMAIL_TOKEN_SECRET
  if (!secret) {
    return { valid: false, error: "Configuração inválida do servidor" }
  }

  const parts = token.split(".")
  if (parts.length !== 2) {
    return { valid: false, error: "Formato de token invalido" }
  }

  const [timestampBase64, providedHmac] = parts

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

  if (now - timestamp > TOKEN_EXPIRATION_MS) {
    return {
      valid: false,
      error:
        "Este link de confirmacao expirou. Procure o lembrete mais recente no seu e-mail ou fale com a lideranca.",
    }
  }

  // Token do futuro (tolerância de 5 minutos para relógios dessincronizados)
  if (timestamp > now + 5 * 60 * 1000) {
    return { valid: false, error: "Token invalido" }
  }

  const data = `${scheduleId}:${action}:${timestamp}`
  const expectedHmac = createHmac("sha256", secret)
    .update(data)
    .digest("base64url")
    .substring(0, 32)

  if (!constantTimeEquals(providedHmac, expectedHmac)) {
    return { valid: false, error: "Token invalido" }
  }

  return { valid: true }
}

/**
 * Comparação de tempo constante. A versão anterior percorria a string com `!==`
 * caractere a caractere; `timingSafeEqual` faz o mesmo trabalho sem depender de
 * o motor JS não otimizar o laço.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8")
  const bufB = Buffer.from(b, "utf8")
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// ============================================================
// PII EM LOG
// ============================================================

// `redactPII` vive em `@/lib/log-redact` (usado tambem pelo cliente de e-mail).
// Reexportado aqui para nao mudar os imports/testes existentes desta rota.
export { redactPII } from "@/lib/log-redact"

// ============================================================
// PREFETCH / SCANNER
// ============================================================

/**
 * Sinais de que a requisição é automática (prefetch do navegador ou do cliente
 * de e-mail), e não um clique humano.
 */
export function isAutomatedRequest(headers: Headers): boolean {
  const secPurpose = headers.get("sec-purpose") ?? ""
  if (secPurpose.includes("prefetch") || secPurpose.includes("prerender")) {
    return true
  }

  const purpose = (headers.get("purpose") ?? headers.get("x-purpose") ?? "").toLowerCase()
  if (purpose === "prefetch" || purpose === "preview") return true

  const moz = (headers.get("x-moz") ?? "").toLowerCase()
  if (moz === "prefetch") return true

  // Prefetch do próprio App Router (não deveria alcançar esta rota, mas é
  // barato descartar).
  if (headers.get("next-router-prefetch")) return true

  return false
}

/** Escapa texto para interpolação segura em HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
