"use client"

import * as React from "react"
import {
  Download,
  Upload,
  Music,
  ArrowRight,
  Check,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SyncPreview {
  toCreate: { id: string; name: string }[]
  toUpdate: { song: { id: string; name: string }; presentation: { id: string; name: string } }[]
  toSkip: { id: string; name: string }[]
}

interface SyncSummary {
  totalPresentations: number
  toCreate: number
  toUpdate: number
  alreadySynced: number
}

interface SyncResult {
  success: boolean
  mode: string
  synced?: number
  created?: number
  updated?: number
  skipped?: number
  errors?: { item: string; error: string }[]
}

interface ProPresenterSyncDialogProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSyncComplete?: (result: SyncResult) => void
}

type SyncStep = "preview" | "syncing" | "complete"

export function ProPresenterSyncDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSyncComplete,
}: ProPresenterSyncDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [step, setStep] = React.useState<SyncStep>("preview")
  const [loading, setLoading] = React.useState(false)
  const [preview, setPreview] = React.useState<SyncPreview | null>(null)
  const [summary, setSummary] = React.useState<SyncSummary | null>(null)
  const [result, setResult] = React.useState<SyncResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const loadPreview = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/propresenter/sync")

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || data.error || "Erro ao carregar preview")
      }

      const data = await response.json()
      setPreview(data.preview)
      setSummary(data.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar preview")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (open) {
      setStep("preview")
      setResult(null)
      loadPreview()
    }
  }, [open, loadPreview])

  const handleSync = async () => {
    setStep("syncing")
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/propresenter/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || data.error || "Erro na sincronização")
      }

      const data = await response.json() as SyncResult
      setResult(data)
      setStep("complete")
      onSyncComplete?.(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na sincronização")
      setStep("preview")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    // Reset state apos fechar
    setTimeout(() => {
      setStep("preview")
      setResult(null)
      setError(null)
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Sincronizar ProPresenter
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Sincronizar Músicas do ProPresenter
          </DialogTitle>
          <DialogDescription>
            Importe músicas da biblioteca do ProPresenter ou vincule músicas existentes.
          </DialogDescription>
        </DialogHeader>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Erro</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === "preview" && (
          <>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">
                  Carregando biblioteca do ProPresenter...
                </p>
              </div>
            ) : preview && summary ? (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Novas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-green-600">
                        {summary.toCreate}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Atualizar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-blue-600">
                        {summary.toUpdate}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Sincronizadas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-muted-foreground">
                        {summary.alreadySynced}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Preview Lists */}
                {preview.toCreate.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Badge variant="default" className="bg-green-500">
                        Criar
                      </Badge>
                      Novas músicas a serem criadas
                    </h4>
                    <div className="max-h-32 overflow-y-auto rounded-md border p-2">
                      <ul className="space-y-1 text-sm">
                        {preview.toCreate.slice(0, 10).map((item) => (
                          <li key={item.id} className="flex items-center gap-2">
                            <Music className="h-3 w-3 text-muted-foreground" />
                            {item.name}
                          </li>
                        ))}
                        {preview.toCreate.length > 10 && (
                          <li className="text-muted-foreground">
                            ... e mais {preview.toCreate.length - 10} músicas
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {preview.toUpdate.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Badge variant="default" className="bg-blue-500">
                        Vincular
                      </Badge>
                      Músicas existentes a serem vinculadas
                    </h4>
                    <div className="max-h-32 overflow-y-auto rounded-md border p-2">
                      <ul className="space-y-1 text-sm">
                        {preview.toUpdate.slice(0, 10).map((item) => (
                          <li key={item.song.id} className="flex items-center gap-2">
                            <span className="text-muted-foreground">{item.song.name}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span>{item.presentation.name}</span>
                          </li>
                        ))}
                        {preview.toUpdate.length > 10 && (
                          <li className="text-muted-foreground">
                            ... e mais {preview.toUpdate.length - 10} vínculos
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {preview.toCreate.length === 0 && preview.toUpdate.length === 0 && (
                  <div className="rounded-md bg-muted p-4 text-center">
                    <Check className="mx-auto h-8 w-8 text-green-500" />
                    <p className="mt-2 font-medium">Tudo sincronizado!</p>
                    <p className="text-sm text-muted-foreground">
                      Todas as músicas do ProPresenter já estão sincronizadas.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => loadPreview()} disabled={loading}>
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                Recarregar
              </Button>
              <Button
                onClick={handleSync}
                disabled={
                  loading ||
                  !preview ||
                  (preview.toCreate.length === 0 && preview.toUpdate.length === 0)
                }
              >
                <Download className="mr-2 h-4 w-4" />
                Sincronizar
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Syncing Step */}
        {step === "syncing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg font-medium">Sincronizando...</p>
            <p className="text-muted-foreground">
              Importando músicas do ProPresenter
            </p>
          </div>
        )}

        {/* Complete Step */}
        {step === "complete" && result && (
          <>
            <div className="flex flex-col items-center py-8">
              {result.success ? (
                <>
                  <div className="rounded-full bg-green-100 p-3">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="mt-4 text-lg font-medium">Sincronização concluída!</p>
                </>
              ) : (
                <>
                  <div className="rounded-full bg-red-100 p-3">
                    <X className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="mt-4 text-lg font-medium">Sincronização com erros</p>
                </>
              )}

              <div className="mt-6 grid grid-cols-3 gap-8 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{result.created ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Criadas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{result.updated ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Atualizadas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-muted-foreground">{result.skipped ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Ignoradas</p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-6 w-full">
                  <h4 className="text-sm font-medium text-destructive mb-2">
                    Erros ({result.errors.length})
                  </h4>
                  <div className="max-h-24 overflow-y-auto rounded-md border border-destructive/20 bg-destructive/5 p-2">
                    <ul className="space-y-1 text-sm">
                      {result.errors.map((err, i) => (
                        <li key={i} className="text-destructive">
                          {err.item}: {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Botao de sincronização rapida
export function ProPresenterQuickSync({
  className,
  onComplete,
}: {
  className?: string
  onComplete?: (result: SyncResult) => void
}) {
  const [loading, setLoading] = React.useState(false)

  const handleSync = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/propresenter/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      })
      const data = await response.json() as SyncResult
      onComplete?.(data)
    } catch {
      onComplete?.({
        success: false,
        mode: "sync",
        errors: [{ item: "sync", error: "Falha na sincronização" }],
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("gap-2", className)}
      onClick={handleSync}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Sincronizar
    </Button>
  )
}
