/**
 * Testes de regressão das janelas de data do motor de escalas.
 *
 * Todas as janelas aqui são comparadas com `Event.date`, que é `@db.Date` —
 * um DIA-CALENDÁRIO ancorado à meia-noite UTC, não um instante. Antes elas
 * eram montadas com `setDate()`/`setHours()` LOCAIS, o que amarrava o
 * resultado ao TZ do processo (produção roda com TZ=America/Sao_Paulo).
 *
 * O arquivo roda com TZ=America/Sao_Paulo (script "test") e se re-executa num
 * processo filho com TZ=UTC, provando que o resultado não depende do fuso.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"

import {
  getRecentSchedulesWindow,
  getEventDayRange,
  getRecentDaysWindowStart,
  getDistributionDateFilter,
} from "./suggestions"
import {
  getRotationWindow,
  getRecentDaysWindowStart as getRecentDaysWindowStartAuto,
  getDistributionDateFilter as getDistributionDateFilterAuto,
} from "./auto-assign"

/** Como o Postgres entrega uma coluna @db.Date: meia-noite UTC. */
const dbDate = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))

// ------------------------------------------------- janela de 30 dias anteriores

for (const [nome, janela] of [
  ["suggestions.getRecentSchedulesWindow", getRecentSchedulesWindow],
  ["auto-assign.getRotationWindow", getRotationWindow],
] as const) {
  test(`${nome}: [dia do evento - 30, dia do evento) em UTC`, () => {
    const { start, end } = janela(dbDate(2026, 9, 13), 30)
    assert.equal(start.toISOString(), "2026-08-14T00:00:00.000Z")
    assert.equal(end.toISOString(), "2026-09-13T00:00:00.000Z")
    assert.equal(end.getTime() - start.getTime(), 30 * 24 * 60 * 60 * 1000)
  })

  test(`${nome}: atravessa virada de ano e de mês curto`, () => {
    assert.equal(
      janela(dbDate(2027, 1, 3), 30).start.toISOString(),
      "2026-12-04T00:00:00.000Z"
    )
    assert.equal(
      janela(dbDate(2026, 3, 5), 30).start.toISOString(),
      "2026-02-03T00:00:00.000Z"
    )
  })

  test(`${nome}: normaliza âncora de meio-dia UTC (parseLocalDate) para o dia certo`, () => {
    // Se a data chegar ancorada em 12:00Z, a janela ainda é dia-calendário.
    const { start, end } = janela(new Date(Date.UTC(2026, 8, 13, 12, 0, 0)), 30)
    assert.equal(start.toISOString(), "2026-08-14T00:00:00.000Z")
    assert.equal(end.toISOString(), "2026-09-13T00:00:00.000Z")
  })

  test(`${nome}: o próprio dia do evento fica fora (fim exclusivo)`, () => {
    const eventDate = dbDate(2026, 9, 13)
    const { start, end } = janela(eventDate, 30)
    // gte start / lt end
    assert.ok(eventDate.getTime() >= start.getTime())
    assert.ok(!(eventDate.getTime() < end.getTime()))
    // o dia limite (evento - 30) ENTRA na janela
    assert.ok(dbDate(2026, 8, 14).getTime() >= start.getTime())
    // um dia antes disso, não
    assert.ok(!(dbDate(2026, 8, 13).getTime() >= start.getTime()))
  })
}

// ------------------------------------------------- janela do dia do evento

test("getEventDayRange cobre exatamente o dia-calendário do evento em UTC", () => {
  const { dateStart, dateEnd } = getEventDayRange(dbDate(2026, 9, 13))
  assert.equal(dateStart.toISOString(), "2026-09-13T00:00:00.000Z")
  assert.equal(dateEnd.toISOString(), "2026-09-13T23:59:59.999Z")
})

test("getEventDayRange NÃO deixa vazar o dia vizinho", () => {
  // Este era o risco do `setHours(0,0,0,0)/setHours(23,59,59,999)` local:
  // em fusos a leste de UTC a janela escorregava e pegava dois dias.
  const { dateStart, dateEnd } = getEventDayRange(dbDate(2026, 9, 13))
  const noIntervalo = (d: Date) =>
    d.getTime() >= dateStart.getTime() && d.getTime() <= dateEnd.getTime()

  assert.ok(noIntervalo(dbDate(2026, 9, 13)), "o dia do evento tem que entrar")
  assert.ok(!noIntervalo(dbDate(2026, 9, 12)), "dia anterior não pode entrar")
  assert.ok(!noIntervalo(dbDate(2026, 9, 14)), "dia seguinte não pode entrar")
})

test("getEventDayRange também funciona com âncora de meio-dia UTC", () => {
  const { dateStart, dateEnd } = getEventDayRange(
    new Date(Date.UTC(2026, 8, 13, 12, 0, 0))
  )
  assert.equal(dateStart.toISOString(), "2026-09-13T00:00:00.000Z")
  assert.equal(dateEnd.toISOString(), "2026-09-13T23:59:59.999Z")
  assert.ok(dateEnd.getTime() < dbDate(2026, 9, 14).getTime())
})

// ------------------------------------------------- janela "últimos N dias"

