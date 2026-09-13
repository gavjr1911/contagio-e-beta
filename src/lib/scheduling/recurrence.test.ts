/**
 * Testes de regressão de fuso das datas de eventos recorrentes.
 *
 * Bug real travado aqui: `getNextDate` usava setters/getters LOCAIS
 * (`setDate`, `getDate`, `setMonth`) sobre `Event.date`, que é @db.Date e chega
 * do Prisma à MEIA-NOITE UTC. Em São Paulo (UTC-3) esse instante é o dia
 * ANTERIOR às 21:00, então a recorrência MONTHLY saltava um mês:
 *   31/01 -> 01/03 (em vez de 28/02)   |   31/03 -> 01/05 (em vez de 30/04)
 * Sob TZ=UTC os mesmos casos davam o resultado certo — ou seja, o calendário da
 * igreja dependia do fuso do processo.
 *
 * Roda com TZ=America/Sao_Paulo (script "test") e se re-executa num processo
 * filho com TZ=UTC para provar que o resultado é idêntico nos dois fusos.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"

import { generateRecurringDates } from "./recurrence"
import { formatDateToISO, parseLocalDate } from "@/lib/date-utils"
import type { RecurrencePattern } from "@/generated/prisma/client"

/** `Event.date` como o Prisma devolve para @db.Date: meia-noite UTC. */
const dbDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

/** Datas geradas em "YYYY-MM-DD", como aparecem no calendário. */
function gerar(startIso: string, pattern: RecurrencePattern, endIso: string): string[] {
  return generateRecurringDates(dbDate(startIso), {
    pattern,
    // mesma origem da rota /api/events: parseLocalDate (meio-dia UTC)
    endDate: parseLocalDate(endIso),
  }).map(formatDateToISO)
}

// ------------------------------------------------------------------ WEEKLY

test("WEEKLY: soma 7 dias e não inclui a data do evento-pai", () => {
  assert.deepEqual(gerar("2026-09-06", "WEEKLY", "2026-10-04"), [
    "2026-09-13",
    "2026-09-20",
    "2026-09-27",
    "2026-10-04",
  ])
})

test("WEEKLY atravessa virada de mês e de ano", () => {
  assert.deepEqual(gerar("2026-12-20", "WEEKLY", "2027-01-17"), [
    "2026-12-27",
    "2027-01-03",
    "2027-01-10",
    "2027-01-17",
  ])
  // fevereiro bissexto
  assert.deepEqual(gerar("2024-02-18", "WEEKLY", "2024-03-10"), [
    "2024-02-25",
    "2024-03-03",
    "2024-03-10",
  ])
})

test("WEEKLY preserva o dia da semana em todas as ocorrências", () => {
  const datas = gerar("2026-01-04", "WEEKLY", "2026-12-31") // domingo
  assert.equal(datas.length, 51)
  for (const d of datas) {
    assert.equal(
      new Date(`${d}T00:00:00.000Z`).getUTCDay(),
      0,
      `${d} deveria ser domingo`,
    )
  }
})

// ---------------------------------------------------------------- BIWEEKLY

test("BIWEEKLY: soma 14 dias, incluindo virada de mês/ano", () => {
  assert.deepEqual(gerar("2026-02-11", "BIWEEKLY", "2026-04-08"), [
    "2026-02-25",
    "2026-03-11",
    "2026-03-25",
    "2026-04-08",
  ])
  assert.deepEqual(gerar("2026-12-19", "BIWEEKLY", "2027-01-30"), [
    "2027-01-02",
    "2027-01-16",
    "2027-01-30",
  ])
})

// ----------------------------------------------------------------- MONTHLY

test("MONTHLY: dia do mês estável quando existe em todos os meses", () => {
  assert.deepEqual(gerar("2026-01-15", "MONTHLY", "2026-05-15"), [
    "2026-02-15",
    "2026-03-15",
    "2026-04-15",
    "2026-05-15",
  ])
})

test("MONTHLY faz clamp no fim do mês (31/01 -> 28/02, NÃO 01/03)", () => {
  // Antes da correção, sob TZ=America/Sao_Paulo isto dava
  // ["2026-03-01", "2026-03-29", "2026-04-29"] — fevereiro sumia do calendário.
  assert.deepEqual(gerar("2026-01-31", "MONTHLY", "2026-04-30"), [
    "2026-02-28",
    "2026-03-28",
    "2026-04-28",
  ])
  // Ano bissexto: clamp em 29/02.
  assert.deepEqual(gerar("2024-01-31", "MONTHLY", "2024-03-31"), [
    "2024-02-29",
    "2024-03-29",
  ])
})

