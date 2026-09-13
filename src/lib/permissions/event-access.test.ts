/**
 * Testes da regra de acesso POR EVENTO: concluir o evento e registrar a
 * presença quando a pessoa está escalada nele.
 *
 * Cenário real que originou a regra (produção): o ministério "Contagie" tem
 * `member.events = "edit"`, e a pessoa escalada (papel global VOLUNTEER)
 * recebia 403 ao clicar em "Concluir" e ao salvar a presença.
 */
import { test } from "node:test"
import assert from "node:assert/strict"

import {
  canCompleteEventWith,
  canCompleteEventNow,
  canConfirmSchedulesForOthersWith,
  canRegisterAttendanceWith,
  canThirdPartyConfirmStatus,
  canThirdPartyUndoConfirmation,
  isCompletionDateReached,
  type EventAssignment,
} from "./event-access"

// Matriz no formato LEGADO (por nível) — é a forma gravada em produção hoje.
const contagieLegacy = {
  leader: { events: "edit", schedules: "edit" },
  member: { events: "edit", schedules: "view" },
}

// Mesma ideia no formato NOVO (por ação).
const contagieActions = {
  leader: { events: { view: true, create: true, edit: true, delete: true } },
  member: { events: { view: true, create: false, edit: true, delete: false } },
}

// Ministério onde membro só enxerga (ex.: "Louvor" em produção).
const louvorLegacy = {
  leader: { events: "edit" },
  member: { events: "view" },
}

function assignment(overrides: Partial<EventAssignment> = {}): EventAssignment {
  return {
    ministryId: "m1",
    status: "CONFIRMED",
    isMinistryLeader: false,
    ministryPermissions: contagieLegacy,
    ...overrides,
  }
}

test("ADMIN conclui qualquer evento, mesmo sem escala", () => {
  assert.equal(canCompleteEventWith("ADMIN", []), true)
})

test("escalado CONFIRMED em ministério com events.edit pode concluir (caso Contagie)", () => {
  assert.equal(canCompleteEventWith("VOLUNTEER", [assignment()]), true)
})

test("aceita a matriz na forma nova (por ação)", () => {
  assert.equal(
    canCompleteEventWith("VOLUNTEER", [
      assignment({ ministryPermissions: contagieActions }),
    ]),
    true
  )
})

test("líder do ministério usa a linha leader da matriz", () => {
  assert.equal(
    canCompleteEventWith("VOLUNTEER", [
      assignment({ ministryPermissions: louvorLegacy, isMinistryLeader: true }),
    ]),
    true
  )
})

test("membro de ministério sem events.edit NÃO conclui", () => {
  assert.equal(
    canCompleteEventWith("VOLUNTEER", [
      assignment({ ministryPermissions: louvorLegacy }),
    ]),
    false
  )
})

test("não escalado no evento NÃO conclui", () => {
  assert.equal(canCompleteEventWith("VOLUNTEER", []), false)
})

test("escala PENDING habilita concluir — quase ninguém confirma (decisão do dono do produto)", () => {
  assert.equal(
    canCompleteEventWith("VOLUNTEER", [assignment({ status: "PENDING" })]),
    true
  )
})

test("escala DECLINED NÃO habilita concluir — recusou, abriu mão do evento", () => {
  assert.equal(
    canCompleteEventWith("VOLUNTEER", [assignment({ status: "DECLINED" })]),
    false
  )
})

test("PENDING sem events.edit continua sem concluir (o status não substitui a matriz)", () => {
  assert.equal(
    canCompleteEventWith("VOLUNTEER", [
      assignment({ status: "PENDING", ministryPermissions: louvorLegacy }),
    ]),
    false
  )
})

test("basta uma escala válida entre várias", () => {
  assert.equal(
    canCompleteEventWith("VOLUNTEER", [
      assignment({ ministryPermissions: louvorLegacy }),
      assignment({ ministryId: "m2" }),
    ]),
    true
  )
})

test("matriz nula cai nos defaults: membro não conclui, líder conclui", () => {
  assert.equal(
    canCompleteEventWith("VOLUNTEER", [
      assignment({ ministryPermissions: null }),
    ]),
    false
  )
  assert.equal(
    canCompleteEventWith("VOLUNTEER", [
      assignment({ ministryPermissions: null, isMinistryLeader: true }),
    ]),
    true
  )
})

test("matriz corrompida nega o acesso (fail-closed)", () => {
  for (const raw of ["lixo", 42, [], { member: "???" }]) {
    assert.equal(
      canCompleteEventWith("VOLUNTEER", [
        assignment({ ministryPermissions: raw }),
      ]),
      false
    )
  }
})

test("presença: papel LEADER global continua permitido sem escala (comportamento legado)", () => {
  assert.equal(canRegisterAttendanceWith("LEADER", []), true)
  assert.equal(canRegisterAttendanceWith("ADMIN", []), true)
})

