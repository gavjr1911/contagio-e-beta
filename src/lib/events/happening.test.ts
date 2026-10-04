/**
 * Testes da janela "evento acontecendo".
 *
 * O arquivo se re-executa num processo filho com TZ=UTC (mesmo padrão de
 * `src/lib/email/send.test.ts`): a janela não pode depender do fuso do
 * processo, senão abre e fecha na hora errada em produção, que roda com
 * TZ=America/Sao_Paulo.
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"

import {
  getEventWindow,
  isEventHappening,
  selectHappeningEvent,
  WINDOW_BEFORE_MINUTES,
  WINDOW_AFTER_MINUTES,
} from "./happening"

/** Wall-clock de São Paulo ancorado em UTC — a régua usada pelo módulo. */
function at(iso: string): Date {
  return new Date(`${iso}Z`)
}

const cultoManha = {
  date: "2026-10-11",
  startTime: "09:50",
  endTime: "11:30",
  status: "PUBLISHED",
}

const cultoNoite = {
  date: "2026-10-11",
  startTime: "18:50",
  endTime: "20:30",
  status: "PUBLISHED",
}

describe("getEventWindow", () => {
  test("abre 2h antes e fecha 1h depois", () => {
    const w = getEventWindow(cultoManha)!
    assert.equal(w.opensAt.toISOString(), "2026-10-11T07:50:00.000Z")
    assert.equal(w.startsAt.toISOString(), "2026-10-11T09:50:00.000Z")
    assert.equal(w.closesAt.toISOString(), "2026-10-11T12:30:00.000Z")
  })

  test("sem endTime assume 2h de duração", () => {
    const w = getEventWindow({ date: "2026-10-11", startTime: "09:50" })!
    assert.equal(w.closesAt.toISOString(), "2026-10-11T12:50:00.000Z")
  })

  test("evento que atravessa a meia-noite não fecha antes de abrir", () => {
    const w = getEventWindow({
      date: "2026-12-31",
      startTime: "23:00",
      endTime: "00:30",
    })!
    assert.ok(w.closesAt.getTime() > w.startsAt.getTime())
    assert.equal(w.closesAt.toISOString(), "2027-01-01T01:30:00.000Z")
  })

  test("registro malformado devolve null em vez de quebrar o menu", () => {
    assert.equal(getEventWindow({ date: "", startTime: "09:50" }), null)
    assert.equal(getEventWindow({ date: "2026-10-11", startTime: "" }), null)
  })

  test("constantes refletem a regra pedida (2h antes, 1h depois)", () => {
    assert.equal(WINDOW_BEFORE_MINUTES, 120)
    assert.equal(WINDOW_AFTER_MINUTES, 60)
  })
})

describe("isEventHappening", () => {
  test("fora da janela, antes", () => {
    assert.equal(isEventHappening(cultoManha, at("2026-10-11T07:49:59")), false)
  })

  test("exatamente na abertura (2h antes) já conta", () => {
    assert.equal(isEventHappening(cultoManha, at("2026-10-11T07:50:00")), true)
  })

  test("durante o culto", () => {
    assert.equal(isEventHappening(cultoManha, at("2026-10-11T10:15:00")), true)
  })

  test("exatamente no fechamento (1h depois) ainda conta", () => {
    assert.equal(isEventHappening(cultoManha, at("2026-10-11T12:30:00")), true)
  })

  test("fora da janela, depois", () => {
    assert.equal(isEventHappening(cultoManha, at("2026-10-11T12:30:01")), false)
  })

  test("outro dia não conta", () => {
    assert.equal(isEventHappening(cultoManha, at("2026-10-12T10:00:00")), false)
  })

  test("evento CONCLUÍDO não aparece como acontecendo", () => {
    assert.equal(
      isEventHappening({ ...cultoManha, status: "COMPLETED" }, at("2026-10-11T10:15:00")),
      false,
    )
  })
})