test("MONTHLY: 31 em mês de 30 dias vira o dia 30 (antes virava dia 1º do mês seguinte)", () => {
  // Antes: ["2026-05-01", "2026-05-31", "2026-07-01"] sob TZ=America/Sao_Paulo.
  assert.deepEqual(gerar("2026-03-31", "MONTHLY", "2026-06-30"), [
    "2026-04-30",
    "2026-05-30",
    "2026-06-30",
  ])
})

test("MONTHLY: dia 29/30 também clampam em fevereiro", () => {
  assert.deepEqual(gerar("2026-01-30", "MONTHLY", "2026-03-31"), [
    "2026-02-28",
    "2026-03-28",
  ])
  assert.deepEqual(gerar("2026-01-29", "MONTHLY", "2026-03-31"), [
    "2026-02-28",
    "2026-03-28",
  ])
  assert.deepEqual(gerar("2024-01-29", "MONTHLY", "2024-03-31"), [
    "2024-02-29",
    "2024-03-29",
  ])
})

test("MONTHLY atravessa a virada de ano", () => {
  assert.deepEqual(gerar("2026-11-30", "MONTHLY", "2027-02-28"), [
    "2026-12-30",
    "2027-01-30",
    "2027-02-28",
  ])
  assert.deepEqual(gerar("2026-12-31", "MONTHLY", "2027-03-31"), [
    "2027-01-31",
    "2027-02-28",
    "2027-03-28",
  ])
})

test("MONTHLY: dia 1º não recua para o mês anterior", () => {
  // Caso mais sensível ao fuso: em SP, 2026-03-01T00:00Z é 28/02 21:00 local.
  assert.deepEqual(gerar("2026-03-01", "MONTHLY", "2026-06-01"), [
    "2026-04-01",
    "2026-05-01",
    "2026-06-01",
  ])
})

// ------------------------------------------------------------ limites/bordas

test("endDate é INCLUSIVO mesmo com âncoras de hora diferentes", () => {
  // startDate vem @db.Date (00:00Z) e endDate de parseLocalDate (12:00Z).
  assert.deepEqual(gerar("2026-09-06", "WEEKLY", "2026-09-13"), ["2026-09-13"])
  // endDate um dia antes da primeira ocorrência: série vazia.
  assert.deepEqual(gerar("2026-09-06", "WEEKLY", "2026-09-12"), [])
  // endDate igual ao evento-pai: série vazia (o pai nunca entra).
  assert.deepEqual(gerar("2026-09-06", "WEEKLY", "2026-09-06"), [])
  // endDate anterior ao evento-pai: série vazia.
  assert.deepEqual(gerar("2026-09-06", "WEEKLY", "2026-08-01"), [])
})

test("respeita o teto de 52 ocorrências", () => {
  const datas = gerar("2026-01-01", "WEEKLY", "2030-01-01")
  assert.equal(datas.length, 52)
  assert.equal(datas[0], "2026-01-08")
  assert.equal(datas[51], "2026-12-31")
})

test("padrão desconhecido falha alto (não gera datas silenciosamente)", () => {
  assert.throws(
    () => gerar("2026-01-01", "DAILY" as RecurrencePattern, "2026-02-01"),
    /Unknown recurrence pattern/,
  )
})

test("generateRecurringDates não muta o startDate recebido", () => {
  const start = dbDate("2026-01-31")
  const antes = start.toISOString()
  generateRecurringDates(start, { pattern: "MONTHLY", endDate: parseLocalDate("2026-12-31") })
  assert.equal(start.toISOString(), antes)
})

test("as datas geradas mantêm a âncora de hora do startDate (@db.Date 00:00Z)", () => {
  const datas = generateRecurringDates(dbDate("2026-09-06"), {
    pattern: "WEEKLY",
    endDate: parseLocalDate("2026-09-20"),
  })
  assert.deepEqual(
    datas.map((d) => d.toISOString()),
    ["2026-09-13T00:00:00.000Z", "2026-09-20T00:00:00.000Z"],
  )
})

// Re-executa este mesmo arquivo com TZ=UTC. Se algum getter local voltar,
// os testes acima passam sob America/Sao_Paulo e quebram aqui (ou vice-versa).
if (!process.env.RECURRENCE_TEST_TZ_CHILD) {
  test("todos os testes deste arquivo também passam sob TZ=UTC", () => {
    const selfPath = path.resolve(process.cwd(), "src/lib/scheduling/recurrence.test.ts")
    assert.ok(existsSync(selfPath), `caminho do proprio teste nao encontrado: ${selfPath}`)

    const result = spawnSync(process.execPath, ["--import", "tsx", "--test", selfPath], {
      env: { ...process.env, TZ: "UTC", RECURRENCE_TEST_TZ_CHILD: "1" },
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
