/**
 * Testes da regra de criacao de escala.
 *
 * Por que isto existe: a rota individual e a /bulk implementavam a mesma regra
 * separadamente e divergiram — a bulk checava o ministerio do LEADER, a
 * individual nao. A brecha virou escalonamento de privilegio quando
 * `event-access.ts` passou a conceder permissoes de evento a quem esta
 * escalado: um LEADER se auto-escalava em qualquer evento pela rota individual
 * e ganhava o direito de concluir aquele evento e de confirmar escalas alheias.
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"

import {
  canCreateSchedules,
  forbiddenMinistriesForCreator,
  forbiddenMinistriesMessage,
} from "./schedule-create"

describe("canCreateSchedules", () => {
  test("apenas ADMIN e LEADER criam escala", () => {
    assert.equal(canCreateSchedules("ADMIN"), true)
    assert.equal(canCreateSchedules("LEADER"), true)
    assert.equal(canCreateSchedules("VOLUNTEER"), false)
    assert.equal(canCreateSchedules(null), false)
    assert.equal(canCreateSchedules(undefined), false)
    assert.equal(canCreateSchedules(""), false)
  })
})

describe("forbiddenMinistriesForCreator", () => {
  test("ADMIN escala em qualquer ministerio, mesmo sem liderar nenhum", () => {
    assert.deepEqual(forbiddenMinistriesForCreator("ADMIN", ["m1", "m2"], []), [])
  })

  test("LEADER escala nos ministerios que lidera", () => {
    assert.deepEqual(
      forbiddenMinistriesForCreator("LEADER", ["m1"], ["m1", "m2"]),
      []
    )
  })

  test("LEADER NAO escala em ministerio alheio", () => {
    assert.deepEqual(
      forbiddenMinistriesForCreator("LEADER", ["m9"], ["m1"]),
      ["m9"]
    )
  })

  test("LEADER que nao lidera nada nao escala em lugar nenhum", () => {
    assert.deepEqual(forbiddenMinistriesForCreator("LEADER", ["m1"], []), ["m1"])
  })

  test("lote misto devolve so os proibidos", () => {
    assert.deepEqual(
      forbiddenMinistriesForCreator("LEADER", ["m1", "m9", "m2"], ["m1", "m2"]),
      ["m9"]
    )
  })

  test("ministerio repetido no lote nao duplica a recusa", () => {
    assert.deepEqual(
      forbiddenMinistriesForCreator("LEADER", ["m9", "m9", "m9"], ["m1"]),
      ["m9"]
    )
  })

  test("papel desconhecido falha fechado (nenhum ministerio liberado)", () => {
    assert.deepEqual(
      forbiddenMinistriesForCreator("VOLUNTEER", ["m1"], ["m1"]),
      ["m1"]
    )
    assert.deepEqual(forbiddenMinistriesForCreator(null, ["m1"], ["m1"]), ["m1"])
    assert.deepEqual(
      forbiddenMinistriesForCreator(undefined, ["m1"], ["m1"]),
      ["m1"]
    )
  })

  test("lista vazia de ministerios nao acusa nada", () => {
    assert.deepEqual(forbiddenMinistriesForCreator("LEADER", [], ["m1"]), [])
  })
})

describe("forbiddenMinistriesMessage", () => {
  test("singular e plural", () => {
    assert.match(forbiddenMinistriesMessage(1), /este ministério/)
    assert.match(forbiddenMinistriesMessage(3), /todos os ministérios/)
  })
})
