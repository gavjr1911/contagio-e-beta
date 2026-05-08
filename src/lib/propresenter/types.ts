/**
 * ProPresenter API Types
 *
 * Tipos TypeScript para a API do ProPresenter 7.9+
 *
 * IMPORTANTE: O ProPresenter precisa estar com a API habilitada em:
 * Settings > Network > Enable Network
 *
 * A porta padrao e 1025 para HTTP e WebSocket.
 */

// ============================================================================
// Configuracao
// ============================================================================

export interface ProPresenterConfig {
  host: string
  port: number
  protocol?: "http" | "https"
  timeout?: number
  maxRetries?: number
  retryDelay?: number
}

export const DEFAULT_CONFIG: ProPresenterConfig = {
  host: "localhost",
  port: 1025,
  protocol: "http",
  timeout: 10000,
  maxRetries: 3,
  retryDelay: 1000,
}

// ============================================================================
// Status e Conexao
// ============================================================================

export type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error"

export interface ConnectionState {
  status: ConnectionStatus
  lastConnected?: Date
  lastError?: string
  version?: string
}

export interface ProPresenterVersion {
  name: string
  version: string
  platform: string
}

// ============================================================================
// Apresentacao (Presentation)
// ============================================================================

export interface Presentation {
  id: {
    uuid: string
    name: string
    index: number
  }
  groups?: SlideGroup[]
}

export interface PresentationMetadata {
  id: {
    uuid: string
    name: string
    index: number
  }
  has_timeline?: boolean
  presentation_path?: string
  destination?: string
}

export interface SlideGroup {
  name: string
  color?: GroupColor
  slides: Slide[]
}

export interface GroupColor {
  red: number
  green: number
  blue: number
  alpha: number
}

export interface Slide {
  enabled: boolean
  notes?: string
  text?: string
  label?: string
  size?: {
    width: number
    height: number
  }
}

export interface ActiveSlide {
  presentation?: PresentationMetadata
  slide?: {
    index: number
    uuid?: string
  }
}

// ============================================================================
// Biblioteca (Library)
// ============================================================================

export interface Library {
  uuid: string
  name: string
  index: number
  items?: LibraryItem[]
  update_type?: string
}

export interface LibraryItem {
  uuid: string
  name: string
  index: number
  is_presentation?: boolean
  is_media?: boolean
  is_playlist?: boolean
}

export interface LibraryPresentation {
  uuid: string
  name: string
  path?: string
}

// ============================================================================
// Playlist
// ============================================================================

export interface Playlist {
  id: {
    uuid: string
    name: string
    index: number
  }
  field_type?: string
  type?: PlaylistType
  items?: PlaylistItem[]
  children?: PlaylistItem[]
}

export type PlaylistType = "playlist" | "group" | "smart_playlist"

export interface PlaylistItem {
  id: {
    uuid: string
    name: string
    index: number
  }
  type?: PlaylistItemType
  is_hidden?: boolean
  is_pco?: boolean
  arrangement_id?: string
}

export type PlaylistItemType = "presentation" | "media" | "audio" | "video" | "image" | "header" | "placeholder"

export interface PlaylistCreateRequest {
  name: string
  type?: PlaylistType
  items?: PlaylistItemCreateRequest[]
}

export interface PlaylistItemCreateRequest {
  id: string
  type: PlaylistItemType
}

// ============================================================================
// Triggers e Controles
// ============================================================================

export interface TriggerSlideRequest {
  presentation_uuid: string
  slide_index: number
}

export interface TriggerCueRequest {
  index: number
  presentation_uuid?: string
}

export interface TriggerResponse {
  result: "success" | "error"
  message?: string
}

// ============================================================================
// Media
// ============================================================================

export interface MediaItem {
  id: {
    uuid: string
    name: string
    index: number
  }
  type: MediaType
  duration?: number
  path?: string
}

export type MediaType = "video" | "audio" | "image"

// ============================================================================
// Mensagens e Alertas
// ============================================================================

export interface Message {
  id: {
    uuid: string
    name: string
    index: number
  }
  tokens?: MessageToken[]
}

export interface MessageToken {
  name: string
  text: {
    text: string
  }
}

// ============================================================================
// Timers
// ============================================================================

export interface Timer {
  id: {
    uuid: string
    name: string
    index: number
  }
  allows_overrun?: boolean
  countdown?: {
    duration: number
  }
  count_up?: boolean
  elapsed_time?: number
}

export interface TimerState {
  is_running: boolean
  elapsed_time: number
  remaining_time?: number
}

// ============================================================================
// Looks
// ============================================================================

export interface Look {
  id: {
    uuid: string
    name: string
    index: number
  }
}

// ============================================================================
// WebSocket Events
// ============================================================================

export type WebSocketEventType =
  | "slideChanged"
  | "presentationChanged"
  | "playlistChanged"
  | "timerUpdated"
  | "clockUpdated"
  | "stageDisplayChanged"
  | "connected"
  | "disconnected"
  | "error"

export interface WebSocketEvent {
  type: WebSocketEventType
  data?: unknown
  timestamp: Date
}

export interface SlideChangedEvent extends WebSocketEvent {
  type: "slideChanged"
  data: {
    presentation_uuid?: string
    slide_index: number
    slide_uuid?: string
  }
}

export interface PresentationChangedEvent extends WebSocketEvent {
  type: "presentationChanged"
  data: {
    presentation: PresentationMetadata
  }
}

// ============================================================================
// Sincronizacao
// ============================================================================

export interface SyncResult {
  success: boolean
  synced: number
  created: number
  updated: number
  skipped: number
  errors: SyncError[]
}

export interface SyncError {
  item: string
  error: string
}

export interface SongMapping {
  songId: string
  presentationId: string
  presentationName: string
  mappedAt: Date
}

// ============================================================================
// API Responses
// ============================================================================

export interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ============================================================================
// Erros
// ============================================================================

export class ProPresenterError extends Error {
  constructor(
    message: string,
    public code: ProPresenterErrorCode,
    public originalError?: unknown
  ) {
    super(message)
    this.name = "ProPresenterError"
  }
}

export type ProPresenterErrorCode =
  | "CONNECTION_FAILED"
  | "CONNECTION_TIMEOUT"
  | "API_ERROR"
  | "INVALID_RESPONSE"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "WEBSOCKET_ERROR"
  | "SYNC_ERROR"
