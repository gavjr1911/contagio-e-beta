import { NextResponse } from "next/server"
import {
  getProPresenterClient,
  exportSetlistToPlaylist,
} from "@/lib/propresenter"
import { getProPresenterConfig } from "@/lib/settings"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

interface RouteParams {
  params: Promise<{
    eventId: string
  }>
}

/**
 * POST /api/propresenter/export/[eventId]
 *
 * Exporta a setlist de um evento para uma playlist no ProPresenter
 *
 * Path params:
 *   - eventId: string - ID do evento
 *
 * Query params:
 *   - host: string (opcional) - Host do ProPresenter
 *   - port: number (opcional) - Porta do ProPresenter (padrao: 1025)
 *
 * Body:
 *   - playlistName: string (opcional) - Nome personalizado para a playlist
 *   - overwrite: boolean (opcional) - Se true, sobrescreve playlist existente
 *
 * Response:
 *   - 200: Resultado da exportacao
 *   - 400: Parametros invalidos
 *   - 404: Evento nao encontrado
 *   - 503: ProPresenter nao acessivel
 *   - 500: Erro interno
 */
export async function POST(
  request: Request,
  { params }: RouteParams
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return Response.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const { eventId } = await params

    if (!eventId) {
      return NextResponse.json(
        { error: "ID do evento e obrigatorio" },
        { status: 400 }
      )
    }

    // Obter configuracoes do banco de dados
    const dbConfig = await getProPresenterConfig()

    const { searchParams } = new URL(request.url)
    // Prioridade: query params > banco de dados > env vars > defaults
    const host = searchParams.get("host") || dbConfig.host || process.env.PROPRESENTER_HOST || "localhost"
    const port = parseInt(searchParams.get("port") || "", 10) || dbConfig.port || parseInt(process.env.PROPRESENTER_PORT || "1025", 10)

    const body = await request.json().catch(() => ({}))
    const { playlistName, overwrite = false } = body as {
      playlistName?: string
      overwrite?: boolean
    }

    const client = getProPresenterClient({ host, port })

    const result = await exportSetlistToPlaylist(
      eventId,
      { playlistName, overwrite },
      client
    )

    if (!result.success && result.errors.some((e) => e.item === eventId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Evento nao encontrado",
        },
        { status: 404 }
      )
    }

    if (!result.success && result.errors.some((e) => e.error.includes("ja existe"))) {
      return NextResponse.json(
        {
          success: false,
          error: "Playlist ja existe",
          message: "Use overwrite=true para sobrescrever a playlist existente",
          playlistName: result.playlistName,
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: result.success,
      playlistId: result.playlistId,
      playlistName: result.playlistName,
      itemsAdded: result.itemsAdded,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (error) {
    console.error("Erro ao exportar setlist:", error)

    if (
      error instanceof Error &&
      (error.message.includes("CONNECTION") || error.message.includes("TIMEOUT"))
    ) {
      return NextResponse.json(
        {
          error: "ProPresenter nao acessivel",
          message: "Verifique se o ProPresenter esta aberto e com a API habilitada",
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}
