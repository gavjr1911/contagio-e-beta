"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Upload, X, FileIcon, ImageIcon, VideoIcon, FileTextIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  useUploadMedia,
  formatFileSize,
  getAllowedExtensions,
  validateMediaFile,
} from "@/hooks/use-media"
import { describeLimits, getMediaTypeFromMime, resolveContentType } from "@/lib/media/constants"
import { cn } from "@/lib/utils"

interface MediaUploadProps {
  eventId: string
  eventItemId?: string
  category?: "ANNOUNCEMENTS" | "PREACHING" | "OTHER"
  onUploadComplete?: () => void
  disabled?: boolean
  /** Avisa o pai para travar o fechamento do diálogo enquanto há envio ativo. */
  onUploadingChange?: (uploading: boolean) => void
}

interface FileWithProgress {
  /** Identidade estável: indexar por posição fazia o progresso ir para a linha
   *  errada quando um arquivo era removido durante um lote. */
  id: string
  file: File
  progress: number
  status: "pending" | "uploading" | "finalizing" | "complete" | "error" | "canceled"
  error?: string
  etaSeconds?: number | null
  bytesPerSecond?: number
  /** Sem bytes novos há mais de um minuto: a barra parada tem explicação. */
  stalled?: boolean
  controller?: AbortController
}

function formatEta(seconds: number): string {
  // Arredondar para cima evita a impressão de precisão que a estimativa não tem.
  if (seconds < 60) return "menos de 1 min restante"
  const min = Math.ceil(seconds / 60)
  return `cerca de ${min} min restante${min > 1 ? "s" : ""}`
}

function formatSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond)}/s`
}

let fileCounter = 0

export function MediaUpload({
  eventId,
  eventItemId,
  category = "OTHER",
  onUploadComplete,
  disabled = false,
  onUploadingChange,
}: MediaUploadProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const uploadMutation = useUploadMedia()

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const validFiles: FileWithProgress[] = Array.from(newFiles).map((file) => {
      const result = validateMediaFile(file)
      return {
        id: `f${++fileCounter}`,
        file,
        progress: 0,
        status: result.ok ? ("pending" as const) : ("error" as const),
        error: result.ok ? undefined : result.error,
      }
    })

    setFiles((prev) => [...prev, ...validFiles])
  }, [])

  // Ids removidos durante um lote em andamento. `uploadAllPending` percorre um
  // snapshot da lista, então sem isto um arquivo removido enquanto a fila roda
  // ainda seria enviado e registrado — e a tela não mostraria nada, porque a
  // linha correspondente já não existe.
  const removidosRef = useRef<Set<string>>(new Set())

  const removeFile = useCallback((id: string) => {
    removidosRef.current.add(id)
    setFiles((prev) => {
      // Cancela o envio em andamento antes de tirar da lista.
      prev.find((f) => f.id === id)?.controller?.abort()
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  const cancelFile = useCallback((id: string) => {
    setFiles((prev) => {
      prev.find((f) => f.id === id)?.controller?.abort()
      return prev
    })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const droppedFiles = e.dataTransfer.files
      if (droppedFiles.length > 0) {
        addFiles(droppedFiles)
      }
    },
    [addFiles, disabled]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files
      if (selectedFiles && selectedFiles.length > 0) {
        addFiles(selectedFiles)
      }
      // Reset input
      e.target.value = ""
    },
    [addFiles]
  )

  const uploadFile = async (fileWithProgress: FileWithProgress) => {
    if (fileWithProgress.status !== "pending") return

    const { id } = fileWithProgress
    if (removidosRef.current.has(id)) return
    const controller = new AbortController()
    const patch = (data: Partial<FileWithProgress>) =>
      setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...data } : f)))

    patch({ status: "uploading", progress: 0, controller, error: undefined, stalled: false })

    // Marca "sem progresso" antes de o watchdog do upload desistir, para o
    // usuário entender uma barra parada em vez de encarar o silêncio.
    let ultimoAvanco = Date.now()
    const vigia = setInterval(() => {
      patch({ stalled: Date.now() - ultimoAvanco > 20_000 })
    }, 5000)

    try {
      await uploadMutation.mutateAsync({
        file: fileWithProgress.file,
        eventId,
        eventItemId,
        category,
        signal: controller.signal,
        onPhase: (phase) => patch({ status: phase, stalled: false }),
        onProgress: (progress, info) => {
          ultimoAvanco = Date.now()
          patch({
            progress,
            etaSeconds: info?.etaSeconds ?? null,
            bytesPerSecond: info?.bytesPerSecond,
            stalled: false,
          })
        },
      })

      patch({ status: "complete", progress: 100, controller: undefined, etaSeconds: null, stalled: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao enviar"
      patch({
        status: controller.signal.aborted ? "canceled" : "error",
        error: message,
        controller: undefined,
        etaSeconds: null,
        stalled: false,
      })
    } finally {
      clearInterval(vigia)
    }
  }

  /** Recoloca na fila um arquivo que falhou, sem obrigar a reselecionar do disco. */
  const retryFile = (id: string) => {
    removidosRef.current.delete(id)
    const alvo = files.find((f) => f.id === id)
    if (!alvo) return
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status: "pending" as const, progress: 0, error: undefined } : f
      )
    )
    void uploadFile({ ...alvo, status: "pending" })
  }

  const uploadAllPending = async () => {
    // Captura a lista antes de começar: `files` muda a cada progresso.
    const pendingFiles = files.filter((f) => f.status === "pending")

    let houveFalha = false
    for (const file of pendingFiles) {
      await uploadFile(file)
      if (removidosRef.current.has(file.id)) continue
      // Lê o estado mais recente para saber se este arquivo falhou.
      setFiles((prev) => {
        const atual = prev.find((f) => f.id === file.id)
        if (atual && (atual.status === "error" || atual.status === "canceled")) {
          houveFalha = true
        }
        return prev
      })
    }

    // Só avisa o pai (que fecha o diálogo e recarrega a lista) quando tudo deu
    // certo. Fechar com um arquivo em erro levava embora a única indicação de
    // falha que existia na tela, e o voluntário ia embora achando que subiu.
    if (!houveFalha) {
      onUploadComplete?.()
    }
  }

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "complete"))
  }

  const pendingCount = files.filter((f) => f.status === "pending").length
  const hasCompleted = files.some((f) => f.status === "complete")
  const isUploading = files.some((f) => f.status === "uploading" || f.status === "finalizing")

  // "Enviando 2 de 5": numa fila de vídeos o operador precisa saber onde está.
  const totalDoLote = files.filter((f) => f.status !== "error" && f.status !== "canceled").length
  const enviadosNoLote = files.filter((f) => f.status === "complete").length + 1

  // O pai precisa saber para impedir que o diálogo feche no meio de um envio.
  useEffect(() => {
    onUploadingChange?.(isUploading)
  }, [isUploading, onUploadingChange])

  // Vídeo de centenas de MB leva minutos; fechar a aba no meio perde tudo,
  // porque o PUT não tem retomada.
  useEffect(() => {
    if (!isUploading) return

    // `preventDefault()` é a forma da spec (Chrome/Firefox); o Safari ainda
    // depende de `returnValue`. Perder um upload de 500MB por causa disso
    // custa caro demais para arriscar só um dos dois.
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [isUploading])

  const getFileIcon = (file: File) => {
    // Pelo tipo resolvido, não por `file.type` — senão .mov e .pptx (que vêm
    // sem type em Windows/Android) caem sempre no ícone genérico.
    const mime = resolveContentType(file)
    if (!mime) return <FileIcon className="h-4 w-4 text-orange-500" />

    switch (getMediaTypeFromMime(mime)) {
      case "IMAGE":
        return <ImageIcon className="h-4 w-4 text-blue-500" />
      case "VIDEO":
        return <VideoIcon className="h-4 w-4 text-purple-500" />
      case "PDF":
        return <FileTextIcon className="h-4 w-4 text-red-500" />
      default:
        return <FileIcon className="h-4 w-4 text-orange-500" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragging && "border-primary bg-primary/5",
          disabled && "cursor-not-allowed opacity-50",
          !isDragging && !disabled && "border-muted-foreground/25 hover:border-primary/50"
        )}
      >
        <input
          type="file"
          multiple
          accept={getAllowedExtensions()}
          onChange={handleFileSelect}
          disabled={disabled}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full bg-muted p-3">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Arraste arquivos aqui</p>
            <p className="text-sm text-muted-foreground">
              ou clique para selecionar
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            PDF, imagens, vídeos, PowerPoint — {describeLimits()}
          </p>
        </div>
      </div>

      {isUploading && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Envio em andamento — não feche esta tela nem bloqueie o celular até terminar.
          O arquivo não é retomado se a página sair.
        </p>
      )}

      {/* Lista de arquivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileWithProgress) => (
            <div
              key={fileWithProgress.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3",
                fileWithProgress.status === "error" && "border-destructive/50 bg-destructive/5",
                fileWithProgress.status === "canceled" && "border-muted-foreground/40",
                fileWithProgress.status === "complete" && "border-green-500/50 bg-green-500/5"
              )}
            >
              {getFileIcon(fileWithProgress.file)}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  {fileWithProgress.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(fileWithProgress.file.size)}
                  {fileWithProgress.status === "pending" && pendingCount > 0 && " — na fila"}
                  {fileWithProgress.status === "finalizing" && " — finalizando…"}
                  {fileWithProgress.status === "uploading" &&
                    ` — ${fileWithProgress.progress}%` +
                      (fileWithProgress.bytesPerSecond
                        ? `, ${formatSpeed(fileWithProgress.bytesPerSecond)}`
                        : "") +
                      (fileWithProgress.etaSeconds != null
                        ? `, ${formatEta(fileWithProgress.etaSeconds)}`
                        : "")}
                </p>
                {(fileWithProgress.status === "uploading" ||
                  fileWithProgress.status === "finalizing") && (
                  <Progress
                    value={fileWithProgress.status === "finalizing" ? 100 : fileWithProgress.progress}
                    className="mt-1 h-1"
                  />
                )}
                {fileWithProgress.stalled && (
                  <p className="text-xs text-amber-600">
                    Sem progresso há mais de um minuto — verifique a conexão.
                  </p>
                )}
                {fileWithProgress.error && (
                  <p
                    className={cn(
                      "text-xs",
                      fileWithProgress.status === "canceled"
                        ? "text-muted-foreground"
                        : "text-destructive"
                    )}
                  >
                    {fileWithProgress.error}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {(fileWithProgress.status === "error" ||
                  fileWithProgress.status === "canceled") && (
                  <Button variant="outline" size="sm" onClick={() => retryFile(fileWithProgress.id)}>
                    Tentar novamente
                  </Button>
                )}
                {fileWithProgress.status === "uploading" ||
                fileWithProgress.status === "finalizing" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelFile(fileWithProgress.id)}
                  >
                    Cancelar
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(fileWithProgress.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botoes de acao */}
      {files.length > 0 && (
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <Button onClick={uploadAllPending} disabled={disabled || isUploading}>
              {isUploading
                ? `Enviando ${enviadosNoLote} de ${totalDoLote}...`
                : `Enviar ${pendingCount} arquivo${pendingCount > 1 ? "s" : ""}`}
            </Button>
          )}
          {hasCompleted && (
            <Button variant="outline" onClick={clearCompleted}>
              Limpar enviados
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
