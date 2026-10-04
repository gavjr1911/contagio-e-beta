/**
 * Testes da lógica pura do atalho "ACONTECENDO" no menu.
 *
 * A janela em si já é testada em `src/lib/events/happening.test.ts`. Aqui o que
 * importa é o que o hook acrescenta: QUAL intervalo de datas pedimos à API e
 * PARA ONDE o atalho aponta — os dois já causaram bug neste projeto (dia errado
 * entre 21h e 00h BRT; slug confundido com cuid).
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  getHappeningSearchRange,
  getHappeningEventHref,
  HAPPENING_REFETCH_INTERVAL_MS,
  HAPPENING_TICK_MS,
} from "./use-happening-event";

/** Dia-calendário ancorado em UTC, a régua do projeto. */
function day(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

describe("getHappeningSearchRange", () => {
  test("cobre de ontem até amanhã", () => {
    assert.deepEqual(getHappeningSearchRange(day("2026-10-04")), {
      startDate: "2026-10-03",
      endDate: "2026-10-05",
    });
  });

  test("atravessa virada de mês", () => {
    assert.deepEqual(getHappeningSearchRange(day("2026-11-01")), {
      startDate: "2026-10-31",
      endDate: "2026-11-02",
    });
  });

  test("atravessa virada de ano", () => {
    assert.deepEqual(getHappeningSearchRange(day("2026-12-31")), {
      startDate: "2026-12-30",
      endDate: "2027-01-01",
    });
  });

  test("sem argumento usa o hoje local, sem estourar", () => {
    const range = getHappeningSearchRange();
    assert.match(range.startDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(range.endDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(range.startDate < range.endDate);
  });
});

describe("getHappeningEventHref", () => {
  test("usa o slug quando existe (a rota indexa por slug)", () => {
    assert.equal(
      getHappeningEventHref({
        id: "clx123abc",
        slug: "culto-manha-contribua-2-domingo",
      }),
      "/eventos/culto-manha-contribua-2-domingo",
    );
  });

  test("cai no id quando o evento antigo não tem slug", () => {
    assert.equal(
      getHappeningEventHref({ id: "clx123abc", slug: null }),
      "/eventos/clx123abc",
    );
    assert.equal(
      getHappeningEventHref({ id: "clx123abc" }),
      "/eventos/clx123abc",
    );
  });
});

describe("intervalos", () => {
  test("a reavaliação local é bem mais frequente que a rede", () => {
    assert.ok(HAPPENING_TICK_MS < HAPPENING_REFETCH_INTERVAL_MS);
    // Janela definida em minutos: reavaliar a cada minuto é o passo mínimo útil.
    assert.equal(HAPPENING_TICK_MS, 60_000);
  });
});
