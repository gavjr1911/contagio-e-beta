/**
 * ProPresenter API Functions
 *
 * Funcoes para interagir com os endpoints principais do ProPresenter 7.9+
 *
 * IMPORTANTE: O ProPresenter precisa estar com a API habilitada em:
 * Settings > Network > Enable Network
 */

import { getProPresenterClient, type ProPresenterClient } from "./client"
import type {
  Library,
  LibraryItem,
  Playlist,
  PlaylistCreateRequest,
  Presentation,
  PresentationMetadata,
  ActiveSlide,
  Look,
  Message,
  Timer,
  TimerState,
  MediaItem,
  ProPresenterVersion,
} from "./types"

// ============================================================================
// Versao e Status
// ============================================================================

/**
 * Obtem a versao do ProPresenter
 */
export async function getVersion(
  client?: ProPresenterClient
): Promise<ProPresenterVersion> {
  const pp = client ?? getProPresenterClient()
  return pp.get<ProPresenterVersion>("/version")
}

/**
 * Verifica se o ProPresenter esta acessivel
 */
export async function checkConnection(
  client?: ProPresenterClient
): Promise<boolean> {
  try {
    const pp = client ?? getProPresenterClient()
    await pp.testConnection()
    return true
  } catch {
    return false
  }
}

// ============================================================================
// Biblioteca (Library)
// ============================================================================

/**
 * Lista todas as bibliotecas disponiveis
 */
export async function getLibraries(
  client?: ProPresenterClient
): Promise<Library[]> {
  const pp = client ?? getProPresenterClient()
  return pp.get<Library[]>("/v1/libraries")
}

/**
 * Obtem itens de uma biblioteca especifica
 */
export async function getLibrary(
  libraryId: string,
  client?: ProPresenterClient
): Promise<Library> {
  const pp = client ?? getProPresenterClient()
  return pp.get<Library>(`/v1/library/${encodeURIComponent(libraryId)}`)
}

/**
 * Lista todas as apresentacoes da biblioteca
 */
export async function getLibraryPresentations(
  client?: ProPresenterClient
): Promise<LibraryItem[]> {
  const pp = client ?? getProPresenterClient()
  const libraries = await getLibraries(pp)

  console.log(`[ProPresenter] Resposta bruta de /v1/libraries:`, JSON.stringify(libraries, null, 2))

  const presentations: LibraryItem[] = []

  // Processa cada biblioteca
  for (const library of libraries) {
    console.log(`[ProPresenter] Biblioteca: ${library.name} (UUID: ${library.uuid})`)

    const libraryId = library.uuid
    const libraryName = library.name || 'biblioteca'

    console.log(`[ProPresenter] Processando biblioteca: ${libraryName} (ID: ${libraryId})`)

    // Primeiro verifica se a biblioteca ja veio com os items
    if (library.items && library.items.length > 0) {
      console.log(`[ProPresenter] Biblioteca ${libraryName} tem ${library.items.length} items diretos`)
      presentations.push(...library.items)
    } else if (libraryId) {
      // Se nao, busca os items da biblioteca individualmente
      try {
        console.log(`[ProPresenter] Buscando items da biblioteca ${libraryId}`)
        const libraryDetails = await getLibrary(libraryId, pp)

        console.log(`[ProPresenter] Detalhes da biblioteca:`, JSON.stringify(libraryDetails, null, 2))

        if (libraryDetails.items && libraryDetails.items.length > 0) {
          console.log(`[ProPresenter] Encontrados ${libraryDetails.items.length} items`)
          presentations.push(...libraryDetails.items)
        } else {
          console.log(`[ProPresenter] Biblioteca ${libraryName} sem items`)
        }
      } catch (error) {
        console.log(`[ProPresenter] Erro ao buscar biblioteca ${libraryName}:`, error)
      }
    } else {
      console.log(`[ProPresenter] Biblioteca sem ID identificavel, pulando...`)
    }
  }

  console.log(`[ProPresenter] Total de ${presentations.length} apresentacoes encontradas`)
  return presentations
}

