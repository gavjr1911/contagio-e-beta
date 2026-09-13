/**
 * Testes dos helpers de aritmética mensal / comparação por dia-calendário.
 *
 * Ficam num arquivo separado de `date-utils.test.ts` para não mexer naquele,
 * que é a fonte da verdade do modelo "wall-clock ancorado em UTC".
 *
 * Roda com TZ=America/Sao_Paulo (script "test") e se re-executa num processo
 * filho com TZ=UTC: se alguém trocar `Date.UTC` por setters locais, um dos dois
 * lados quebra.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"

import {
  addMonths,
  getDaysInMonth,
  compareCalendarDays,
  isOnOrBeforeDay,
  formatDateToISO,
  parseLocalDate,
} from "./date-utils"

/** @db.Date como o Prisma devolve: meia-noite UTC. */
const dbDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

test("getDaysInMonth conta em UTC, inclusive fevereiro bissexto", () => {
  assert.equal(getDaysInMonth(2026, 0), 31) // janeiro
  assert.equal(getDaysInMonth(2026, 1), 28) // fevereiro/2026
  assert.equal(getDaysInMonth(2024, 1), 29) // fevereiro/2024 (bissexto)
  assert.equal(getDaysInMonth(2000, 1), 29) // 2000 é bissexto (regra dos 400)
  assert.equal(getDaysInMonth(1900, 1), 28) // 1900 NÃO é bissexto
  assert.equal(getDaysInMonth(2026, 3), 30) // abril
  assert.equal(getDaysInMonth(2026, 11), 31) // dezembro
})

test("addMonths: mês comum, sem borda", () => {
  assert.equal(formatDateToISO(addMonths(dbDate("2026-01-15"), 1)), "2026-02-15")
  assert.equal(formatDateToISO(addMonths(dbDate("2026-01-15"), 6)), "2026-07-15")
  assert.equal(formatDateToISO(addMonths(dbDate("2026-06-01"), 1)), "2026-07-01")
})

test("addMonths faz CLAMP no último dia do mês (não overflow como setMonth)", () => {
  // A decisão de borda do projeto: 31/jan + 1 mês = 28/fev, NUNCA 03/mar.
  assert.equal(formatDateToISO(addMonths(dbDate("2026-01-31"), 1)), "2026-02-28")
  assert.equal(formatDateToISO(addMonths(dbDate("2024-01-31"), 1)), "2024-02-29")
  assert.equal(formatDateToISO(addMonths(dbDate("2026-01-30"), 1)), "2026-02-28")
  assert.equal(formatDateToISO(addMonths(dbDate("2026-01-29"), 1)), "2026-02-28")
  assert.equal(formatDateToISO(addMonths(dbDate("2024-01-29"), 1)), "2024-02-29")
  assert.equal(formatDateToISO(addMonths(dbDate("2026-03-31"), 1)), "2026-04-30")
  assert.equal(formatDateToISO(addMonths(dbDate("2026-05-31"), 1)), "2026-06-30")
  assert.equal(formatDateToISO(addMonths(dbDate("2026-08-31"), 1)), "2026-09-30")
  assert.equal(formatDateToISO(addMonths(dbDate("2026-10-31"), 1)), "2026-11-30")
  // Sem clamp quando o dia existe no destino
  assert.equal(formatDateToISO(addMonths(dbDate("2026-07-31"), 1)), "2026-08-31")
})

test("addMonths atravessa a virada de ano nos dois sentidos", () => {
  assert.equal(formatDateToISO(addMonths(dbDate("2026-12-31"), 1)), "2027-01-31")
  assert.equal(formatDateToISO(addMonths(dbDate("2026-12-15"), 2)), "2027-02-15")
  assert.equal(formatDateToISO(addMonths(dbDate("2026-01-31"), 12)), "2027-01-31")
  assert.equal(formatDateToISO(addMonths(dbDate("2026-01-15"), -1)), "2025-12-15")
  assert.equal(formatDateToISO(addMonths(dbDate("2026-03-31"), -1)), "2026-02-28")
  assert.equal(formatDateToISO(addMonths(dbDate("2026-01-31"), -13)), "2024-12-31")
  assert.equal(formatDateToISO(addMonths(dbDate("2026-01-01"), 0)), "2026-01-01")
})

