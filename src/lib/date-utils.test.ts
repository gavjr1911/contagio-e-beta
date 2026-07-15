/**
 * Testes de regressão de fuso horário para date-utils.
 *
 * Rode SEMPRE com TZ=America/Sao_Paulo (ver script "test" no package.json):
 * é sob um fuso ≠ UTC que o bug de -1h/-1dia aparece. Estes testes travam a
 * âncora UTC — se alguém trocar os getters UTC por getters locais, quebram.
 */
import { test } from "node:test"
import assert from "node:assert/strict"

import {
  parseLocalDate,
  parseLocalTime,
  parseLocalDateTime,
  formatDateToISO,
  formatTimeToHHMM,
  getTodayLocal,
  isSameDay,
  isTodayOrFuture,
  toLocalDate,
  formatEventDateLongPtBR,
  transformEventForResponse,
} from "./date-utils"

test("parseLocalTime ancora em UTC (não depende de DST/fuso)", () => {
  assert.equal(parseLocalTime("19:00").toISOString(), "1970-01-01T19:00:00.000Z")
  assert.equal(parseLocalTime("00:30").toISOString(), "1970-01-01T00:30:00.000Z")
  assert.equal(parseLocalTime("23:45").toISOString(), "1970-01-01T23:45:00.000Z")
})

test("hora faz round-trip para TODAS as horas do dia", () => {
  for (let h = 0; h < 24; h++) {
    const hh = String(h).padStart(2, "0")
    for (const mm of ["00", "15", "30", "45"]) {
      const s = `${hh}:${mm}`
      assert.equal(formatTimeToHHMM(parseLocalTime(s)), s, `round-trip falhou em ${s}`)
    }
  }
})

test("parseLocalDate ancora ao meio-dia UTC e faz round-trip", () => {
  assert.equal(parseLocalDate("2026-08-16").toISOString(), "2026-08-16T12:00:00.000Z")
  assert.equal(formatDateToISO(parseLocalDate("2026-08-16")), "2026-08-16")
  assert.equal(formatDateToISO(parseLocalDate("2026-01-01")), "2026-01-01")
  assert.equal(formatDateToISO(parseLocalDate("2026-12-31")), "2026-12-31")
})

test("formatDateToISO lê @db.Date (meia-noite UTC) no dia certo", () => {
  // Valor típico devolvido pelo Prisma para uma coluna @db.Date
  const fromDb = new Date("2026-08-16T00:00:00.000Z")
  assert.equal(formatDateToISO(fromDb), "2026-08-16")
})

test("formatTimeToHHMM lê @db.Time (1970 UTC) no horário certo", () => {
  const fromDb = new Date("1970-01-01T19:00:00.000Z")
  assert.equal(formatTimeToHHMM(fromDb), "19:00")
})

test("parseLocalDateTime ancora em UTC", () => {
  assert.equal(
    parseLocalDateTime("2026-08-16", "19:30").toISOString(),
    "2026-08-16T19:30:00.000Z",
  )
})

test("transformEventForResponse serializa data/hora corretamente", () => {
  const ev = {
    id: "x",
    date: new Date("2026-08-16T00:00:00.000Z"),
    startTime: new Date("1970-01-01T19:00:00.000Z"),
    endTime: new Date("1970-01-01T21:00:00.000Z"),
    recurrenceEndDate: null,
  }
  const out = transformEventForResponse(ev)
  assert.equal(out.date, "2026-08-16")
  assert.equal(out.startTime, "19:00")
  assert.equal(out.endTime, "21:00")
  assert.equal(out.recurrenceEndDate, null)
})

test("getTodayLocal retorna meia-noite UTC (para comparar com @db.Date)", () => {
  const today = getTodayLocal()
  assert.equal(today.getUTCHours(), 0)
  assert.equal(today.getUTCMinutes(), 0)
  assert.equal(today.getUTCSeconds(), 0)
})

test("formatEventDateLongPtBR mostra o dia correto (sem recuar 1 dia)", () => {
  const s = formatEventDateLongPtBR("2026-08-16")
  assert.match(s, /16 de agosto de 2026/)
  assert.match(s, /domingo/) // 16/08/2026 é domingo
  // também aceita @db.Date (meia-noite UTC) sem virar o dia
  assert.match(formatEventDateLongPtBR(new Date("2026-08-16T00:00:00.000Z")), /16 de agosto/)
})

test("isSameDay / isTodayOrFuture por dia-calendário (UTC)", () => {
  assert.ok(isSameDay(parseLocalDate("2026-08-16"), new Date("2026-08-16T00:00:00.000Z")))
  assert.ok(!isSameDay(parseLocalDate("2026-08-16"), parseLocalDate("2026-08-17")))
  assert.ok(isTodayOrFuture(parseLocalDate("2999-01-01")))
  assert.ok(!isTodayOrFuture(parseLocalDate("2000-01-01")))
})

test("toLocalDate: string YYYY-MM-DD vira meio-dia UTC", () => {
  assert.equal(toLocalDate("2026-08-16").toISOString(), "2026-08-16T12:00:00.000Z")
})
