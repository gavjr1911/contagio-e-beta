/**
 * Regressão do bug "Próximos Eventos" da home listando eventos já passados.
 *
 * Duas causas cobertas aqui:
 *  1. `{ ...{date:{gte}}, ...{date:{lte}} }` — a segunda chave `date` sobrescrevia
 *     a primeira e o `gte` sumia, deixando passar TODO o histórico.
 *  2. `startDate` chega ancorado ao meio-dia UTC (parseLocalDate) enquanto
 *     `Event.date` (@db.Date) volta à meia-noite UTC — sem normalizar, o evento
 *     de HOJE ficava de fora.
 *
 * Rode com TZ=America/Sao_Paulo (script "test").
 */
import { test } from "node:test"
import assert from "node:assert/strict"

import { buildEventDateFilter, getUpcomingEventsRange } from "./date-filter"
import { parseLocalDate } from "@/lib/date-utils"

/** Como o Prisma devolve uma coluna @db.Date: meia-noite UTC. */
function dbDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

test("buildEventDateFilter preserva gte E lte no mesmo objeto", () => {
  const filter = buildEventDateFilter(
    parseLocalDate("2026-09-13"),
    parseLocalDate("2026-10-13"),
  )
  assert.ok(filter)
  assert.equal(filter.gte?.toISOString(), "2026-09-13T00:00:00.000Z")
  assert.equal(filter.lte?.toISOString(), "2026-10-13T23:59:59.999Z")
})

test("sem datas, não há filtro de data", () => {
  assert.equal(buildEventDateFilter(undefined, undefined), undefined)
})

test("apenas startDate / apenas endDate", () => {
  assert.deepEqual(Object.keys(buildEventDateFilter(parseLocalDate("2026-09-13"))!), ["gte"])
  assert.deepEqual(
    Object.keys(buildEventDateFilter(undefined, parseLocalDate("2026-09-13"))!),
    ["lte"],
  )
})

test("borda: evento de HOJE entra, de ONTEM não, de AMANHÃ entra", () => {
  const filter = buildEventDateFilter(
    parseLocalDate("2026-09-13"),
    parseLocalDate("2026-10-13"),
  )!
  const dentro = (d: Date) =>
    d.getTime() >= filter.gte!.getTime() && d.getTime() <= filter.lte!.getTime()

  assert.ok(dentro(dbDate("2026-09-13")), "evento de hoje deve contar como próximo")
  assert.ok(!dentro(dbDate("2026-09-12")), "evento de ontem NÃO é próximo")
  assert.ok(dentro(dbDate("2026-09-14")), "evento de amanhã é próximo")
  assert.ok(dentro(dbDate("2026-10-13")), "último dia da janela entra")
  assert.ok(!dentro(dbDate("2026-10-14")), "depois da janela fica de fora")
})

test("regressão: histórico real de produção não aparece na janela de hoje", () => {
  // Snapshot dos eventos de produção em 2026-09-13.
  const producao = [
    "2026-07-19", "2026-08-09", "2026-08-09", "2026-08-16", "2026-08-16",
    "2026-08-23", "2026-08-23", "2026-08-30", "2026-08-30", "2026-09-06",
    "2026-09-06", "2026-09-13", "2026-09-13",
  ].map(dbDate)

  const filter = buildEventDateFilter(
    parseLocalDate("2026-09-13"),
    parseLocalDate("2026-10-13"),
  )!
  const proximos = producao.filter(
    (d) => d.getTime() >= filter.gte!.getTime() && d.getTime() <= filter.lte!.getTime(),
  )

  // Só os dois cultos de 13/09 — antes da correção vinham 10 (o limite da query).
  assert.equal(proximos.length, 2)
})

test("getUpcomingEventsRange devolve hoje..hoje+30 em YYYY-MM-DD", () => {
  const range = getUpcomingEventsRange(30, parseLocalDate("2026-09-13"))
  assert.deepEqual(range, { startDate: "2026-09-13", endDate: "2026-10-13" })
})

test("getUpcomingEventsRange atravessa virada de mês/ano sem pular dia", () => {
  assert.deepEqual(getUpcomingEventsRange(30, parseLocalDate("2026-12-20")), {
    startDate: "2026-12-20",
    endDate: "2027-01-19",
  })
  // 18/10/2026 é véspera do início do horário de verão em muitos anos —
  // a soma é em UTC, então o dia-calendário nunca escorrega.
  assert.deepEqual(getUpcomingEventsRange(1, parseLocalDate("2026-10-17")), {
    startDate: "2026-10-17",
    endDate: "2026-10-18",
  })
})

test("borda 21h–00h BRT: a janela usa o dia de São Paulo, não o dia UTC", (t) => {
  // 13/09/2026 23:30 em São Paulo = 14/09/2026 02:30 UTC.
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-14T02:30:00.000Z") })
  try {
    assert.equal(getUpcomingEventsRange(30).startDate, "2026-09-13")
  } finally {
    t.mock.timers.reset()
  }
})