// ============================================================================
// Playlists
// ============================================================================

/**
 * Lista todas as playlists
 */
export async function getPlaylists(
  client?: ProPresenterClient
): Promise<Playlist[]> {
  const pp = client ?? getProPresenterClient()
  const response = await pp.get<unknown>("/v1/playlists")

  console.log(`[ProPresenter API] Resposta /v1/playlists:`, JSON.stringify(response, null, 2))

  // A resposta é um array de playlists com estrutura {id: {uuid, name, index}, field_type, children}
  if (Array.isArray(response)) {
    return response as Playlist[]
  }

  // Se for um objeto com uma propriedade que contém as playlists
  if (response && typeof response === "object") {
    const obj = response as Record<string, unknown>
    // Tenta encontrar um array dentro do objeto
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key])) {
        return obj[key] as Playlist[]
      }
    }
  }

  return []
}

/**
 * Obtem detalhes de uma playlist especifica
 */
export async function getPlaylist(
  playlistId: string,
  client?: ProPresenterClient
): Promise<Playlist> {
  const pp = client ?? getProPresenterClient()
  return pp.get<Playlist>(`/v1/playlist/${encodeURIComponent(playlistId)}`)
}

/**
 * Obtem a playlist ativa
 */
export async function getActivePlaylist(
  client?: ProPresenterClient
): Promise<Playlist | null> {
  const pp = client ?? getProPresenterClient()
  try {
    return await pp.get<Playlist>("/v1/playlist/active")
  } catch {
    return null
  }
}

/**
 * Cria uma nova playlist
 */
export async function createPlaylist(
  name: string,
  items?: PlaylistCreateRequest["items"],
  client?: ProPresenterClient
): Promise<Playlist> {
  const pp = client ?? getProPresenterClient()

  console.log(`[ProPresenter API] Criando playlist: ${name}`)

  const response = await pp.post<unknown>("/v1/playlists", {
    name,
    type: "playlist",
    items: items ?? [],
  })

  console.log(`[ProPresenter API] Resposta createPlaylist:`, JSON.stringify(response, null, 2))

  // Verifica se a resposta tem a estrutura esperada {id: {uuid, name, index}}
  if (response && typeof response === "object") {
    const obj = response as Record<string, unknown>
    if (obj.id && typeof obj.id === "object") {
      console.log(`[ProPresenter API] Playlist criada com estrutura correta`)
      return response as Playlist
    }
  }

  // Busca a playlist pelo nome
  console.log(`[ProPresenter API] Buscando playlist criada pelo nome...`)
  const playlists = await getPlaylists(pp)
  const created = playlists.find((p) => p.id?.name?.toLowerCase() === name.toLowerCase())

  if (created) {
    console.log(`[ProPresenter API] Playlist encontrada: ${created.id.uuid}`)
    return created
  }

  // Retorna objeto parcial se nao encontrar
  console.log(`[ProPresenter API] Playlist nao encontrada, retornando objeto parcial`)
  return { id: { uuid: "", name, index: 0 }, type: "playlist" }
}

/**
 * Define os itens de uma playlist via PUT
 *
 * ProPresenter 7 API: PUT /v1/playlist/{playlist_id}
 * Body: Array de items (SEM target_uuid - o ID da playlist já está na URL)
 *
 * Formato esperado:
 * [
 *   {
 *     "id": { "uuid": "...", "name": "...", "index": 0 },
 *     "type": "presentation",
 *     "is_hidden": false,
 *     "is_pco": false
 *   }
 * ]
 */
