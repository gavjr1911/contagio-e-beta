import { createHash, timingSafeEqual } from "crypto"

/**
 * Autenticacao das rotas de cron.
 *
 * Regras:
 * - O segredo e SEMPRE exigido, em qualquer ambiente (nao ha excecao para
 *   desenvolvimento: uma rota de cron dispara e-mails reais para voluntarios).
 * - Nao existe "confianca no header do provedor" (ex.: `x-vercel-cron`):
 *   o projeto roda no Railway e qualquer cliente pode forjar esse header.
 * - A comparacao usa `timingSafeEqual` sobre o SHA-256 dos valores, de modo
 *   que os buffers tenham sempre o mesmo tamanho (32 bytes). Isso evita tanto
 *   o vazamento do tamanho do segredo quanto a excecao que `timingSafeEqual`
 *   lanca quando os buffers tem tamanhos diferentes.
 */

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest()
}

/** Comparacao de tempo constante entre duas strings de tamanhos quaisquer. */
export function secureEquals(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b))
}

export interface CronAuthHeaders {
  /** Valor do header `x-cron-secret`, se houver. */
  cronSecret?: string | null
  /** Valor do header `authorization`, se houver (`Bearer <segredo>`). */
  authorization?: string | null
}

/**
 * Valida as credenciais de uma chamada de cron.
 *
 * @param headers headers relevantes da requisicao
 * @param secret segredo configurado (CRON_SECRET)
 */
export function isAuthorizedCronRequest(
  headers: CronAuthHeaders,
  secret: string | undefined | null
): boolean {
  if (!secret) return false

  const provided: string[] = []

  if (headers.cronSecret) {
    provided.push(headers.cronSecret)
  }

  const auth = headers.authorization
  if (auth && auth.startsWith("Bearer ")) {
    provided.push(auth.slice("Bearer ".length))
  }

  // Sem `some(...)` com short-circuit "amigavel": percorre todos os candidatos
  // para nao variar o tempo de resposta conforme a posicao do acerto.
  let ok = false
  for (const candidate of provided) {
    if (secureEquals(candidate, secret)) {
      ok = true
    }
  }

  return ok
}
