"use client"

import * as React from "react"
import { Wifi, WifiOff, RefreshCw, Settings, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ConnectionStatusProps {
  className?: string
  showSettings?: boolean
  onConnectionChange?: (connected: boolean) => void
}

interface StatusData {
  connected: boolean
  version?: {
    name: string
    version: string
  }
  state: {
    status: string
    lastConnected?: string
    lastError?: string
  }
  config: {
    host: string
    port: number
  }
  error?: string
}

export function ProPresenterConnectionStatus({
  className,
  showSettings = true,
  onConnectionChange,
}: ConnectionStatusProps) {
  const [status, setStatus] = React.useState<StatusData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [reconnecting, setReconnecting] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [host, setHost] = React.useState("localhost")
  const [port, setPort] = React.useState("1025")

  const checkConnection = React.useCallback(async (hostOverride?: string, portOverride?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (hostOverride) params.set("host", hostOverride)
      if (portOverride) params.set("port", portOverride)

      const response = await fetch(`/api/propresenter/status?${params}`)
      const data = await response.json() as StatusData
      setStatus(data)
      setHost(data.config.host)
      setPort(String(data.config.port))
      onConnectionChange?.(data.connected)
    } catch (error) {
      setStatus({
        connected: false,
        state: { status: "error", lastError: "Falha ao verificar conexao" },
        config: { host: hostOverride || host, port: parseInt(portOverride || port, 10) },
      })
      onConnectionChange?.(false)
    } finally {
      setLoading(false)
    }
  }, [host, port, onConnectionChange])

  React.useEffect(() => {
    checkConnection()

    // Verifica conexao a cada 30 segundos
    const interval = setInterval(() => {
      checkConnection()
    }, 30000)

    return () => clearInterval(interval)
  }, [checkConnection])

  const handleReconnect = async () => {
    setReconnecting(true)
    await checkConnection()
    setReconnecting(false)
  }

  const handleSaveSettings = async () => {
    setSettingsOpen(false)
    setReconnecting(true)
    await checkConnection(host, port)
    setReconnecting(false)
  }

  const statusColor = status?.connected
    ? "bg-green-500"
    : status?.state.status === "error"
    ? "bg-red-500"
    : "bg-yellow-500"

  const statusText = status?.connected
    ? "Conectado"
    : status?.state.status === "error"
    ? "Erro"
    : "Desconectado"

  if (loading && !status) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Verificando conexao...</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        {status?.connected ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-muted-foreground" />
        )}
        <div className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", statusColor)} />
          <span className="text-sm font-medium">{statusText}</span>
        </div>
        {status?.version && (
          <Badge variant="secondary" className="text-xs">
            v{status.version.version}
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleReconnect}
          disabled={reconnecting}
          title="Reconectar"
        >
          <RefreshCw className={cn("h-4 w-4", reconnecting && "animate-spin")} />
        </Button>

        {showSettings && (
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Configuracoes">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configuracoes do ProPresenter</DialogTitle>
                <DialogDescription>
                  Configure a conexao com o ProPresenter. O ProPresenter precisa estar com a API
                  habilitada em Settings &gt; Network.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="localhost"
                  />
                  <p className="text-xs text-muted-foreground">
                    IP ou hostname do computador com ProPresenter
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="port">Porta</Label>
                  <Input
                    id="port"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="1025"
                  />
                  <p className="text-xs text-muted-foreground">
                    Porta da API (padrao: 1025)
                  </p>
                </div>

                {status?.state.lastError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {status.state.lastError}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveSettings} disabled={reconnecting}>
                  {reconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar e Reconectar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}

// Versao compacta para uso em barras de status
export function ProPresenterStatusBadge({
  className,
}: {
  className?: string
}) {
  const [connected, setConnected] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/propresenter/status")
        const data = await response.json() as StatusData
        setConnected(data.connected)
      } catch {
        setConnected(false)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (connected === null) {
    return null
  }

  return (
    <Badge
      variant={connected ? "default" : "secondary"}
      className={cn(
        "gap-1.5",
        connected ? "bg-green-500 hover:bg-green-600" : "",
        className
      )}
    >
      {connected ? (
        <Wifi className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      ProPresenter
    </Badge>
  )
}
