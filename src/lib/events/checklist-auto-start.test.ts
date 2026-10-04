/**
 * Testes da decisão de materializar o checklist sozinho ao abrir a aba.
 *
 * O "agora" é sempre injetado, então o resultado não depende do fuso do
 * processo — mesma régua de `happening.test.ts` (wall-clock ancorado em UTC).
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"

import {
  shouldAutoStartChecklist,
  isAlreadyStartedError,
  toTimedEvent,
} from "./checklist-auto-start"

/** Wall-clock de São Paulo ancorado em UTC. */
function at(iso: string): Date {
  return new Date(`${iso}Z`)
}

const culto = {
  date: "2026-10-11",
  startTime: "09:50",
  endTime: "11:30",
  status: "PUBLISHED",
}

/** Caso feliz: dentro da janela, com permissão, com template, sem itens. */
function base() {
  return {
    event: culto,
    canEdit: true,
    hasTemplate: true,
    hasInstantiatedItems: false,
    isCompleted: false,
    now: at("2026-10-11T09:00:00"),
  }
}

describe("shouldAutoStartChecklist", () => {
  test("dispara dentro da janela com permissão e sem itens", () => {
    assert.equal(shouldAutoStartChecklist(base()), true)
  })

  test("não dispara antes de a janela abrir", () => {
    assert.equal(
      shouldAutoStartChecklist({ ...base(), now: at("2026-10-11T07:30:00") }),
      false,
    )
  })

  test("não dispara depois de a janela fechar", () => {
    assert.equal(
      shouldAutoStartChecklist({ ...base(), now: at("2026-10-11T12:31:00") }),
      false,
    )
  })

  test("sem permissão do servidor, não dispara — nem dentro da janela", () => {
    assert.equal(shouldAutoStartChecklist({ ...base(), canEdit: false }), false)
  })

  test("evento concluído não dispara", () => {
    assert.equal(
      shouldAutoStartChecklist({ ...base(), isCompleted: true }),
      false,
    )
  })

  test("evento com status COMPLETED não dispara nem com isCompleted ausente", () => {
    assert.equal(
      shouldAutoStartChecklist({
        ...base(),
        event: { ...culto, status: "COMPLETED" },
      }),
      false,
    )
  })

  test("sem template não dispara", () => {
    assert.equal(shouldAutoStartChecklist({ ...base(), hasTemplate: false }), false)
  })

  test("com itens já instanciados não dispara", () => {
    assert.equal(
      shouldAutoStartChecklist({ ...base(), hasInstantiatedItems: true }),
      false,
    )
  })

  test("sem o evento em cache ainda, não dispara", () => {
    assert.equal(shouldAutoStartChecklist({ ...base(), event: null }), false)
  })
})

describe("toTimedEvent", () => {
  test("normaliza o formato que a API devolve", () => {
    assert.deepEqual(
      toTimedEvent({
        date: "2026-10-11",
        startTime: "09:50",
        endTime: "11:30",
        status: "PUBLISHED",
      }),
      { date: "2026-10-11", startTime: "09:50", endTime: "11:30", status: "PUBLISHED" },
    )
  })

  test("aceita hora com segundos e corta para HH:MM", () => {
    const out = toTimedEvent({ date: "2026-10-11", startTime: "09:50:00" })
    assert.equal(out?.startTime, "09:50")
  })

  test("evento sem endTime vira endTime nulo", () => {
    assert.equal(toTimedEvent({ date: "2026-10-11", startTime: "09:50" })?.endTime, null)
  })

  test("formato inesperado devolve null em vez de chutar", () => {
    assert.equal(toTimedEvent({ date: new Date(), startTime: "09:50" }), null)
    assert.equal(toTimedEvent({ date: "11/10/2026", startTime: "09:50" }), null)
    assert.equal(toTimedEvent({ date: "2026-10-11" }), null)
    assert.equal(toTimedEvent(undefined), null)
    assert.equal(toTimedEvent(null), null)
  })
})

describe("isAlreadyStartedError", () => {
  test("reconhece o 400 de corrida do servidor", () => {
    assert.equal(
      isAlreadyStartedError("Checklist ja foi iniciado para este evento"),
      true,
    )
    assert.equal(
      isAlreadyStartedError("Checklist já foi iniciado para este evento"),
      true,
    )
  })

  test("não confunde com erro de permissão ou de rede", () => {
    assert.equal(isAlreadyStartedError("Voce nao tem permissao"), false)
    assert.equal(isAlreadyStartedError("Failed to fetch"), false)
    assert.equal(isAlreadyStartedError(""), false)
    assert.equal(isAlreadyStartedError(null), false)
  })
})
