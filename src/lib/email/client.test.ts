/**
 * Testes de regressão do cliente de email.
 *
 * Contexto: em Ago/2026 um convite foi reportado como "não enviado" enquanto o
 * log dizia sucesso. A raiz era dupla — `sendEmail` nunca lança (devolve
 * `{ success: false }`) e a rota de convite descartava esse retorno. Estes
 * testes travam o lado do cliente: sem chave configurada o envio precisa
 * FALHAR de forma explícita e observável, nunca "passar" silenciosamente.
 */
import { test } from "node:test"
import assert from "node:assert/strict"

import { sendEmail } from "./client"

const BASE = { to: "alguem@exemplo.com", subject: "Assunto", html: "<p>oi</p>" }

async function semApiKey<T>(fn: () => Promise<T>): Promise<T> {
  const anterior = process.env.RESEND_API_KEY
  delete process.env.RESEND_API_KEY
  try {
    return await fn()
  } finally {
    if (anterior === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = anterior
  }
}

test("sem RESEND_API_KEY, sendEmail falha explicitamente em vez de simular", async () => {
  const result = await semApiKey(() => sendEmail(BASE))

  assert.equal(result.success, false)
  assert.match(result.error ?? "", /RESEND_API_KEY/)
  // Não deve inventar um id de envio quando nada foi enviado.
  assert.equal(result.data, undefined)
})

test("sendEmail nunca lança — o chamador precisa checar .success", async () => {
  // Este é o contrato que fez a falha passar despercebida: como não há exceção,
  // um try/catch em volta da chamada não detecta nada. Se algum dia sendEmail
  // passar a lançar, este teste quebra e os chamadores devem ser revisados.
  await assert.doesNotReject(() => semApiKey(() => sendEmail(BASE)))
})