export async function setPlaylistItems(
  playlistId: string,
  items: { uuid: string; name?: string }[],
  client?: ProPresenterClient
): Promise<void> {
  if (!playlistId) {
    console.log(`[ProPresenter API] ERRO: playlistId vazio`)
    return
  }

  const pp = client ?? getProPresenterClient()

  // Formata os itens conforme esperado pela API
  // PUT requer target_uuid em cada item
  const body = items.map((item, index) => ({
    target_uuid: playlistId,
    id: {
      uuid: item.uuid,
      name: item.name || "",
      index: index,
    },
    type: "presentation",
    is_hidden: false,
    is_pco: false,
  }))

  console.log(`[ProPresenter API] Definindo ${items.length} itens na playlist ${playlistId}`)
  console.log(`[ProPresenter API] Body:`, JSON.stringify(body, null, 2))

  try {
    // PUT para definir conteúdo da playlist
    const response = await pp.put(`/v1/playlist/${encodeURIComponent(playlistId)}`, body)
    console.log(`[ProPresenter API] Resposta setPlaylistItems:`, JSON.stringify(response, null, 2))
  } catch (error) {
    console.log(`[ProPresenter API] ERRO ao definir itens:`, error instanceof Error ? error.message : error)
    throw error
  }
}

/**
 * Adiciona um item a uma playlist (deprecated - use setPlaylistItems)
 */
export async function addPlaylistItem(
  playlistId: string,
  item: { id: string; type: string },
  client?: ProPresenterClient
): Promise<void> {
  // Método legado - agora é no-op, pois usamos setPlaylistItems
  console.log(`[ProPresenter API] addPlaylistItem chamado (legado) - use setPlaylistItems`)
}

/**
 * Remove um item de uma playlist
 */
export async function removePlaylistItem(
  playlistId: string,
  itemIndex: number,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.delete(
    `/v1/playlist/${encodeURIComponent(playlistId)}/item/${itemIndex}`
  )
}

/**
 * Deleta uma playlist
 */
export async function deletePlaylist(
  playlistId: string,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.delete(`/v1/playlist/${encodeURIComponent(playlistId)}`)
}

// ============================================================================
// Apresentacoes (Presentations)
// ============================================================================

/**
 * Obtem a apresentacao atual
 */
export async function getCurrentPresentation(
  client?: ProPresenterClient
): Promise<PresentationMetadata | null> {
  const pp = client ?? getProPresenterClient()
  try {
    return await pp.get<PresentationMetadata>("/v1/presentation/active")
  } catch {
    return null
  }
}

/**
 * Obtem detalhes de uma apresentacao
 */
export async function getPresentation(
  presentationId: string,
  client?: ProPresenterClient
): Promise<Presentation> {
  const pp = client ?? getProPresenterClient()
  return pp.get<Presentation>(
    `/v1/presentation/${encodeURIComponent(presentationId)}`
  )
}

/**
 * Obtem o slide ativo
 */
export async function getActiveSlide(
  client?: ProPresenterClient
): Promise<ActiveSlide | null> {
  const pp = client ?? getProPresenterClient()
  try {
    return await pp.get<ActiveSlide>("/v1/presentation/slide_index")
  } catch {
    return null
  }
}

// ============================================================================
// Triggers (Controles de Slide)
// ============================================================================

/**
 * Dispara um slide especifico de uma apresentacao
 */
export async function triggerSlide(
  presentationId: string,
  slideIndex: number,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post(
    `/v1/presentation/${encodeURIComponent(presentationId)}/trigger/slide/${slideIndex}`
  )
}

/**
 * Vai para o proximo slide
 */
export async function triggerNext(
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post("/v1/trigger/next")
}

/**
 * Volta para o slide anterior
 */
export async function triggerPrevious(
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post("/v1/trigger/previous")
}

/**
 * Ativa uma apresentacao da playlist
 */
export async function triggerPlaylistItem(
  playlistId: string,
  itemIndex: number,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post(
    `/v1/playlist/${encodeURIComponent(playlistId)}/item/${itemIndex}/trigger`
  )
}

/**
 * Limpa o slide atual (tela em branco)
 */
export async function clearSlide(
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post("/v1/clear/slide")
}

/**
 * Limpa todos os layers
 */
export async function clearAll(
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post("/v1/clear/all")
}

// ============================================================================
// Looks
// ============================================================================

/**
 * Lista todos os looks disponiveis
 */
