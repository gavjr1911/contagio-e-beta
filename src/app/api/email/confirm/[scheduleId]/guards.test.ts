/**
 * Testes das guardas da rota de confirmação de escala por e-mail.
 *
 * Contexto: esta rota é o que o voluntário abre ao clicar em "Confirmar" /
 * "Recusar" no e-mail. Os três comportamentos travados aqui nasceram de
 * problemas concretos — rate limit por IP penalizando NAT compartilhado,
 * scanners de link agindo no lugar da pessoa, e PII indo para o log do Railway.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { createHmac } from "crypto"

import {
  escapeHtml,
  isAutomatedRequest,
  isThrottled,
  rateLimitConfig,
  redactPII,
  registerInvalidAttempt,
  resetRateLimitState,
  validateToken,
} from "./guards"
import { TOKEN_EXPIRATION_MS } from "@/lib/email/send"

const SECRET = "segredo-de-teste"
process.env.NEXTAUTH_SECRET = SECRET

function tokenValido(
  scheduleId: string,
  action: "confirm" | "decline",
  timestamp = Date.now()
) {
  const timestampBase64 = Buffer.from(timestamp.toString()).toString("base64url")
  const hmac = createHmac("sha256", SECRET)
    .update(`${scheduleId}:${action}:${timestamp}`)
    .digest("base64url")
    .substring(0, 32)
  return `${timestampBase64}.${hmac}`
}

// ------------------------------------------------------------
// Rate limit
// ------------------------------------------------------------

test("rate limit: escalas diferentes não compartilham orçamento", () => {
  resetRateLimitState()

  for (let i = 0; i < rateLimitConfig.limit + 5; i++) {
    registerInvalidAttempt("schedule-a")
  }

  assert.equal(isThrottled("schedule-a"), true)
  // O defeito do desenho por IP era exatamente este: o vizinho de NAT era
  // bloqueado junto. Com a chave por scheduleId isso não acontece.
  assert.equal(isThrottled("schedule-b"), false)
})

test("rate limit: só bloqueia acima do limite configurado", () => {
  resetRateLimitState()

  for (let i = 0; i < rateLimitConfig.limit; i++) {
    assert.equal(registerInvalidAttempt("s1"), false, `tentativa ${i + 1}`)
  }
  assert.equal(isThrottled("s1"), false)

  assert.equal(registerInvalidAttempt("s1"), true)
  assert.equal(isThrottled("s1"), true)
})

test("rate limit: a janela expira e o contador reinicia", () => {
  resetRateLimitState()
  const t0 = 1_000_000

  for (let i = 0; i <= rateLimitConfig.limit; i++) {
    registerInvalidAttempt("s2", t0)
  }
  assert.equal(isThrottled("s2", t0), true)

  const depois = t0 + rateLimitConfig.windowMs + 1
  assert.equal(isThrottled("s2", depois), false)
  assert.equal(registerInvalidAttempt("s2", depois), false)
})

test("rate limit: token válido não consome orçamento (contrato da rota)", () => {
  resetRateLimitState()
  // A rota só chama registerInvalidAttempt quando validateToken falha. Este
  // teste trava o lado observável: sem falhas registradas, nada é bloqueado
  // por mais cliques que a pessoa dê no mesmo link.
  assert.equal(isThrottled("s3"), false)
  const t = tokenValido("s3", "confirm")
  for (let i = 0; i < 50; i++) {
    assert.equal(validateToken("s3", "confirm", t).valid, true)
  }
  assert.equal(isThrottled("s3"), false)
})

// ------------------------------------------------------------
// Token
// ------------------------------------------------------------

test("token: aceita token bem formado e do próprio schedule/ação", () => {
  assert.equal(validateToken("sched-1", "confirm", tokenValido("sched-1", "confirm")).valid, true)
})

test("token: não vale para outra escala nem para a outra ação", () => {
  const t = tokenValido("sched-1", "confirm")
  assert.equal(validateToken("sched-2", "confirm", t).valid, false)
  assert.equal(validateToken("sched-1", "decline", t).valid, false)
})

test("token: rejeita expirado, do futuro e malformado", () => {
  const agora = Date.now()
  // O teto e TOKEN_EXPIRATION_MS (90 dias), nao 24h: o convite sai quando a
  // escala e criada, semanas antes do culto, e os lembretes saem em D-7/D-3/D-1.
  // Com 24h o proprio fluxo normal expirava antes do clique.
  const expirado = tokenValido("s", "confirm", agora - TOKEN_EXPIRATION_MS - 1000)
  assert.equal(validateToken("s", "confirm", expirado, agora).valid, false)

  // Dentro do teto: um link de D-7 aberto dias depois ainda funciona.
  const seteDiasAtras = tokenValido("s", "confirm", agora - 7 * 24 * 60 * 60 * 1000)
  assert.equal(validateToken("s", "confirm", seteDiasAtras, agora).valid, true)

  const futuro = tokenValido("s", "confirm", agora + 60 * 60 * 1000)
  assert.equal(validateToken("s", "confirm", futuro, agora).valid, false)

  assert.equal(validateToken("s", "confirm", "sem-ponto").valid, false)
  assert.equal(validateToken("s", "confirm", "a.b.c").valid, false)
  assert.equal(validateToken("s", "confirm", "bm90LW51bQ.xxxx").valid, false)
})

test("token: HMAC de tamanho diferente não derruba a comparação", () => {
  assert.equal(
    validateToken("s", "confirm", `${Buffer.from(Date.now().toString()).toString("base64url")}.curto`)
      .valid,
    false
  )
})

// ------------------------------------------------------------
// PII em log
// ------------------------------------------------------------

test("redactPII: remove e-mails de mensagens de erro antes do log", () => {
  const erro = new Error("Resend recusou o envio para joao.silva+escala@exemplo.com.br")
  const saida = redactPII(erro)

  assert.ok(!saida.includes("joao.silva"))
  assert.ok(!saida.includes("exemplo.com.br"))
  assert.match(saida, /\[email removido\]/)
  // Mantém o que serve para diagnóstico.
  assert.match(saida, /Error/)
  assert.match(saida, /Resend recusou/)
})

test("redactPII: não vaza objetos inteiros no log", () => {
  const saida = redactPII({ email: "alguem@exemplo.com", nome: "Fulano" })
  assert.ok(!saida.includes("alguem@exemplo.com"))
  assert.ok(!saida.includes("Fulano"))
})

// ------------------------------------------------------------
// Prefetch / automação
// ------------------------------------------------------------

test("isAutomatedRequest: reconhece os sinais de prefetch conhecidos", () => {
  assert.equal(isAutomatedRequest(new Headers({ "sec-purpose": "prefetch;prerender" })), true)
  assert.equal(isAutomatedRequest(new Headers({ purpose: "prefetch" })), true)
  assert.equal(isAutomatedRequest(new Headers({ "x-purpose": "preview" })), true)
  assert.equal(isAutomatedRequest(new Headers({ "x-moz": "prefetch" })), true)
  assert.equal(isAutomatedRequest(new Headers({ "next-router-prefetch": "1" })), true)
})

test("isAutomatedRequest: clique humano normal não é confundido com prefetch", () => {
  const headers = new Headers({
    "user-agent": "Mozilla/5.0",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
  })
  assert.equal(isAutomatedRequest(headers), false)
})

// ------------------------------------------------------------
// HTML
// ------------------------------------------------------------

test("escapeHtml: neutraliza injeção vinda de nome de evento/ministério", () => {
  const saida = escapeHtml(`<img src=x onerror="alert('x')">`)
  assert.ok(!saida.includes("<img"))
  assert.ok(!saida.includes(`"`))
  assert.ok(!saida.includes("'"))
  assert.match(saida, /&lt;img/)
})
