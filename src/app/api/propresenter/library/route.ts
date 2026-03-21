import { NextResponse } from "next/server"
import {
  getProPresenterClient,
  getLibraries,
  getLibraryPresentations,
  searchPresentations,
} from "@/lib/propresenter"

export const dynamic = "force-dynamic"

/**
 * GET /api/propresenter/library
 *
 * Lista a biblioteca do ProPresenter
 *
 * Query params:
 *   - host: string (opcional) - Host do ProPresenter
 *   - port: number (opcional) - Porta do ProPresenter (padrao: 1025)
 *   - search: string (opcional) - Filtrar por nome
 *   - type: "all" | "presentations" (opcional) - Tipo de items (padrao: presentations)
 *
 * Response:
 *   - 200: Lista de items da biblioteca
 *   - 503: ProPresenter nao acessivel
 *   - 500: Erro interno
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const host = searchParams.get("host") || process.env.PROPRESENTER_HOST || "localhost"
    const port = parseInt(searchParams.get("port") || process.env.PROPRESENTER_PORT || "1025", 10)
    const search = searchParams.get("search") || ""
    const type = searchParams.get("type") || "presentations"

    const client = getProPresenterClient({ host, port })

    if (type === "all") {
      const libraries = await getLibraries(client)
      return NextResponse.json({
        libraries,
        total: libraries.reduce((acc, lib) => acc + (lib.items?.length || 0), 0),
      })
    }

    // Por padrao retorna apenas apresentacoes
    let presentations = await getLibraryPresentations(client)

    // Filtra por busca se fornecido
    if (search) {
      presentations = await searchPresentations(search, client)
    }

    return NextResponse.json({
      presentations,
      total: presentations.length,
    })
  } catch (error) {
    console.error("Erro ao listar biblioteca do ProPresenter:", error)

    // Verifica se e erro de conexao
    if (
      error instanceof Error &&
      (error.message.includes("CONNECTION") || error.message.includes("TIMEOUT"))
    ) {
      return NextResponse.json(
        {
          error: "ProPresenter nao acessivel",
          message: "Verifique se o ProPresenter esta aberto e com a API habilitada em Settings > Network",
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