test("presença: escalado CONFIRMED com events.edit passa a poder salvar", () => {
  assert.equal(canRegisterAttendanceWith("VOLUNTEER", [assignment()]), true)
})

test("presença: VOLUNTEER sem escala continua barrado", () => {
  assert.equal(canRegisterAttendanceWith("VOLUNTEER", []), false)
})


// ---------------------------------------------------------------------------
// Confirmar a escala de OUTRA PESSOA
// ---------------------------------------------------------------------------

test("confirmar por terceiro: ADMIN pode, mesmo sem escala", () => {
  assert.equal(canConfirmSchedulesForOthersWith("ADMIN", []), true)
})

test("confirmar por terceiro: escalado (PENDING) com events.edit pode", () => {
  assert.equal(
    canConfirmSchedulesForOthersWith("VOLUNTEER", [
      assignment({ status: "PENDING" }),
    ]),
    true
  )
})

test("confirmar por terceiro: sem escala no evento NÃO pode", () => {
  assert.equal(canConfirmSchedulesForOthersWith("VOLUNTEER", []), false)
})

test("confirmar por terceiro: escalado sem events.edit NÃO pode", () => {
  assert.equal(
    canConfirmSchedulesForOthersWith("VOLUNTEER", [
      assignment({ ministryPermissions: louvorLegacy }),
    ]),
    false
  )
})

test("confirmar por terceiro: quem recusou a própria escala NÃO pode", () => {
  assert.equal(
    canConfirmSchedulesForOthersWith("VOLUNTEER", [
      assignment({ status: "DECLINED" }),
    ]),
    false
  )
})

test("confirmar por terceiro: LEADER global sem escala NÃO ganha o poder", () => {
  // Diferente da presença, que mantém o acesso legado por papel global.
  assert.equal(canConfirmSchedulesForOthersWith("LEADER", []), false)
})

test("transição: PENDING pode ser confirmada por terceiro", () => {
  assert.equal(canThirdPartyConfirmStatus("PENDING").ok, true)
})

test("transição: CONFIRMED já está confirmada (400)", () => {
  const decision = canThirdPartyConfirmStatus("CONFIRMED")
  assert.equal(decision.ok, false)
  assert.equal(decision.status, 400)
})

test("transição: DECLINED nunca é sobrescrita por terceiro (409)", () => {
  const decision = canThirdPartyConfirmStatus("DECLINED")
  assert.equal(decision.ok, false)
  assert.equal(decision.status, 409)
})

test("desfazer: só vale para confirmação feita por terceiro (confirmedById preenchido)", () => {
  assert.equal(canThirdPartyUndoConfirmation("CONFIRMED", "u-lider").ok, true)
  // Confirmou sozinho (confirmedById nulo) — terceiro não desfaz.
  assert.equal(canThirdPartyUndoConfirmation("CONFIRMED", null).ok, false)
  assert.equal(canThirdPartyUndoConfirmation("PENDING", null).ok, false)
  assert.equal(canThirdPartyUndoConfirmation("DECLINED", "u-lider").ok, false)
})

// ---------------------------------------------------------------------------
// Decisão de "Concluir" devolvida ao cliente (fonte única)
// ---------------------------------------------------------------------------

const HOJE = "2026-09-13"

test("concluir agora: escalado PENDING, evento é hoje → pode", () => {
  assert.equal(
    canCompleteEventNow({
      userRole: "VOLUNTEER",
      assignments: [assignment({ status: "PENDING" })],
      eventStatus: "PUBLISHED",
      eventDayISO: HOJE,
      todayISO: HOJE,
    }),
    true
  )
})

test("concluir agora: evento futuro só para ADMIN", () => {
  const futuro = {
    eventStatus: "PUBLISHED",
    eventDayISO: "2026-10-04",
    todayISO: HOJE,
  }
  assert.equal(
    canCompleteEventNow({
      userRole: "VOLUNTEER",
      assignments: [assignment()],
      ...futuro,
    }),
    false
  )
  assert.equal(
    canCompleteEventNow({ userRole: "ADMIN", assignments: [], ...futuro }),
    true
  )
})

test("concluir agora: evento já concluído não aparece para ninguém", () => {
  assert.equal(
    canCompleteEventNow({
      userRole: "ADMIN",
      assignments: [],
      eventStatus: "COMPLETED",
      eventDayISO: HOJE,
      todayISO: HOJE,
    }),
    false
  )
})

test("regra de data: ADMIN ignora o dia, os demais não", () => {
  assert.equal(isCompletionDateReached("ADMIN", "2026-12-25", HOJE), true)
  assert.equal(isCompletionDateReached("VOLUNTEER", "2026-12-25", HOJE), false)
  assert.equal(isCompletionDateReached("VOLUNTEER", "2026-09-06", HOJE), true)
})
