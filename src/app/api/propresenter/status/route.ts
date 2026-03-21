import { NextResponse } from "next/server"
import {
  getProPresenterClient,
  checkConnection,
  getVersion,
} from "@/lib/propresenter"
import type { ConnectionState, ProPresenterVersion } from "@/lib/propresenter"

export const dynamic = "force-dynamic"

interface StatusResponse {
  connected: boolean
  version?: ProPresenterVersion
  state: ConnectionState
  config: {
    host: string
    port: number
  }
}

/**
 * GET /api/propresenter/status
 *
 * Verifica o status da conexao com o ProPresenter
 *
 * Query params:
 *   - host: string (opcional) - Host do ProPresenter
 *   - port: number (opcional) - Porta do ProPresenter (padrao: 1025)
 *
 * Response:
 *   - 200: Status da conexao
 *   - 500: Erro interno
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const host = searchParams.get("host") || process.env.PROPRESENTER_HOST || "localhost"
    const port = parseInt(searchParams.get("port") || process.env.PROPRESENTER_PORT || "1025", 10)

    const client = getProPresenterClient({ host, port })
    const connected = await checkConnection(client)

    let version: ProPresenterVersion | undefined
    if (connected) {
      try {
        version = await getVersion(client)
      } catch {
        // Ignora erro de versao se conseguiu conectar
      }
    }

    const state = client.getConnectionState()

    const response: StatusResponse = {
      connected,
      version,
      state,
      config: { host, port },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Erro ao verificar status do ProPresenter:", error)
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        state: { status: "error" as const },
        config: {
          host: process.env.PROPRESENTER_HOST || "localhost",
          port: parseInt(process.env.PROPRESENTER_PORT || "1025", 10),
        },
      },
      { status: 200 } // Retorna 200 mesmo com erro de conexao
    )
  }
}
