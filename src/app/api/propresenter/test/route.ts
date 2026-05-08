import { NextResponse } from "next/server"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

/**
 * GET /api/propresenter/test
 *
 * Endpoint de teste para investigar a API do ProPresenter
 * Testa diferentes formatos de PUT para descobrir o correto
 *
 * APENAS disponivel em ambiente de desenvolvimento.
 */
export async function GET() {
  // Guard de ambiente: endpoint so funciona fora de producao
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(null, { status: 404 })
  }

  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return Response.json({ error: "Acesso negado" }, { status: 403 });

  const host = process.env.PROPRESENTER_HOST || "localhost"
  const port = process.env.PROPRESENTER_PORT || "1025"
  const baseUrl = `http://${host}:${port}`

  const results: Record<string, unknown> = {}

  try {
    // 1. Testar versao
    const versionRes = await fetch(`${baseUrl}/version`)
    results.version = await versionRes.json()

    // 2. Listar playlists
    const playlistsRes = await fetch(`${baseUrl}/v1/playlists`)
    results.playlists = await playlistsRes.json()

    // 3. Listar bibliotecas para pegar UUIDs reais
    const libRes = await fetch(`${baseUrl}/v1/libraries`)
    const libraries = await libRes.json()
    results.libraries = libraries

    // Pegar items da primeira biblioteca
    let presentationUuid = ""
    let presentationName = ""
    if (libraries && libraries.length > 0) {
      const libDetailRes = await fetch(`${baseUrl}/v1/library/${libraries[0].uuid}`)
      const libDetail = await libDetailRes.json()
      if (libDetail.items && libDetail.items.length > 0) {
        presentationUuid = libDetail.items[0].uuid
        presentationName = libDetail.items[0].name
      }
    }

    // 4. Se houver playlist, testar diferentes formatos
    const playlists = results.playlists as Array<{id: {uuid: string, name: string}}>
    if (playlists && playlists.length > 0 && presentationUuid) {
      const playlistId = playlists[0].id?.uuid
      const playlistName = playlists[0].id?.name

      // Formato 1: Array simples (sem target_uuid)
      const format1 = [{
        id: { uuid: presentationUuid, name: presentationName, index: 0 },
        type: "presentation",
        is_hidden: false,
        is_pco: false
      }]
      const res1 = await fetch(`${baseUrl}/v1/playlist/${playlistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(format1)
      })
      const text1 = await res1.text()
      results.test1_array_simples = { status: res1.status, body: text1, format: format1 }

      // Formato 2: Array com target_uuid em cada item
      const format2 = [{
        target_uuid: playlistId,
        id: { uuid: presentationUuid, name: presentationName, index: 0 },
        type: "presentation",
        is_hidden: false,
        is_pco: false
      }]
      const res2 = await fetch(`${baseUrl}/v1/playlist/${playlistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(format2)
      })
      const text2 = await res2.text()
      results.test2_com_target_uuid = { status: res2.status, body: text2, format: format2 }

      // Formato 3: Array de strings (apenas UUIDs)
      const format3 = [presentationUuid]
      const res3 = await fetch(`${baseUrl}/v1/playlist/${playlistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(format3)
      })
      const text3 = await res3.text()
      results.test3_array_uuids = { status: res3.status, body: text3, format: format3 }

      // Formato 4: Objeto com items
      const format4 = {
        items: [{
          id: { uuid: presentationUuid, name: presentationName, index: 0 },
          type: "presentation",
          is_hidden: false,
          is_pco: false
        }]
      }
      const res4 = await fetch(`${baseUrl}/v1/playlist/${playlistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(format4)
      })
      const text4 = await res4.text()
      results.test4_objeto_items = { status: res4.status, body: text4, format: format4 }

      // Formato 5: Formato com presentation path
      const format5 = [{
        id: { uuid: presentationUuid, name: presentationName, index: 0 },
        type: "presentation",
        is_hidden: false,
        is_pco: false,
        presentation_path: presentationUuid
      }]
      const res5 = await fetch(`${baseUrl}/v1/playlist/${playlistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(format5)
      })
      const text5 = await res5.text()
      results.test5_presentation_path = { status: res5.status, body: text5, format: format5 }

      // Verificar conteudo final da playlist
      const finalRes = await fetch(`${baseUrl}/v1/playlist/${playlistId}`)
      const finalText = await finalRes.text()
      results.playlist_final = { status: finalRes.status, body: finalText }

      // Silencia variavel nao usada (apenas para evitar linting)
      void playlistName
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Erro desconhecido",
      results
    }, { status: 500 })
  }
}
