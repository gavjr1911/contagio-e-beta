/**
 * Testes do modelo de permissões por ação (Fase 0a).
 * Cobre normalização das DUAS formas (legada/nova), casos corrompidos e
 * o achatamento para nível (que preserva o comportamento atual).
 */
import { test } from "node:test"
import assert from "node:assert/strict"

import {
  levelToActions,
  actionsToLevel,
  normalizeActions,
  normalizeMinistryPermissions,
  flattenToLevelMap,
  mergeActions,
  hasAction,
} from "./normalize"

test("levelToActions: legado → ações (permissivo)", () => {
  assert.deepEqual(levelToActions("edit"), { view: true, create: true, edit: true, delete: true })
  assert.deepEqual(levelToActions("view"), { view: true, create: false, edit: false, delete: false })
  assert.deepEqual(levelToActions("none"), { view: false, create: false, edit: false, delete: false })
  assert.deepEqual(levelToActions(undefined), { view: false, create: false, edit: false, delete: false })
})

test("actionsToLevel: achata preservando semântica atual", () => {
  assert.equal(actionsToLevel({ view: true, create: true, edit: false, delete: false }), "edit")
  assert.equal(actionsToLevel({ view: true, create: false, edit: false, delete: false }), "view")
  assert.equal(actionsToLevel({ view: false, create: false, edit: false, delete: false }), "none")
  assert.equal(actionsToLevel(undefined), "none")
  // só delete (sem view) ainda conta como escrita → edit
  assert.equal(actionsToLevel({ view: false, create: false, edit: false, delete: true }), "edit")
})

test("normalizeActions: aceita objeto novo e força view em escrita", () => {
  assert.deepEqual(
    normalizeActions({ view: false, create: true, edit: false, delete: false }),
    { view: true, create: true, edit: false, delete: false },
  )
  // corrompido → tudo false
  assert.deepEqual(normalizeActions(42), { view: false, create: false, edit: false, delete: false })
  assert.deepEqual(normalizeActions(null), { view: false, create: false, edit: false, delete: false })
})

test("normalizeMinistryPermissions: forma LEGADA (nível) → ações", () => {
  const legado = {
    leader: { events: "edit", songs: "view", checklists: "none" },
    member: { events: "view" },
  }
  const out = normalizeMinistryPermissions(legado)
  assert.deepEqual(out.leader.events, { view: true, create: true, edit: true, delete: true })
  assert.deepEqual(out.leader.songs, { view: true, create: false, edit: false, delete: false })
  assert.deepEqual(out.leader.checklists, { view: false, create: false, edit: false, delete: false })
  assert.deepEqual(out.member.events, { view: true, create: false, edit: false, delete: false })
  // feature ausente no legado → tudo false
  assert.deepEqual(out.member.reports, { view: false, create: false, edit: false, delete: false })
})

test("normalizeMinistryPermissions: forma NOVA (ações) → passthrough", () => {
  const nova = {
    leader: { events: { view: true, create: true, edit: false, delete: false } },
    member: {},
  }
  const out = normalizeMinistryPermissions(nova)
  assert.deepEqual(out.leader.events, { view: true, create: true, edit: false, delete: false })
  assert.deepEqual(out.member.events, { view: false, create: false, edit: false, delete: false })
})

test("normalizeMinistryPermissions: null / corrompido → mapas vazios", () => {
  const out = normalizeMinistryPermissions(null)
  assert.deepEqual(out.leader.events, { view: false, create: false, edit: false, delete: false })
  assert.deepEqual(out.member.events, { view: false, create: false, edit: false, delete: false })
})

test("flattenToLevelMap: round-trip legado preserva níveis", () => {
  const legado = { leader: { events: "edit", songs: "view" }, member: {} }
  const actions = normalizeMinistryPermissions(legado)
  const levels = flattenToLevelMap(actions.leader)
  assert.equal(levels.events, "edit")
  assert.equal(levels.songs, "view")
  assert.equal(levels.reports, "none")
})

test("mergeActions: OR (merge multi-ministério)", () => {
  const a = { view: true, create: false, edit: true, delete: false }
  const b = { view: true, create: true, edit: false, delete: false }
  assert.deepEqual(mergeActions(a, b), { view: true, create: true, edit: true, delete: false })
})

test("hasAction", () => {
  const map = normalizeMinistryPermissions({ leader: { events: "edit" }, member: {} }).leader
  assert.equal(hasAction(map, "events", "create"), true)
  assert.equal(hasAction(map, "events", "delete"), true)
  assert.equal(hasAction(map, "reports", "view"), false)
})
