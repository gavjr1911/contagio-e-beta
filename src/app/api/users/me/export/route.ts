import { type NextRequest } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/users/me/export
 *
 * Exporta todos os dados pessoais do usuario autenticado em formato JSON.
 * Endpoint LGPD — Direito de portabilidade de dados (Art. 18, V, LGPD).
 */
export async function GET(_request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        active: true,
        birthDate: true,
        createdAt: true,
        updatedAt: true,
        ministryMemberships: {
          select: {
            id: true,
            ministryId: true,
            active: true,
            createdAt: true,
            ministry: {
              select: { id: true, name: true },
            },
          },
        },
        schedules: {
          select: {
            id: true,
            eventId: true,
            ministryId: true,
            position: true,
            status: true,
            confirmedAt: true,
            createdAt: true,
            event: {
              select: {
                id: true,
                name: true,
                date: true,
              },
            },
            ministry: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        blockedDates: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            reason: true,
            createdAt: true,
          },
        },
        notifications: {
          select: {
            id: true,
            type: true,
            title: true,
            message: true,
            read: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        },
      },
    })

    if (!user) {
      return Response.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    return new Response(
      JSON.stringify(
        { exportedAt: new Date().toISOString(), data: user },
        null,
        2
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="meus-dados-${userId}.json"`,
        },
      }
    )
  } catch (error) {
    console.error("[LGPD/Export] Erro ao exportar dados:", error)
    return Response.json({ error: "Erro ao exportar dados pessoais" }, { status: 500 })
  }
}
