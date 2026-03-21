/**
 * ProPresenter Integration Module
 *
 * Modulo de integracao com o ProPresenter 7.9+
 *
 * IMPORTANTE: O ProPresenter precisa estar com a API habilitada em:
 * Settings > Network > Enable Network
 *
 * A porta padrao e 1025 para HTTP e WebSocket.
 *
 * Exemplo de uso:
 *
 * ```typescript
 * import { getProPresenterClient } from "@/lib/propresenter"
 *
 * const client = getProPresenterClient({
 *   host: "localhost",
 *   port: 1025,
 * })
 *
 * // Testar conexao
 * const connected = await checkConnection(client)
 *
 * // Listar biblioteca
 * const presentations = await getLibraryPresentations(client)
 *
 * // Sincronizar musicas
 * const result = await syncSongsFromLibrary({ dryRun: false }, client)
 *
 * // Exportar setlist
 * const exportResult = await exportSetlistToPlaylist(eventId, {}, client)
 * ```
 */

// Client
export {
  ProPresenterClient,
  getProPresenterClient,
  resetProPresenterClient,
} from "./client"

// Types
export * from "./types"

// API Functions
export {
  // Status
  getVersion,
  checkConnection,
  // Library
  getLibraries,
  getLibrary,
  getLibraryPresentations,
  // Playlists
  getPlaylists,
  getPlaylist,
  getActivePlaylist,
  createPlaylist,
  addPlaylistItem,
  removePlaylistItem,
  deletePlaylist,
  // Presentations
  getCurrentPresentation,
  getPresentation,
  getActiveSlide,
  // Triggers
  triggerSlide,
  triggerNext,
  triggerPrevious,
  triggerPlaylistItem,
  clearSlide,
  clearAll,
  // Looks
  getLooks,
  getActiveLook,
  triggerLook,
  // Messages
  getMessages,
  showMessage,
  hideMessage,
  // Timers
  getTimers,
  getTimerState,
  startTimer,
  stopTimer,
  resetTimer,
  // Media
  getMediaItems,
  triggerMedia,
  // Stage Display
  getStageDisplayLayouts,
  setStageDisplayLayout,
  // Search
  searchPresentations,
} from "./api"

// Sync Functions
export {
  syncSongsFromLibrary,
  getSyncPreview,
  exportSetlistToPlaylist,
  mapSongToPresentation,
  unmapSong,
  getMappedSongs,
  getUnmappedSongs,
  findMatchingPresentations,
  autoMapSongs,
} from "./sync"