test("addMonths preserva a âncora de hora do Date original", () => {
  // @db.Date do Prisma: meia-noite UTC
  assert.equal(addMonths(dbDate("2026-01-31"), 1).toISOString(), "2026-02-28T00:00:00.000Z")
  // parseLocalDate: meio-dia UTC
  assert.equal(
    addMonths(parseLocalDate("2026-01-31"), 1).toISOString(),
    "2026-02-28T12:00:00.000Z",
  )
  // milissegundos/segundos sobrevivem
  const comMs = new Date("2026-01-31T23:59:59.999Z")
  assert.equal(addMonths(comMs, 1).toISOString(), "2026-02-28T23:59:59.999Z")
})

test("addMonths NÃO depende do fuso do processo (âncora meia-noite UTC)", () => {
  // Sob TZ=America/Sao_Paulo, 2026-03-31T00:00Z é 30/03 21:00 local.
  // A versão antiga (setMonth local) devolvia 2026-05-01 aqui e 2026-04-30 sob UTC.
  assert.equal(formatDateToISO(addMonths(dbDate("2026-03-31"), 1)), "2026-04-30")
  assert.equal(formatDateToISO(addMonths(dbDate("2026-01-31"), 1)), "2026-02-28")
  // Dia 1º é o caso mais sensível: em SP o dia local é o último do mês anterior.
  assert.equal(formatDateToISO(addMonths(dbDate("2026-03-01"), 1)), "2026-04-01")
  assert.equal(formatDateToISO(addMonths(dbDate("2026-01-01"), 1)), "2026-02-01")
})

test("compareCalendarDays ignora a âncora de hora", () => {
  // Mesmo dia, âncoras diferentes (@db.Date 00:00Z vs parseLocalDate 12:00Z)
  assert.equal(compareCalendarDays(dbDate("2026-08-16"), parseLocalDate("2026-08-16")), 0)
  assert.ok(compareCalendarDays(dbDate("2026-08-15"), parseLocalDate("2026-08-16")) < 0)
  assert.ok(compareCalendarDays(dbDate("2026-08-17"), parseLocalDate("2026-08-16")) > 0)
})

test("isOnOrBeforeDay é inclusivo no dia de término", () => {
  assert.ok(isOnOrBeforeDay(dbDate("2026-08-16"), parseLocalDate("2026-08-16")))
  assert.ok(isOnOrBeforeDay(new Date("2026-08-16T23:59:59.999Z"), parseLocalDate("2026-08-16")))
  assert.ok(isOnOrBeforeDay(dbDate("2026-08-15"), parseLocalDate("2026-08-16")))
  assert.ok(!isOnOrBeforeDay(dbDate("2026-08-17"), parseLocalDate("2026-08-16")))
})

// Re-executa este mesmo arquivo com TZ=UTC.
if (!process.env.DATE_MONTH_TEST_TZ_CHILD) {
  test("todos os testes deste arquivo também passam sob TZ=UTC", () => {
    const selfPath = path.resolve(process.cwd(), "src/lib/date-utils.month.test.ts")
    assert.ok(existsSync(selfPath), `caminho do proprio teste nao encontrado: ${selfPath}`)

    const result = spawnSync(process.execPath, ["--import", "tsx", "--test", selfPath], {
      env: { ...process.env, TZ: "UTC", DATE_MONTH_TEST_TZ_CHILD: "1" },
      encoding: "utf8",
      cwd: process.cwd(),
    })
    assert.equal(
      result.status,
      0,
      `execução sob TZ=UTC falhou:\n${result.stdout}\n${result.stderr}`,
    )
  })
}