describe("selectHappeningEvent", () => {
  test("sem evento na janela devolve null", () => {
    assert.equal(
      selectHappeningEvent([cultoManha, cultoNoite], at("2026-10-11T15:00:00")),
      null,
    )
  })

  test("de manhã escolhe o culto da manhã", () => {
    const e = selectHappeningEvent([cultoManha, cultoNoite], at("2026-10-11T10:15:00"))
    assert.equal(e?.startTime, "09:50")
  })

  test("na sobreposição (manhã encerrando, noite preparando) manda o já iniciado", () => {
    // 12:20 — manhã ainda na janela de encerramento; noite ainda não começou.
    const e = selectHappeningEvent([cultoManha, cultoNoite], at("2026-10-11T12:20:00"))
    assert.equal(e?.startTime, "09:50")
  })

  test("quando o da noite começa, ele assume", () => {
    const e = selectHappeningEvent([cultoManha, cultoNoite], at("2026-10-11T18:55:00"))
    assert.equal(e?.startTime, "18:50")
  })

  test("só na janela de preparação, escolhe o que começa primeiro", () => {
    // 17:00 — só a noite está na janela (abre 16:50).
    const e = selectHappeningEvent([cultoManha, cultoNoite], at("2026-10-11T17:00:00"))
    assert.equal(e?.startTime, "18:50")
  })

  test("lista vazia", () => {
    assert.equal(selectHappeningEvent([], at("2026-10-11T10:00:00")), null)
  })
})

// --- independência de fuso --------------------------------------------------
if (!process.env.__HAPPENING_TZ_CHILD) {
  test("resultado idêntico sob TZ=UTC", async () => {
    const { execFileSync } = await import("node:child_process")
    execFileSync(
      process.execPath,
      ["--import", "tsx", "--test", new URL(import.meta.url).pathname],
      { env: { ...process.env, TZ: "UTC", __HAPPENING_TZ_CHILD: "1" }, stdio: "pipe" },
    )
  })
}

describe("endTime inválido vs virada de meia-noite", () => {
  test("virada plausível (23:00 → 00:30) é aceita", () => {
    const w = getEventWindow({ date: "2026-12-31", startTime: "23:00", endTime: "00:30" })!
    assert.equal(w.closesAt.toISOString(), "2027-01-01T01:30:00.000Z")
  })

  test("digitação invertida (19:00 → 09:00) NÃO vira evento de 14h", () => {
    // Sem o teto, a janela ficaria aberta por 17h com o checklist se
    // materializando sozinho a noite toda.
    const w = getEventWindow({ date: "2026-10-11", startTime: "19:00", endTime: "09:00" })!
    // cai no padrão de 2h: 19:00 + 2h + 1h de folga = 22:00
    assert.equal(w.closesAt.toISOString(), "2026-10-11T22:00:00.000Z")
  })

  test("endTime igual ao startTime não vira evento de 24h", () => {
    const w = getEventWindow({ date: "2026-10-11", startTime: "19:00", endTime: "19:00" })!
    assert.equal(w.closesAt.toISOString(), "2026-10-11T22:00:00.000Z")
  })
})

describe("getNowLocal (a peça que decide 'que horas são' em produção)", () => {
  test("converte instante real para wall-clock de São Paulo", async () => {
    const { getNowLocal } = await import("@/lib/date-utils")
    // 12:50Z = 09:50 em São Paulo (UTC-3)
    assert.equal(
      getNowLocal(new Date("2026-10-11T12:50:00Z")).toISOString(),
      "2026-10-11T09:50:00.000Z",
    )
  })

  test("vira o dia corretamente (03:00Z = meia-noite em SP)", async () => {
    const { getNowLocal } = await import("@/lib/date-utils")
    assert.equal(
      getNowLocal(new Date("2026-10-11T03:00:00Z")).toISOString(),
      "2026-10-11T00:00:00.000Z",
    )
  })
})
