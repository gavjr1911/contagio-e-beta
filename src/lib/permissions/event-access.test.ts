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
  canEditEventChecklistNow,
  canEditEventChecklistWith,
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

// ---------------------------------------------------------------------------
// CHECKLIST DO EVENTO
//
// Regressão real: em 27/09/2026 as pessoas do Contagie escaladas no culto não
// conseguiram marcar os itens. A regra antiga exigia pertencer a um ministério
// chamado literalmente "Contagie - Cerimonial", que não existe no banco (o real
// é "Contagie"), então negava para todo não-ADMIN. Estes testes usam a matriz
// REAL de produção do Contagie, que concede `checklists` aos membros.
// ---------------------------------------------------------------------------

// Matriz do Contagie como está gravada em produção (checklists liberado a membro).
const contagieComChecklist = {
  leader: {
    events: { view: true, create: true, edit: true, delete: true },
    checklists: { view: true, create: true, edit: true, delete: true },
  },
  member: {
    events: { view: true, create: true, edit: true, delete: true },
    checklists: { view: true, create: true, edit: true, delete: true },
  },
}

// Ministério sem checklist para membro (ex.: "Comunique-se", que tem false explícito).
const semChecklist = {
  leader: { events: { edit: true }, checklists: { edit: false } },
  member: { events: { edit: true }, checklists: { edit: false } },
}

test("checklist: ADMIN sempre pode, mesmo sem escala", () => {
  assert.equal(canEditEventChecklistWith("ADMIN", []), true)
})

test("checklist: voluntária escalada pelo Contagie pode marcar itens (o caso de 27/09)", () => {
  assert.equal(
    canEditEventChecklistWith("VOLUNTEER", [
      assignment({ ministryPermissions: contagieComChecklist }),
    ]),
    true
  )
})

test("checklist: escala PENDING também vale (quase ninguém confirma)", () => {
  assert.equal(
    canEditEventChecklistWith("VOLUNTEER", [
      assignment({ status: "PENDING", ministryPermissions: contagieComChecklist }),
    ]),
    true
  )
})

test("checklist: quem RECUSOU a escala não mexe no checklist", () => {
  assert.equal(
    canEditEventChecklistWith("VOLUNTEER", [
      assignment({ status: "DECLINED", ministryPermissions: contagieComChecklist }),
    ]),
    false
  )
})

test("checklist: não basta events.edit — precisa de checklists.edit", () => {
  // contagieLegacy concede events.edit mas não fala de checklists.
  assert.equal(canEditEventChecklistWith("VOLUNTEER", [assignment()]), false)
})

test("checklist: ministério com checklists.edit=false é negado", () => {
  assert.equal(
    canEditEventChecklistWith("VOLUNTEER", [
      assignment({ ministryPermissions: semChecklist }),
    ]),
    false
  )
})

test("checklist: quem não está escalado no evento não mexe", () => {
  assert.equal(canEditEventChecklistWith("VOLUNTEER", []), false)
})

test("checklist: LEADER global sem escala não ganha acesso", () => {
  assert.equal(canEditEventChecklistWith("LEADER", []), false)
})

test("checklist: matriz nula cai no default, que é none", () => {
  assert.equal(
    canEditEventChecklistWith("VOLUNTEER", [
      assignment({ ministryPermissions: null }),
    ]),
    false
  )
})

test("checklist: matriz corrompida falha fechado", () => {
  for (const lixo of ["lixo", 42, [], { member: "???" }]) {
    assert.equal(
      canEditEventChecklistWith("VOLUNTEER", [
        assignment({ ministryPermissions: lixo }),
      ]),
      false
    )
  }
})

test("checklist: evento CONCLUIDO trava, mesmo para quem tem permissao", () => {
  // Foi o que travou o checklist de 27/09 as 22:28, depois de concluirem o culto.
  assert.equal(
    canEditEventChecklistNow({
      userRole: "VOLUNTEER",
      assignments: [assignment({ ministryPermissions: contagieComChecklist })],
      eventStatus: "COMPLETED",
    }),
    false
  )
})

test("checklist: evento PUBLICADO libera quem tem permissao", () => {
  assert.equal(
    canEditEventChecklistNow({
      userRole: "VOLUNTEER",
      assignments: [assignment({ ministryPermissions: contagieComChecklist })],
      eventStatus: "PUBLISHED",
    }),
    true
  )
})

test("checklist: nem ADMIN mexe em evento concluido (a trava e do estado, nao do papel)", () => {
  assert.equal(
    canEditEventChecklistNow({
      userRole: "ADMIN",
      assignments: [],
      eventStatus: "COMPLETED",
    }),
    false
  )
})
