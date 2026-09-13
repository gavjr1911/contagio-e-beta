/**
 * Testes de regressão dos lembretes de escala.
 *
 * Três bugs reais estão travados aqui:
 * 1. eventUrl usava o scheduleId — todo "Ver Detalhes do Evento" caía em
 *    "evento não encontrado".
 * 2. A janela de datas usava getters/setters LOCAIS; só acertava porque o cron
 *    roda ~12:00Z. Entre 00:00 e 03:00Z o lote inteiro escorregava um dia.
 * 3. Quem servia em 2 ministérios no mesmo evento recebia 2 e-mails idênticos.
 *
 * O arquivo roda com TZ=America/Sao_Paulo (script "test") e se re-executa num
 * processo filho com TZ=UTC, provando que o resultado não depende do fuso do
 * processo.
 */
import { test, mock } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"

import {
  getReminderDayRange,
  groupSchedulesByUserAndEvent,
  generateActionUrls,
  buildReminderLogKey,
  buildReminderSubject,
  claimReminderSlots,
} from "./send"
import { ScheduleReminderEmail } from "./templates/schedule-reminder"
import { render } from "@react-email/components"

// generateActionUrls assina o token com o segredo do ambiente.
process.env.NEXTAUTH_SECRET ||= "segredo-de-teste"

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d))

// ---------------------------------------------------------------- datas

test("getReminderDayRange devolve a janela [dia, dia+1) em UTC", () => {
  const today = utc(2026, 9, 12)

  for (const [daysAhead, esperado] of [
    [1, "2026-09-13"],
    [3, "2026-09-15"],
    [7, "2026-09-19"],
  ] as const) {
    const { targetDate, nextDay } = getReminderDayRange(daysAhead, today)
    assert.equal(targetDate.toISOString(), `${esperado}T00:00:00.000Z`)
    assert.equal(nextDay.getTime() - targetDate.getTime(), 24 * 60 * 60 * 1000)
  }
})

test("getReminderDayRange atravessa fim de mês e de ano", () => {
  assert.equal(
    getReminderDayRange(7, utc(2026, 12, 28)).targetDate.toISOString(),
    "2027-01-04T00:00:00.000Z"
  )
  assert.equal(
    getReminderDayRange(3, utc(2026, 2, 26)).targetDate.toISOString(),
    "2026-03-01T00:00:00.000Z"
  )
})

test("a janela NÃO depende da hora de execução (00:00–23:59 UTC)", () => {
  // Em São Paulo (UTC-3), 2026-09-12T01:30Z ainda é dia 11.
  // A versão antiga (setDate/setHours locais) devolvia dias diferentes
  // conforme a hora; a nova tem que devolver sempre o dia-calendário de SP.
  const casos = [
    // instante UTC            dia-calendário em São Paulo
    ["2026-09-12T00:10:00Z", "2026-09-11"],
    ["2026-09-12T02:59:00Z", "2026-09-11"],
    ["2026-09-12T03:00:00Z", "2026-09-12"],
    ["2026-09-12T12:05:00Z", "2026-09-12"],
    ["2026-09-12T23:45:00Z", "2026-09-12"],
  ] as const

  for (const [agora, diaSP] of casos) {
    mock.timers.enable({ apis: ["Date"], now: new Date(agora) })
    try {
      const base = new Date(`${diaSP}T00:00:00.000Z`)
      const esperado = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000)
      // sem passar `today`: usa getTodayLocal() internamente
      assert.equal(
        getReminderDayRange(7).targetDate.toISOString(),
        esperado.toISOString(),
        `janela errada para ${agora}`
      )
    } finally {
      mock.timers.reset()
    }
  }
})

