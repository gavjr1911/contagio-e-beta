/**
 * ProPresenter Client
 *
 * Cliente HTTP e WebSocket para conectar ao ProPresenter 7.9+
 *
 * IMPORTANTE: O ProPresenter precisa estar com a API habilitada em:
 * Settings > Network > Enable Network
 *
 * A porta padrao e 1025 para HTTP e WebSocket.
 */

import {
  type ProPresenterConfig,
  type ConnectionState,
  type WebSocketEvent,
  type WebSocketEventType,
  type ProPresenterVersion,
  DEFAULT_CONFIG,
  ProPresenterError,
} from "./types"

type WebSocketEventCallback = (event: WebSocketEvent) => void

export class ProPresenterClient {
  private config: ProPresenterConfig
  private ws: WebSocket | null = null
  private connectionState: ConnectionState = { status: "disconnected" }
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private eventListeners: Map<WebSocketEventType, Set<WebSocketEventCallback>> = new Map()
  private reconnectAttempts = 0

  constructor(config: Partial<ProPresenterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ============================================================================
  // Configuracao
  // ============================================================================

  getConfig(): ProPresenterConfig {
    return { ...this.config }
  }

  setConfig(config: Partial<ProPresenterConfig>): void {
    this.config = { ...this.config, ...config }
  }

  private get baseUrl(): string {
    return `${this.config.protocol}://${this.config.host}:${this.config.port}/v1`
  }

  private get wsUrl(): string {
    const wsProtocol = this.config.protocol === "https" ? "wss" : "ws"
    return `${wsProtocol}://${this.config.host}:${this.config.port}/v1/status/updates`
  }

  // ============================================================================
  // Estado da Conexao
  // ============================================================================

  getConnectionState(): ConnectionState {
    return { ...this.connectionState }
  }

  isConnected(): boolean {
    return this.connectionState.status === "connected"
  }

  // ============================================================================
  // HTTP Client
  // ============================================================================

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout
    )

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 404) {
          throw new ProPresenterError(
            `Endpoint nao encontrado: ${endpoint}`,
            "NOT_FOUND"
          )
        }
        if (response.status === 401 || response.status === 403) {
          throw new ProPresenterError(
            "Nao autorizado",
            "UNAUTHORIZED"
          )
        }
        throw new ProPresenterError(
          `Erro na API: ${response.status} ${response.statusText}`,
          "API_ERROR"
        )
      }

      // Algumas respostas podem ser vazias
      const text = await response.text()
      if (!text) {
        return {} as T
      }

      try {
        return JSON.parse(text) as T
      } catch {
        throw new ProPresenterError(
          "Resposta invalida do servidor",
          "INVALID_RESPONSE"
        )
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof ProPresenterError) {
        throw error
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ProPresenterError(
          "Timeout na conexao",
          "CONNECTION_TIMEOUT",
          error
        )
      }

      throw new ProPresenterError(
        "Falha na conexao com o ProPresenter",
        "CONNECTION_FAILED",
        error
      )
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" })
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" })
  }

  // ============================================================================
  // Retry Logic
  // ============================================================================

  async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    let lastError: ProPresenterError | null = null

    for (let attempt = 0; attempt <= (this.config.maxRetries ?? 3); attempt++) {
      try {
        return await this.request<T>(endpoint, options)
      } catch (error) {
        if (error instanceof ProPresenterError) {
          lastError = error

          // Nao retry em erros de autorizacao ou not found
          if (
            error.code === "UNAUTHORIZED" ||
            error.code === "NOT_FOUND" ||
            error.code === "INVALID_RESPONSE"
          ) {
            throw error
          }

          // Aguarda antes de tentar novamente
          if (attempt < (this.config.maxRetries ?? 3)) {
            await this.delay(this.config.retryDelay ?? 1000)
          }
        } else {
          throw error
        }
      }
    }

    throw lastError ?? new ProPresenterError(
      "Falha apos multiplas tentativas",
      "CONNECTION_FAILED"
    )
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // ============================================================================
  // Teste de Conexao
  // ============================================================================

  async testConnection(): Promise<ProPresenterVersion> {
    try {
      const version = await this.get<ProPresenterVersion>("/version")
      this.connectionState = {
        status: "connected",
        lastConnected: new Date(),
        version: version.version,
      }
      return version
    } catch (error) {
      this.connectionState = {
        status: "error",
        lastError:
          error instanceof ProPresenterError
            ? error.message
            : "Erro desconhecido",
      }
      throw error
    }
  }

  // ============================================================================
  // WebSocket
  // ============================================================================

  connectWebSocket(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.connectionState = { ...this.connectionState, status: "connecting" }
    this.emitEvent({ type: "connecting" as WebSocketEventType, timestamp: new Date() })

    try {
      this.ws = new WebSocket(this.wsUrl)

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        this.connectionState = {
          status: "connected",
          lastConnected: new Date(),
        }
        this.emitEvent({ type: "connected", timestamp: new Date() })
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleWebSocketMessage(data)
        } catch {
          console.error("Erro ao processar mensagem WebSocket")
        }
      }

      this.ws.onerror = () => {
        this.connectionState = {
          ...this.connectionState,
          status: "error",
          lastError: "Erro na conexao WebSocket",
        }
        this.emitEvent({
          type: "error",
          data: { message: "Erro na conexao WebSocket" },
          timestamp: new Date(),
        })
      }

      this.ws.onclose = () => {
        this.connectionState = {
          ...this.connectionState,
          status: "disconnected",
        }
        this.emitEvent({ type: "disconnected", timestamp: new Date() })
        this.scheduleReconnect()
      }
    } catch (error) {
      this.connectionState = {
        status: "error",
        lastError: "Falha ao criar conexao WebSocket",
      }
      throw new ProPresenterError(
        "Falha ao conectar WebSocket",
        "WEBSOCKET_ERROR",
        error
      )
    }
  }

  disconnectWebSocket(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.connectionState = { status: "disconnected" }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxRetries ?? 3)) {
      this.connectionState = {
        ...this.connectionState,
        status: "error",
        lastError: "Maximo de tentativas de reconexao atingido",
      }
      return
    }

    const delay = (this.config.retryDelay ?? 1000) * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket()
    }, delay)
  }

  private handleWebSocketMessage(data: Record<string, unknown>): void {
    // O ProPresenter envia diferentes tipos de eventos
    // Mapeamos para nossos tipos internos
    const eventTypeMap: Record<string, WebSocketEventType> = {
      slide: "slideChanged",
      presentation: "presentationChanged",
      playlist: "playlistChanged",
      timer: "timerUpdated",
      clock: "clockUpdated",
      stage_display: "stageDisplayChanged",
    }

    const url = data.url as string | undefined
    if (!url) return

    for (const [key, type] of Object.entries(eventTypeMap)) {
      if (url.includes(key)) {
        this.emitEvent({
          type,
          data,
          timestamp: new Date(),
        })
        break
      }
    }
  }

  // ============================================================================
  // Event Listeners
  // ============================================================================

  on(type: WebSocketEventType, callback: WebSocketEventCallback): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set())
    }
    this.eventListeners.get(type)!.add(callback)

    // Retorna funcao para remover o listener
    return () => {
      this.eventListeners.get(type)?.delete(callback)
    }
  }

  off(type: WebSocketEventType, callback: WebSocketEventCallback): void {
    this.eventListeners.get(type)?.delete(callback)
  }

  private emitEvent(event: WebSocketEvent): void {
    const listeners = this.eventListeners.get(event.type)
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(event)
        } catch (error) {
          console.error("Erro no listener de evento:", error)
        }
      })
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  dispose(): void {
    this.disconnectWebSocket()
    this.eventListeners.clear()
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientInstance: ProPresenterClient | null = null

export function getProPresenterClient(
  config?: Partial<ProPresenterConfig>
): ProPresenterClient {
  if (!clientInstance) {
    clientInstance = new ProPresenterClient(config)
  } else if (config) {
    clientInstance.setConfig(config)
  }
  return clientInstance
}

export function resetProPresenterClient(): void {
  if (clientInstance) {
    clientInstance.dispose()
    clientInstance = null
  }
}