for (const [nome, inicio] of [
  ["suggestions.getRecentDaysWindowStart", getRecentDaysWindowStart],
  ["auto-assign.getRecentDaysWindowStart", getRecentDaysWindowStartAuto],
] as const) {
  test(`${nome}: janela de N dias-calendário terminando hoje`, () => {
    const hoje = dbDate(2026, 9, 13)
    assert.equal(inicio(30, hoje).toISOString(), "2026-08-15T00:00:00.000Z")
    assert.equal(inicio(7, hoje).toISOString(), "2026-09-07T00:00:00.000Z")
    assert.equal(inicio(1, hoje).toISOString(), "2026-09-13T00:00:00.000Z")
  })

  test(`${nome}: hoje sempre entra na janela`, () => {
    const hoje = dbDate(2026, 9, 13)
    for (const days of [1, 7, 30, 90, 365]) {
      assert.ok(
        hoje.getTime() >= inicio(days, hoje).getTime(),
        `hoje caiu fora da janela de ${days} dias`
      )
    }
  })

  test(`${nome}: sempre meia-noite UTC (comparável com @db.Date)`, () => {
    const r = inicio(30, dbDate(2026, 3, 1))
    assert.equal(r.getUTCHours(), 0)
    assert.equal(r.getUTCMinutes(), 0)
    assert.equal(r.getUTCSeconds(), 0)
    assert.equal(r.getUTCMilliseconds(), 0)
    assert.equal(r.toISOString(), "2026-01-31T00:00:00.000Z")
  })
}

test("getRecentDaysWindowStart sem `today` usa o dia-calendário de São Paulo", () => {
  // Sem mock de relógio: só exigimos que seja meia-noite UTC e que o dia de
  // hoje em SP esteja dentro da janela — invariante que vale em qualquer TZ.
  const start = getRecentDaysWindowStart(30)
  assert.equal(start.getUTCHours(), 0)
  assert.equal(start.getUTCMilliseconds(), 0)

  const hojeSP = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
  const hoje = new Date(`${hojeSP}T00:00:00.000Z`)

  assert.ok(hoje.getTime() >= start.getTime())
  assert.equal(hoje.getTime() - start.getTime(), 29 * 24 * 60 * 60 * 1000)
})

// ------------------------------ janela simetrica (passado E futuro fechados)

for (const [nome, filtro] of [
  ["suggestions.getDistributionDateFilter", getDistributionDateFilter],
  ["auto-assign.getDistributionDateFilter", getDistributionDateFilterAuto],
] as const) {
  const hoje = dbDate(2026, 9, 13)
  const dentro = (d: Date, f: { gte: Date; lte: Date }) =>
    d.getTime() >= f.gte.getTime() && d.getTime() <= f.lte.getTime()

  test(`${nome}: 30/30 — limites exatos em UTC`, () => {
    const f = filtro(30, 30, hoje)
    assert.equal(f.gte.toISOString(), "2026-08-15T00:00:00.000Z")
    assert.equal(f.lte.toISOString(), "2026-10-13T23:59:59.999Z")
  })

  test(`${nome}: as duas pontas da janela`, () => {
    const f = filtro(30, 30, hoje)
    assert.ok(dentro(hoje, f), "evento de hoje tem que entrar")
    assert.ok(dentro(dbDate(2026, 8, 15), f), "29 dias atras tem que entrar")
    assert.ok(!dentro(dbDate(2026, 8, 13), f), "31 dias atras tem que ficar fora")
    assert.ok(dentro(dbDate(2026, 10, 13), f), "30 dias a frente tem que entrar")
    assert.ok(
      !dentro(dbDate(2026, 10, 14), f),
      "31 dias a frente tem que ficar fora"
    )
  })

  test(`${nome}: horizonte futuro e parametrizavel e cai em `+"`days`"+` por padrao`, () => {
    const simetrico = filtro(30, undefined, hoje)
    assert.equal(simetrico.lte.toISOString(), "2026-10-13T23:59:59.999Z")

    const soPassado = filtro(30, 0, hoje)
    assert.equal(soPassado.lte.toISOString(), "2026-09-13T23:59:59.999Z")
    assert.ok(dentro(hoje, soPassado), "hoje entra mesmo com aheadDays=0")
    assert.ok(
      !dentro(dbDate(2026, 9, 14), soPassado),
      "amanha fica fora com aheadDays=0"
    )

    const longo = filtro(7, 90, hoje)
    assert.equal(longo.gte.toISOString(), "2026-09-07T00:00:00.000Z")
    assert.equal(longo.lte.toISOString(), "2026-12-12T23:59:59.999Z")
  })

  test(`${nome}: UM unico objeto com gte e lte (nenhum sobrescreve o outro)`, () => {
    const f = filtro(30, 30, hoje)
    assert.deepEqual(Object.keys(f).sort(), ["gte", "lte"])
    assert.ok(f.gte instanceof Date && f.lte instanceof Date)
    assert.ok(f.gte.getTime() < f.lte.getTime())
  })

  test(`${nome}: atravessa virada de ano nas duas pontas`, () => {
    const f = filtro(30, 30, dbDate(2026, 12, 20))
    assert.equal(f.gte.toISOString(), "2026-11-21T00:00:00.000Z")
    assert.equal(f.lte.toISOString(), "2027-01-19T23:59:59.999Z")
  })
}

// Re-executa este mesmo arquivo com TZ=UTC. Se algum getter local voltar,
// os testes acima passam sob America/Sao_Paulo e quebram aqui (ou vice-versa).
if (!process.env.SCHEDULING_DATE_TEST_TZ_CHILD) {
  test("todos os testes deste arquivo também passam sob TZ=UTC", () => {
    const selfPath = path.resolve(
      process.cwd(),
      "src/lib/scheduling/date-windows.test.ts"
    )
    assert.ok(existsSync(selfPath), `caminho do proprio teste nao encontrado: ${selfPath}`)

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "--test", selfPath],
      {
        env: { ...process.env, TZ: "UTC", SCHEDULING_DATE_TEST_TZ_CHILD: "1" },
        encoding: "utf8",
        cwd: process.cwd(),
      }
    )
    assert.equal(
      result.status,
      0,
      `execução sob TZ=UTC falhou:\n${result.stdout}\n${result.stderr}`
    )
  })
}
