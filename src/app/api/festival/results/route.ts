import { type NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import { hit } from "@/lib/rate-limit"
import {
  FESTIVAL_CATEGORIES,
  FESTIVAL_STATES,
  FESTIVAL_STATE_BY_KEY,
  type FestivalCategoryId,
} from "@/lib/festival/data"

// Rota PÚBLICA porém protegida por código (para o telão/apuração).
// Código configurável via env FESTIVAL_RESULTS_CODE.

const RATE_MAX = 20 // tentativas de código por janela, por IP
const RATE_WINDOW_MS = 10 * 60 * 1000 // 10 min

function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]!.trim()
  return request.headers.get("x-real-ip") ?? "unknown"
}

/** Comparação em tempo (aproximadamente) constante para o código. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request)
  if (hit(`festival:results:${ip}`, RATE_MAX, RATE_WINDOW_MS)) {
    return Response.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 },
    )
  }

  const expected = process.env.FESTIVAL_RESULTS_CODE
  if (!expected) {
    return Response.json(
      { error: "Painel de resultados não configurado." },
      { status: 503 },
    )
  }

  const code = request.nextUrl.searchParams.get("code")?.trim() ?? ""
  if (!code || !safeEqual(code, expected)) {
    return Response.json({ error: "Código inválido." }, { status: 401 })
  }

  // Agrega votos por categoria (uma query groupBy por coluna).
  const categoryIds = FESTIVAL_CATEGORIES.map((c) => c.id)
  const [total, ...groups] = await Promise.all([
    prisma.festivalVote.count(),
    ...categoryIds.map((field) =>
      prisma.festivalVote.groupBy({
        by: [field],
        _count: { _all: true },
      }),
    ),
  ])

  const results: Record<
    FestivalCategoryId,
    { key: string; name: string; emoji: string; salgado: string; doce: string; votes: number }[]
  > = {} as never

  categoryIds.forEach((field, idx) => {
    const counts = new Map<string, number>()
    for (const row of groups[idx] as Array<Record<string, unknown>>) {
      const key = row[field] as string
      counts.set(key, (row._count as { _all: number })._all)
    }
    results[field] = FESTIVAL_STATES.map((s) => ({
      key: s.key,
      name: s.name,
      emoji: s.emoji,
      salgado: s.salgado,
      doce: s.doce,
      votes: counts.get(s.key) ?? 0,
    })).sort((a, b) => b.votes - a.votes)
  })

  return Response.json({
    totalVotes: total,
    generatedAt: new Date().toISOString(),
    categories: FESTIVAL_CATEGORIES.map((c) => ({
      id: c.id,
      title: c.title,
      short: c.short,
      emoji: c.emoji,
      dish: c.dish ?? null,
    })),
    results,
    // eco para debug/telão (não sensível)
    stateByKey: FESTIVAL_STATE_BY_KEY,
  })
}