// Re-executa este mesmo arquivo com TZ=UTC. Se algum getter local voltar,
// os testes acima passam sob America/Sao_Paulo e quebram aqui (ou vice-versa).
if (!process.env.REMINDER_TEST_TZ_CHILD) {
  test("todos os testes deste arquivo também passam sob TZ=UTC", () => {
    // tsx carrega .ts como CJS: import.meta.filename nao existe aqui.
    const selfPath = path.resolve(process.cwd(), "src/lib/email/send.test.ts")
    assert.ok(existsSync(selfPath), `caminho do proprio teste nao encontrado: ${selfPath}`)

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "--test", selfPath],
      {
        env: { ...process.env, TZ: "UTC", REMINDER_TEST_TZ_CHILD: "1" },
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

// ------------------------------------------------------------------ URLs

test("eventUrl aponta para o EVENTO; confirm/decline para a ESCALA", () => {
  const { eventUrl, confirmUrl, declineUrl } = generateActionUrls("sch_1", "evt_9")

  assert.match(eventUrl, /\/eventos\/evt_9$/)
  assert.ok(!eventUrl.includes("sch_1"), "eventUrl não pode usar o scheduleId")
  assert.ok(confirmUrl.includes("/api/email/confirm/sch_1?action=confirm"))
  assert.ok(declineUrl.includes("/api/email/confirm/sch_1?action=decline"))
})

// -------------------------------------------------------------- agrupamento

type Schedule = Parameters<typeof groupSchedulesByUserAndEvent>[0][number]

function schedule(over: {
  id: string
  userId: string
  eventId: string
  ministryName: string
  position?: string | null
  email?: string | null
  status?: "PENDING" | "CONFIRMED"
}): Schedule {
  return {
    id: over.id,
    eventId: over.eventId,
    ministryId: `min_${over.ministryName}`,
    userId: over.userId,
    position: over.position ?? null,
    status: over.status ?? "CONFIRMED",
    event: {
      id: over.eventId,
      name: `Culto ${over.eventId}`,
      date: utc(2026, 9, 19),
      startTime: new Date(Date.UTC(1970, 0, 1, 19, 0)),
    },
    ministry: { id: `min_${over.ministryName}`, name: over.ministryName },
    user: {
      id: over.userId,
      name: "Maria",
      email: over.email === undefined ? "maria@exemplo.com" : over.email,
    },
  }
}

test("duas escalas do mesmo usuário no mesmo evento viram UM e-mail", () => {
  const { groups } = groupSchedulesByUserAndEvent(
    [
      schedule({ id: "s1", userId: "u1", eventId: "e1", ministryName: "Louvor", position: "Voz" }),
      schedule({ id: "s2", userId: "u1", eventId: "e1", ministryName: "Diaconia" }),
    ],
    7
  )

  assert.equal(groups.length, 1)
  assert.equal(groups[0].assignments.length, 2)
  // ordem estável (alfabética por ministério)
  assert.deepEqual(
    groups[0].assignments.map((a) => a.ministryName),
    ["Diaconia", "Louvor"]
  )
  assert.deepEqual(
    groups[0].assignments.map((a) => a.scheduleId).sort(),
    ["s1", "s2"]
  )
})

test("eventos diferentes continuam gerando e-mails diferentes", () => {
  const { groups } = groupSchedulesByUserAndEvent(
    [
      schedule({ id: "s1", userId: "u1", eventId: "e1", ministryName: "Louvor" }),
      schedule({ id: "s2", userId: "u1", eventId: "e2", ministryName: "Louvor" }),
    ],
    1
  )

  assert.equal(groups.length, 2)
  assert.deepEqual(groups.map((g) => g.event.id).sort(), ["e1", "e2"])
})

test("usuários diferentes no mesmo evento recebem e-mails separados", () => {
  const { groups } = groupSchedulesByUserAndEvent(
    [
      schedule({ id: "s1", userId: "u1", eventId: "e1", ministryName: "Louvor" }),
      schedule({ id: "s2", userId: "u2", eventId: "e1", ministryName: "Louvor" }),
    ],
    3
  )

  assert.equal(groups.length, 2)
})

test("escala sem e-mail cadastrado é separada, não vira grupo", () => {
  const { groups, withoutEmail } = groupSchedulesByUserAndEvent(
    [
      schedule({ id: "s1", userId: "u1", eventId: "e1", ministryName: "Louvor", email: null }),
      schedule({ id: "s2", userId: "u2", eventId: "e1", ministryName: "Louvor" }),
    ],
    3
  )

  assert.equal(groups.length, 1)
  assert.equal(groups[0].userId, "u2")
  assert.deepEqual(
    withoutEmail.map((s) => s.id),
    ["s1"]
  )
})

// ------------------------------------------------------------------ template

const baseProps = {
  userName: "Maria",
  eventName: "Culto de Domingo",
  eventDate: utc(2026, 9, 19),
  eventTime: "19:00",
  daysUntilEvent: 7,
  eventUrl: "https://exemplo.test/eventos/evt_9",
}

test("template com 1 atribuição mantém o layout Ministério + Sua Função", async () => {
  const html = await render(
    ScheduleReminderEmail({
      ...baseProps,
      assignments: [
        { ministryName: "Louvor", position: "Voz", status: "CONFIRMED" },
      ],
    })
  )

  assert.match(html, /Ministerio/)
  assert.match(html, /Sua Funcao/)
  assert.match(html, /Louvor/)
  assert.match(html, /Voz/)
  assert.match(html, /eventos\/evt_9/)
})

test("template com várias atribuições lista todas em um único e-mail", async () => {
  const html = await render(
    ScheduleReminderEmail({
      ...baseProps,
      assignments: [
        { ministryName: "Diaconia", status: "CONFIRMED" },
        { ministryName: "Louvor", position: "Voz", status: "CONFIRMED" },
      ],
    })
  )

  assert.match(html, /Suas Atribuicoes/)
  assert.match(html, /Diaconia/)
  assert.match(html, /Louvor/)
  assert.match(html, /Voz/)
  // não deve repetir o bloco de atribuição única
  assert.ok(!/Sua Funcao/.test(html))
})

// ------------------------------------------------- status na busca/agrupamento

test("grupo com status misto carrega o status de cada atribuicao", () => {
  const { groups } = groupSchedulesByUserAndEvent(
    [
      schedule({
        id: "s1",
        userId: "u1",
        eventId: "e1",
        ministryName: "Louvor",
        position: "Voz",
        status: "PENDING",
      }),
      schedule({
        id: "s2",
        userId: "u1",
        eventId: "e1",
        ministryName: "Diaconia",
        status: "CONFIRMED",
      }),
    ],
    7
  )

  assert.equal(groups.length, 1, "continua sendo UM e-mail")
  assert.deepEqual(
    groups[0].assignments.map((a) => [a.ministryName, a.status]),
    [
      ["Diaconia", "CONFIRMED"],
      ["Louvor", "PENDING"],
    ]
  )
})

// ------------------------------------------------------------------- assunto

test("assunto pede confirmacao quando ha atribuicao pendente", () => {
  // sem pendencia: lembrete puro (comportamento antigo, preservado)
  assert.equal(buildReminderSubject("Culto", 7, false), "Lembrete: Culto")
  assert.equal(buildReminderSubject("Culto", 3, false), "EM BREVE: Culto")
  assert.equal(buildReminderSubject("Culto", 1, false), "AMANHA: Culto")

  // com pendencia: o assunto diz que precisa responder
  assert.equal(buildReminderSubject("Culto", 7, true), "CONFIRME: Culto")
  assert.equal(buildReminderSubject("Culto", 3, true), "CONFIRME - EM BREVE: Culto")
  assert.equal(buildReminderSubject("Culto", 1, true), "CONFIRME - AMANHA: Culto")
})

// -------------------------------------------------------------- idempotencia

/** Store em memoria com a mesma unique do ScheduleReminderLog. */
function fakeLogStore() {
  const rows = new Set<string>()
  const keyOf = (k: { scheduleId: string; daysBefore: number; eventDate: Date }) =>
    `${k.scheduleId}|${k.daysBefore}|${k.eventDate.toISOString()}`

  return {
    rows,
    create: async (k: { scheduleId: string; daysBefore: number; eventDate: Date }) => {
      const id = keyOf(k)
      if (rows.has(id)) {
        throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
      }
      rows.add(id)
    },
  }
}

test("chave de idempotencia nao inclui status", () => {
  const eventDate = utc(2026, 9, 19)
  // Mesma escala, mesmo marco: a chave e identica antes e depois de confirmar.
  assert.deepEqual(
    buildReminderLogKey("s1", 7, eventDate),
    { scheduleId: "s1", daysBefore: 7, eventDate }
  )
  assert.equal(
    Object.keys(buildReminderLogKey("s1", 7, eventDate)).includes("status"),
    false
  )
})

test("confirmar depois da cobranca NAO re-dispara o mesmo marco, mas o proximo sai", async () => {
  const store = fakeLogStore()
  const eventDate = utc(2026, 9, 19)

  // D-7: pessoa PENDING recebe a cobranca.
  const d7 = await claimReminderSlots(["s1"], 7, eventDate, store.create)
  assert.deepEqual(d7.claimed, ["s1"])
  assert.equal(d7.error, null)

  // A pessoa confirma (status muda) e o cron roda de novo no mesmo dia:
  // nada de novo a reservar -> nenhum e-mail.
  const d7Again = await claimReminderSlots(["s1"], 7, eventDate, store.create)
  assert.deepEqual(d7Again.claimed, [], "D-7 nao pode sair duas vezes")

  // D-3: marco diferente, chave diferente -> lembrete normal.
  const d3 = await claimReminderSlots(["s1"], 3, eventDate, store.create)
  assert.deepEqual(d3.claimed, ["s1"])

  // Outro evento (eventDate diferente) tambem e uma chave nova.
  const outro = await claimReminderSlots(["s1"], 7, utc(2026, 9, 26), store.create)
  assert.deepEqual(outro.claimed, ["s1"])
})

test("escala adicionada depois do primeiro disparo ainda recebe lembrete", async () => {
  const store = fakeLogStore()
  const eventDate = utc(2026, 9, 19)

  await claimReminderSlots(["s1"], 7, eventDate, store.create)

  // s2 = 2o ministerio, escalado depois. Envia UM e-mail com as duas
  // atribuicoes; s1 ja estava reservada, s2 e a novidade.
  const segundo = await claimReminderSlots(["s1", "s2"], 7, eventDate, store.create)
  assert.deepEqual(segundo.claimed, ["s2"])
})

test("erro que nao seja unique interrompe e devolve o que foi reservado", async () => {
  const eventDate = utc(2026, 9, 19)
  const create = async (k: { scheduleId: string }) => {
    if (k.scheduleId === "s2") throw new Error("conexao caiu")
  }

  const { claimed, error } = await claimReminderSlots(
    ["s1", "s2", "s3"],
    7,
    eventDate,
    create
  )

  assert.deepEqual(claimed, ["s1"])
  assert.match(String(error), /conexao caiu/)
})

// ------------------------------------------------- template x status

const pendingUrls = {
  confirmUrl: "https://exemplo.test/api/email/confirm/s1?action=confirm&token=t1",
  declineUrl: "https://exemplo.test/api/email/confirm/s1?action=decline&token=t2",
}

test("PENDING puro: e-mail vira cobranca de confirmacao com os dois botoes", async () => {
  const html = await render(
    ScheduleReminderEmail({
      ...baseProps,
      assignments: [
        {
          ministryName: "Louvor",
          position: "Voz",
          status: "PENDING",
          ...pendingUrls,
        },
      ],
    })
  )

  assert.match(html, /Confirme sua participacao/)
  assert.match(html, /nao respondeu/)
  assert.match(html, /Aguardando sua confirmacao/)
  assert.ok(html.includes(pendingUrls.confirmUrl.replace(/&/g, "&amp;")))
  assert.ok(html.includes(pendingUrls.declineUrl.replace(/&/g, "&amp;")))
  assert.match(html, /Confirmar Presenca/)
  assert.match(html, /Nao Poderei Ir/)
  // o botao do evento continua apontando para o EVENTO
  assert.match(html, /eventos\/evt_9/)
})

test("CONFIRMED puro: continua sendo lembrete, sem botoes de confirmar", async () => {
  const html = await render(
    ScheduleReminderEmail({
      ...baseProps,
      assignments: [
        { ministryName: "Louvor", position: "Voz", status: "CONFIRMED" },
      ],
    })
  )

  assert.match(html, /Lembrete de Escala/)
  assert.match(html, /Presenca confirmada/)
  assert.ok(!/Confirmar Presenca/.test(html), "nao pode pedir confirmacao a quem ja confirmou")
  assert.ok(!/Nao Poderei Ir/.test(html))
  assert.ok(!/action=confirm/.test(html))
})

test("status misto: cada atribuicao mostra o seu status e so a pendente ganha botoes", async () => {
  const html = await render(
    ScheduleReminderEmail({
      ...baseProps,
      assignments: [
        { ministryName: "Diaconia", status: "CONFIRMED" },
        {
          ministryName: "Louvor",
          position: "Voz",
          status: "PENDING",
          ...pendingUrls,
        },
      ],
    })
  )

  // lista unica com o status por atribuicao
  assert.match(html, /Suas Atribuicoes/)
  assert.match(html, /Diaconia[\s\S]*?confirmada/)
  assert.match(html, /Louvor[\s\S]*?aguardando sua confirmacao/)

  // exatamente UM par de botoes (so a atribuicao pendente)
  const confirmLinks = html.match(/action=confirm/g) || []
  const declineLinks = html.match(/action=decline/g) || []
  assert.equal(confirmLinks.length, 1)
  assert.equal(declineLinks.length, 1)

  // com 2+ atribuicoes o botao diz de qual ministerio e
  assert.match(html, /Confirmar Louvor/)
  assert.match(html, /Recusar Louvor/)
  assert.ok(!/Confirmar Diaconia/.test(html))
})

test("duas pendencias: um par de botoes para cada uma", async () => {
  const html = await render(
    ScheduleReminderEmail({
      ...baseProps,
      assignments: [
        {
          ministryName: "Diaconia",
          status: "PENDING",
          confirmUrl: "https://exemplo.test/api/email/confirm/s2?action=confirm&token=a",
          declineUrl: "https://exemplo.test/api/email/confirm/s2?action=decline&token=b",
        },
        {
          ministryName: "Louvor",
          position: "Voz",
          status: "PENDING",
          ...pendingUrls,
        },
      ],
    })
  )

  assert.equal((html.match(/action=confirm/g) || []).length, 2)
  assert.equal((html.match(/action=decline/g) || []).length, 2)
  assert.match(html, /Confirmar Diaconia/)
  assert.match(html, /Confirmar Louvor/)
  // tokens sao por escala: os links tem scheduleIds diferentes
  assert.ok(html.includes("confirm/s1"))
  assert.ok(html.includes("confirm/s2"))
})
