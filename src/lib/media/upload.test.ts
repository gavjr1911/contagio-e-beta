/**
 * Testes da dedução da causa de falha no upload.
 *
 * Por que isso existe: medi no Chrome, contra o bucket real, que um presign
 * expirado devolve `status: 0` e evento `error` — o 403 do R2 nunca chega ao
 * JavaScript, porque a resposta de erro vem sem cabeçalhos CORS e o navegador
 * a esconde. A primeira versão do código discriminava as mensagens por
 * `xhr.status` (403 → "sessão expirou", 400 → "arquivo mudou") e por isso
 * nunca teria mostrado nenhuma delas: tudo cairia no ramo genérico, que
 * culpava o CORS mesmo quando o problema era a rede do usuário.
 */
import { test } from "node:test"
import assert from "node:assert/strict"

import { deduzirFalha, UPLOAD_ERROR_MESSAGES } from "./upload"

const HORA = 60 * 60 * 1000

test("offline vence qualquer outro sinal", () => {
  const [reason] = deduzirFalha({ loaded: 0, online: false })
  assert.equal(reason, "offline")

  // Mesmo com o presign vencido, a causa que o usuário pode resolver é a rede.
  const [reason2] = deduzirFalha({
    loaded: 0,
    online: false,
    presignedAt: 0,
    agora: 2 * HORA,
  })
  assert.equal(reason2, "offline")
})

test("presign vencido é identificado pelo tempo, não pelo status HTTP", () => {
  const [reason, msg] = deduzirFalha({
    loaded: 0,
    online: true,
    presignedAt: 0,
    presignTtlMs: HORA,
    agora: HORA + 1,
  })
  assert.equal(reason, "expired")
  assert.match(msg, /enviar novamente/i)
})

test("dentro da validade, sem nenhum byte enviado, aponta bloqueio de storage", () => {
  // É o sintoma exato do bucket sem CORS: o navegador barra antes de começar.
  const [reason, msg] = deduzirFalha({
    loaded: 0,
    online: true,
    presignedAt: 0,
    presignTtlMs: HORA,
    agora: 1000,
  })
  assert.equal(reason, "blocked")
  assert.match(msg, /administrador/i)
})

test("se já havia progresso, a causa é a conexão ter caído — não CORS", () => {
  // Este é o caso comum em Wi-Fi de igreja. A versão anterior mostrava aqui a
  // mensagem sobre CORS, assustando o operador com algo que não era o problema.
  const [reason, msg] = deduzirFalha({
    loaded: 10 * 1024 * 1024,
    online: true,
    presignedAt: 0,
    presignTtlMs: HORA,
    agora: 60_000,
  })
  assert.equal(reason, "interrupted")
  assert.match(msg, /conexão caiu/i)
  assert.doesNotMatch(msg, /CORS/i)
})

test("sem informação de presign, ainda distingue começou de não começou", () => {
  assert.equal(deduzirFalha({ loaded: 0, online: true })[0], "blocked")
  assert.equal(deduzirFalha({ loaded: 1, online: true })[0], "interrupted")
})

test("toda causa tem mensagem em português, sem jargão de status HTTP", () => {
  for (const [reason, msg] of Object.entries(UPLOAD_ERROR_MESSAGES)) {
    assert.ok(msg.length > 0, `${reason} sem mensagem`)
    assert.doesNotMatch(msg, /\b(4\d\d|5\d\d|status|XHR|null|undefined)\b/, `${reason} com jargão`)
  }
})