export async function getLooks(
  client?: ProPresenterClient
): Promise<Look[]> {
  const pp = client ?? getProPresenterClient()
  return pp.get<Look[]>("/v1/looks")
}

/**
 * Obtem o look ativo
 */
export async function getActiveLook(
  client?: ProPresenterClient
): Promise<Look | null> {
  const pp = client ?? getProPresenterClient()
  try {
    return await pp.get<Look>("/v1/look/active")
  } catch {
    return null
  }
}

/**
 * Ativa um look especifico
 */
export async function triggerLook(
  lookId: string,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post(`/v1/look/${encodeURIComponent(lookId)}/trigger`)
}

// ============================================================================
// Mensagens
// ============================================================================

/**
 * Lista todas as mensagens
 */
export async function getMessages(
  client?: ProPresenterClient
): Promise<Message[]> {
  const pp = client ?? getProPresenterClient()
  return pp.get<Message[]>("/v1/messages")
}

/**
 * Exibe uma mensagem
 */
export async function showMessage(
  messageId: string,
  tokens?: Record<string, string>,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post(`/v1/message/${encodeURIComponent(messageId)}/trigger`, {
    tokens: tokens
      ? Object.entries(tokens).map(([name, text]) => ({ name, text: { text } }))
      : undefined,
  })
}

/**
 * Esconde a mensagem ativa
 */
export async function hideMessage(
  messageId: string,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.delete(`/v1/message/${encodeURIComponent(messageId)}`)
}

// ============================================================================
// Timers
// ============================================================================

/**
 * Lista todos os timers
 */
export async function getTimers(
  client?: ProPresenterClient
): Promise<Timer[]> {
  const pp = client ?? getProPresenterClient()
  return pp.get<Timer[]>("/v1/timers")
}

/**
 * Obtem estado de um timer
 */
export async function getTimerState(
  timerId: string,
  client?: ProPresenterClient
): Promise<TimerState> {
  const pp = client ?? getProPresenterClient()
  return pp.get<TimerState>(`/v1/timer/${encodeURIComponent(timerId)}`)
}

/**
 * Inicia um timer
 */
export async function startTimer(
  timerId: string,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post(`/v1/timer/${encodeURIComponent(timerId)}/start`)
}

/**
 * Para um timer
 */
export async function stopTimer(
  timerId: string,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post(`/v1/timer/${encodeURIComponent(timerId)}/stop`)
}

/**
 * Reseta um timer
 */
export async function resetTimer(
  timerId: string,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post(`/v1/timer/${encodeURIComponent(timerId)}/reset`)
}

// ============================================================================
// Media
// ============================================================================

/**
 * Lista itens de media disponiveis
 */
export async function getMediaItems(
  client?: ProPresenterClient
): Promise<MediaItem[]> {
  const pp = client ?? getProPresenterClient()
  return pp.get<MediaItem[]>("/v1/media")
}

/**
 * Dispara um item de media
 */
export async function triggerMedia(
  mediaId: string,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post(`/v1/media/${encodeURIComponent(mediaId)}/trigger`)
}

// ============================================================================
// Stage Display
// ============================================================================

/**
 * Obtem layouts de stage display
 */
export async function getStageDisplayLayouts(
  client?: ProPresenterClient
): Promise<unknown[]> {
  const pp = client ?? getProPresenterClient()
  return pp.get<unknown[]>("/v1/stage/layouts")
}

/**
 * Define o layout de stage display
 */
export async function setStageDisplayLayout(
  layoutId: string,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.put(`/v1/stage/layout/${encodeURIComponent(layoutId)}`)
}

// ============================================================================
// Pesquisa
// ============================================================================

/**
 * Busca apresentacoes por nome
 */
export async function searchPresentations(
  query: string,
  client?: ProPresenterClient
): Promise<LibraryItem[]> {
  const presentations = await getLibraryPresentations(client)
  const lowerQuery = query.toLowerCase()

  return presentations.filter((item) =>
    item.name.toLowerCase().includes(lowerQuery)
  )
}
