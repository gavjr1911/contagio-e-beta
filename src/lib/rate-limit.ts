/**
 * Rate limiter in-memory (por processo).
 *
 * Suficiente para o deploy atual no Railway, que roda em UMA única instância
 * (ver railway.json / AGENTS.md). Se um dia o serviço escalar para múltiplas
 * réplicas, este store precisa virar compartilhado (ex.: Redis/Upstash), pois
 * cada instância manteria sua própria contagem.
 */

interface Attempt {
  count: number
  firstAttempt: number
}

const store = new Map<string, Attempt>()

// Limite de chaves em memória — acima disso, faz uma limpeza preventiva.
const MAX_KEYS = 10_000

function cleanup(windowMs: number): void {
  const now = Date.now()
  for (const [key, attempt] of store.entries()) {
    if (now - attempt.firstAttempt > windowMs) {
      store.delete(key)
    }
  }
}

/**
 * Registra uma tentativa para a chave e retorna `true` se o limite foi
 * ESTOURADO (ou seja, esta tentativa excede `max` dentro da janela).
 */
export function hit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()

  if (store.size > MAX_KEYS) {
    cleanup(windowMs)
  }

  const attempt = store.get(key)

  if (!attempt || now - attempt.firstAttempt > windowMs) {
    store.set(key, { count: 1, firstAttempt: now })
    return 1 > max
  }

  attempt.count++
  return attempt.count > max
}

/**
 * Verifica (sem contabilizar) se a chave já estourou o limite na janela atual.
 */
export function isBlocked(key: string, max: number, windowMs: number): boolean {
  const attempt = store.get(key)
  if (!attempt) return false

  if (Date.now() - attempt.firstAttempt > windowMs) {
    store.delete(key)
    return false
  }

  return attempt.count > max
}

/**
 * Zera as tentativas de uma chave (ex.: após uma autenticação bem-sucedida).
 */
export function reset(key: string): void {
  store.delete(key)
}
