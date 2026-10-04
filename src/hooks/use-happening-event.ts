"use client";

/**
 * "Evento acontecendo agora" para o menu.
 *
 * A regra da janela (2h antes do início até 1h depois do término) vive em
 * `src/lib/events/happening.ts`. Aqui só buscamos os eventos candidatos e
 * reavaliamos a janela de tempos em tempos.
 *
 * MODELO DE DATAS: tudo ancorado em `getTodayLocal()`/`getNowLocal()`. Montar a
 * data com `new Date()` do navegador quebraria entre 21h e 00h BRT, quando o
 * dia UTC já virou e buscaríamos o dia errado.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addDays,
  formatDateToISO,
  getNowLocal,
  getTodayLocal,
} from "@/lib/date-utils";
import { selectHappeningEvent, type TimedEvent } from "@/lib/events/happening";

/**
 * De quanto em quanto tempo refazemos a requisição.
 *
 * 5 minutos é o mesmo ritmo já usado pelo dashboard (`use-dashboard.ts`), e o
 * suficiente para o menu enxergar um evento que acabou de ser criado ou teve o
 * horário mudado. Não precisa ser mais agressivo: a ABERTURA e o FECHAMENTO da
 * janela não dependem da rede — são recalculados localmente a cada
 * `HAPPENING_TICK_MS` sobre os dados em cache.
 */
export const HAPPENING_REFETCH_INTERVAL_MS = 5 * 60_000;

/**
 * De quanto em quanto tempo reavaliamos a janela no cliente, sem rede.
 *
 * 1 minuto: a janela é definida em minutos, então esse é o menor passo que
 * importa, e é barato (um `setState` por minuto, zero requisição). Sem isto,
 * quem deixou a aba aberta antes do culto nunca veria o atalho aparecer.
 */
export const HAPPENING_TICK_MS = 60_000;

/** `staleTime` curto o bastante para não servir dado velho, longo o bastante
 * para o sidebar (que está em TODAS as páginas) não refazer a busca a cada
 * navegação. */
export const HAPPENING_STALE_TIME_MS = 2 * 60_000;

export interface HappeningEvent extends TimedEvent {
  id: string;
  slug?: string | null;
  name: string;
  type?: string;
}

/**
 * Janela de busca: de ONTEM até AMANHÃ, não só "hoje".
 *
 * Um culto que termina 23:40 continua na janela até 00:40 do dia seguinte, e um
 * que começa 00:30 já entra na janela às 22:30 do dia anterior. Buscar só o dia
 * corrente perderia os dois casos. São poucos registros, o custo é irrisório.
 */
export function getHappeningSearchRange(today: Date = getTodayLocal()): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: formatDateToISO(addDays(today, -1)),
    endDate: formatDateToISO(addDays(today, 1)),
  };
}

/**
 * Href da página do evento.
 *
 * A rota indexa por SLUG; o cuid é só o fallback para eventos antigos que nunca
 * ganharam slug. Mesmo padrão de `dashboard-content.tsx` e `event-card.tsx`.
 */
export function getHappeningEventHref(event: {
  id: string;
  slug?: string | null;
}): string {
  return `/eventos/${event.slug ?? event.id}`;
}

async function fetchHappeningCandidates(): Promise<HappeningEvent[]> {
  const { startDate, endDate } = getHappeningSearchRange();

  const params = new URLSearchParams();
  params.set("startDate", startDate);
  params.set("endDate", endDate);
  params.set("limit", "50");

  const response = await fetch(`/api/events?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Erro ao carregar eventos do dia");
  }

  const result = await response.json();
  return Array.isArray(result?.data) ? (result.data as HappeningEvent[]) : [];
}

/**
 * O evento que está acontecendo agora, ou `null`.
 *
 * Falha e carregamento são SILENCIOSOS de propósito: se a busca der erro o menu
 * simplesmente não mostra o atalho. Ele é um acelerador, não um caminho único —
 * derrubar a navegação inteira por causa dele seria muito pior.
 */
export function useHappeningEvent(): HappeningEvent | null {
  const { data } = useQuery({
    queryKey: ["happening-event", "candidates"],
    queryFn: fetchHappeningCandidates,
    staleTime: HAPPENING_STALE_TIME_MS,
    refetchInterval: HAPPENING_REFETCH_INTERVAL_MS,
    // Sem retentativas em cascata: o próximo `refetchInterval` já tenta de novo.
    retry: 1,
    // Nada de erro borbulhando para o ErrorBoundary — ver docstring.
    throwOnError: false,
  });

  // Relógio local: faz a janela abrir/fechar sozinha mesmo com a lista em cache.
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), HAPPENING_TICK_MS);
    return () => clearInterval(id);
  }, []);

  return React.useMemo(() => {
    if (!data || data.length === 0) return null;
    try {
      return selectHappeningEvent(data, getNowLocal());
    } catch {
      return null;
    }
    // `tick` é dependência de propósito: é ele que reavalia a janela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, tick]);
}
