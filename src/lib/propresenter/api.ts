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
  return pp.get<Library[]>("/libraries")
}

/**
 * Obtem itens de uma biblioteca especifica
 */
export async function getLibrary(
  libraryId: string,
  client?: ProPresenterClient
): Promise<Library> {
  const pp = client ?? getProPresenterClient()
  return pp.get<Library>(`/library/${encodeURIComponent(libraryId)}`)
}

/**
 * Lista todas as apresentacoes da biblioteca
 */
export async function getLibraryPresentations(
  client?: ProPresenterClient
): Promise<LibraryItem[]> {
  const pp = client ?? getProPresenterClient()
  const libraries = await getLibraries(pp)

  const presentations: LibraryItem[] = []

  for (const library of libraries) {
    if (library.items) {
      presentations.push(
        ...library.items.filter((item) => item.is_presentation)
      )
    }
  }

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
  return pp.get<Playlist[]>("/playlists")
}

/**
 * Obtem detalhes de uma playlist especifica
 */
export async function getPlaylist(
  playlistId: string,
  client?: ProPresenterClient
): Promise<Playlist> {
  const pp = client ?? getProPresenterClient()
  return pp.get<Playlist>(`/playlist/${encodeURIComponent(playlistId)}`)
}

/**
 * Obtem a playlist ativa
 */
export async function getActivePlaylist(
  client?: ProPresenterClient
): Promise<Playlist | null> {
  const pp = client ?? getProPresenterClient()
  try {
    return await pp.get<Playlist>("/playlist/active")
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
  return pp.post<Playlist>("/playlists", {
    name,
    type: "playlist",
    items: items ?? [],
  })
}

/**
 * Adiciona um item a uma playlist
 */
export async function addPlaylistItem(
  playlistId: string,
  item: { id: string; type: string },
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post(`/playlist/${encodeURIComponent(playlistId)}/items`, item)
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
    `/playlist/${encodeURIComponent(playlistId)}/item/${itemIndex}`
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
  await pp.delete(`/playlist/${encodeURIComponent(playlistId)}`)
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
    return await pp.get<PresentationMetadata>("/presentation/active")
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
    `/presentation/${encodeURIComponent(presentationId)}`
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
    return await pp.get<ActiveSlide>("/presentation/slide_index")
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
    `/presentation/${encodeURIComponent(presentationId)}/trigger/slide/${slideIndex}`
  )
}

/**
 * Vai para o proximo slide
 */
export async function triggerNext(
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post("/trigger/next")
}

/**
 * Volta para o slide anterior
 */
export async function triggerPrevious(
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post("/trigger/previous")
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
    `/playlist/${encodeURIComponent(playlistId)}/item/${itemIndex}/trigger`
  )
}

/**
 * Limpa o slide atual (tela em branco)
 */
export async function clearSlide(
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post("/clear/slide")
}

/**
 * Limpa todos os layers
 */
export async function clearAll(
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post("/clear/all")
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
  return pp.get<Look[]>("/looks")
}

/**
 * Obtem o look ativo
 */
export async function getActiveLook(
  client?: ProPresenterClient
): Promise<Look | null> {
  const pp = client ?? getProPresenterClient()
  try {
    return await pp.get<Look>("/look/active")
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
  await pp.post(`/look/${encodeURIComponent(lookId)}/trigger`)
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
  return pp.get<Message[]>("/messages")
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
  await pp.post(`/message/${encodeURIComponent(messageId)}/trigger`, {
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
  await pp.delete(`/message/${encodeURIComponent(messageId)}`)
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
  return pp.get<Timer[]>("/timers")
}

/**
 * Obtem estado de um timer
 */
export async function getTimerState(
  timerId: string,
  client?: ProPresenterClient
): Promise<TimerState> {
  const pp = client ?? getProPresenterClient()
  return pp.get<TimerState>(`/timer/${encodeURIComponent(timerId)}`)
}

/**
 * Inicia um timer
 */
export async function startTimer(
  timerId: string,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post(`/timer/${encodeURIComponent(timerId)}/start`)
}

/**
 * Para um timer
 */
export async function stopTimer(
  timerId: string,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post(`/timer/${encodeURIComponent(timerId)}/stop`)
}

/**
 * Reseta um timer
 */
export async function resetTimer(
  timerId: string,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post(`/timer/${encodeURIComponent(timerId)}/reset`)
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
  return pp.get<MediaItem[]>("/media")
}

/**
 * Dispara um item de media
 */
export async function triggerMedia(
  mediaId: string,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.post(`/media/${encodeURIComponent(mediaId)}/trigger`)
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
  return pp.get<unknown[]>("/stage/layouts")
}

/**
 * Define o layout de stage display
 */
export async function setStageDisplayLayout(
  layoutId: string,
  client?: ProPresenterClient
): Promise<void> {
  const pp = client ?? getProPresenterClient()
  await pp.put(`/stage/layout/${encodeURIComponent(layoutId)}`)
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
    item.id.name.toLowerCase().includes(lowerQuery)
  )
}
