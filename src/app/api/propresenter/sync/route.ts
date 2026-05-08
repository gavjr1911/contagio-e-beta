import { NextResponse } from "next/server"
import {
  getProPresenterClient,
  syncSongsFromLibrary,
  getSyncPreview,
  autoMapSongs,
} from "@/lib/propresenter"
import { getProPresenterConfig } from "@/lib/settings"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

/**
 * GET /api/propresenter/sync
 *
 * Obtem preview da sincronizacao de musicas do ProPresenter
 *
 * Query params:
 *   - host: string (opcional) - Host do ProPresenter
 *   - port: number (opcional) - Porta do ProPresenter (padrao: 1025)
 *
 * Response:
 *   - 200: Preview da sincronizacao
 *   - 503: ProPresenter nao acessivel
 *   - 500: Erro interno
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return Response.json({ error: "Acesso negado" }, { status: 403 });

  try {
    // Obter configuracoes do banco de dados
    const dbConfig = await getProPresenterConfig()

    const { searchParams } = new URL(request.url)
    const host = searchParams.get("host") || dbConfig.host || process.env.PROPRESENTER_HOST || "localhost"
    const port = parseInt(searchParams.get("port") || "", 10) || dbConfig.port || parseInt(process.env.PROPRESENTER_PORT || "1025", 10)

    const client = getProPresenterClient({ host, port })
    const preview = await getSyncPreview(client)

    return NextResponse.json({
      preview: {
        toCreate: preview.toCreate.map((p) => ({
          id: p.uuid,
          name: p.name,
        })),
        toUpdate: preview.toUpdate.map((item) => ({
          song: item.song,
          presentation: {
            id: item.presentation.uuid,
            name: item.presentation.name,
          },
        })),
        toSkip: preview.toSkip.map((p) => ({
          id: p.uuid,
          name: p.name,
        })),
      },
      summary: {
        totalPresentations: preview.toCreate.length + preview.toUpdate.length + preview.toSkip.length,
        toCreate: preview.toCreate.length,
        toUpdate: preview.toUpdate.length,
        alreadySynced: preview.toSkip.length,
      },
    })
  } catch (error) {
    console.error("Erro ao obter preview de sincronizacao:", error)

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
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/propresenter/sync
 *
 * Executa a sincronizacao de musicas do ProPresenter
 *
 * Query params:
 *   - host: string (opcional) - Host do ProPresenter
 *   - port: number (opcional) - Porta do ProPresenter (padrao: 1025)
 *
 * Body:
 *   - dryRun: boolean (opcional) - Se true, apenas simula a sincronizacao
 *   - overwrite: boolean (opcional) - Se true, sobrescreve vinculos existentes
 *   - autoMap: boolean (opcional) - Se true, usa mapeamento automatico por nome
 *   - threshold: number (opcional) - Limiar de similaridade para autoMap (0-1, padrao: 0.8)
 *
 * Response:
 *   - 200: Resultado da sincronizacao
 *   - 503: ProPresenter nao acessivel
 *   - 500: Erro interno
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return Response.json({ error: "Acesso negado" }, { status: 403 });

  try {
    // Obter configuracoes do banco de dados
    const dbConfig = await getProPresenterConfig()

    const { searchParams } = new URL(request.url)
    const host = searchParams.get("host") || dbConfig.host || process.env.PROPRESENTER_HOST || "localhost"
    const port = parseInt(searchParams.get("port") || "", 10) || dbConfig.port || parseInt(process.env.PROPRESENTER_PORT || "1025", 10)

    const body = await request.json().catch(() => ({}))
    const {
      dryRun = false,
      overwrite = false,
      autoMap = false,
      threshold = 0.8,
    } = body as {
      dryRun?: boolean
      overwrite?: boolean
      autoMap?: boolean
      threshold?: number
    }

    const client = getProPresenterClient({ host, port })

    if (autoMap) {
      // Usa mapeamento automatico por nome
      const result = await autoMapSongs({ threshold }, client)

      return NextResponse.json({
        success: true,
        mode: "autoMap",
        mapped: result.mapped.length,
        notFound: result.notFound.length,
        details: {
          mapped: result.mapped,
          notFound: result.notFound,
        },
      })
    }

    // Sincronizacao padrao - importa da biblioteca
    const result = await syncSongsFromLibrary({ dryRun, overwrite }, client)

    return NextResponse.json({
      success: result.success,
      mode: dryRun ? "dryRun" : "sync",
      synced: result.synced,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors,
    })
  } catch (error) {
    console.error("Erro ao sincronizar musicas:", error)

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
