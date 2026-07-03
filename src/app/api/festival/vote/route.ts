import { type NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import { hit } from "@/lib/rate-limit"
import { festivalVoteSchema } from "@/lib/validations/festival"

// Rota PÚBLICA — votação aberta do Festival Gastronômico (sem login).
// Recurso temporário do evento (ver modelo FestivalVote).

const RATE_MAX = 15 // votos/tentativas por janela, por IP
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hora

function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]!.trim()
  return request.headers.get("x-real-ip") ?? "unknown"
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  // Rate limit por IP para conter flood/abuso.
  if (hit(`festival:vote:${ip}`, RATE_MAX, RATE_WINDOW_MS)) {
    return Response.json(
      { error: "Muitas tentativas. Aguarde um pouco e tente novamente." },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Requisição inválida" }, { status: 400 })
  }

  const parsed = festivalVoteSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return Response.json(
      { error: first?.message ?? "Dados inválidos" },
      { status: 400 },
    )
  }

  const {
    fullName,
    phone,
    barracaBonita,
    melhorAtendimento,
    gastronomiaSalgada,
    gastronomiaDoce,
    espiritoBeta,
  } = parsed.data

  try {
    // 1 voto por telefone: checagem amigável antes do insert.
    const existing = await prisma.festivalVote.findUnique({
      where: { phone },
      select: { id: true },
    })
    if (existing) {
      return Response.json(
        { error: "Este telefone já registrou um voto. Obrigado por participar!" },
        { status: 409 },
      )
    }

    await prisma.festivalVote.create({
      data: {
        fullName,
        phone,
        barracaBonita,
        melhorAtendimento,
        gastronomiaSalgada,
        gastronomiaDoce,
        espiritoBeta,
        ipAddress: ip,
        userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      },
    })

    return Response.json({ success: true }, { status: 201 })
  } catch (error) {
    // Corrida: unique violation no telefone (P2002).
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return Response.json(
        { error: "Este telefone já registrou um voto. Obrigado por participar!" },
        { status: 409 },
      )
    }
    console.error("[festival/vote] erro ao registrar voto:", error)
    return Response.json(
      { error: "Erro ao registrar seu voto. Tente novamente." },
      { status: 500 },
    )
  }
}
