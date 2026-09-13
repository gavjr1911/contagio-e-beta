import { describe, it } from "node:test"
import assert from "node:assert/strict"

import {
  REMINDER_STALE_AFTER_MS,
  buildReminderRun,
  evaluateReminderRun,
  parseReminderRun,
} from "./last-run"

describe("parseReminderRun", () => {
  it("retorna null para valor ausente ou invalido", () => {
    assert.equal(parseReminderRun(null), null)
    assert.equal(parseReminderRun(""), null)
    assert.equal(parseReminderRun("nao-json"), null)
    assert.equal(parseReminderRun(JSON.stringify({ sent: 1 })), null)
  })

  it("le o registro salvo", () => {
    const value = JSON.stringify({
      ranAt: "2026-09-10T11:00:00.000Z",
      sent: 5,
      failed: 2,
      errors: ["a@x.com: falhou"],
    })

    assert.deepEqual(parseReminderRun(value), {
      ranAt: "2026-09-10T11:00:00.000Z",
      sent: 5,
      failed: 2,
      error: undefined,
      errors: ["a@x.com: falhou"],
    })
  })
})

describe("evaluateReminderRun", () => {
  const now = new Date("2026-09-12T12:00:00.000Z")

  it("sinaliza quando nunca rodou", () => {
    const status = evaluateReminderRun(null, now)
    assert.equal(status.health, "never")
    assert.equal(status.ageMs, null)
    assert.equal(status.reasons.length, 1)
  })

  it("fica ok com execucao recente e sem falhas", () => {
    const status = evaluateReminderRun(
      { ranAt: "2026-09-12T11:00:00.000Z", sent: 10, failed: 0 },
      now
    )
    assert.equal(status.health, "ok")
    assert.deepEqual(status.reasons, [])
  })

  it("alerta quando a ultima execucao tem mais de 36h", () => {
    const ranAt = new Date(now.getTime() - REMINDER_STALE_AFTER_MS - 60_000)
    const status = evaluateReminderRun(
      { ranAt: ranAt.toISOString(), sent: 3, failed: 0 },
      now
    )
    assert.equal(status.health, "warning")
    assert.match(status.reasons[0], /Ultima execucao/)
  })

  it("nao alerta exatamente no limite de 36h", () => {
    const ranAt = new Date(now.getTime() - REMINDER_STALE_AFTER_MS)
    const status = evaluateReminderRun(
      { ranAt: ranAt.toISOString(), sent: 3, failed: 0 },
      now
    )
    assert.equal(status.health, "ok")
  })

  it("alerta quando houve falhas parciais", () => {
    const status = evaluateReminderRun(
      { ranAt: "2026-09-12T11:00:00.000Z", sent: 8, failed: 2 },
      now
    )
    assert.equal(status.health, "warning")
    assert.match(status.reasons.join(" "), /2 e-mail/)
  })

  it("alerta quando o lote inteiro falhou", () => {
    const status = evaluateReminderRun(
      { ranAt: "2026-09-12T11:00:00.000Z", sent: 0, failed: 0, error: "boom" },
      now
    )
    assert.equal(status.health, "warning")
    assert.match(status.reasons.join(" "), /boom/)
  })

  it("alerta com data invalida", () => {
    const status = evaluateReminderRun({ ranAt: "nao-e-data", sent: 0, failed: 0 }, now)
    assert.equal(status.health, "warning")
    assert.equal(status.ageMs, null)
  })
})

describe("buildReminderRun", () => {
  it("grava timestamp ISO e contadores", () => {
    const record = buildReminderRun({
      sent: 4,
      failed: 1,
      ranAt: new Date("2026-09-12T08:00:00.000Z"),
    })
    assert.equal(record.ranAt, "2026-09-12T08:00:00.000Z")
    assert.equal(record.sent, 4)
    assert.equal(record.failed, 1)
    assert.equal(record.errors, undefined)
  })

  it("trunca a lista de erros em 20 itens", () => {
    const errors = Array.from({ length: 50 }, (_, i) => `erro ${i}`)
    const record = buildReminderRun({ sent: 0, failed: 50, errors })
    assert.equal(record.errors?.length, 20)
  })

  it("inclui o erro geral quando informado", () => {
    const record = buildReminderRun({ sent: 0, failed: 0, error: "falhou tudo" })
    assert.equal(record.error, "falhou tudo")
  })
})
