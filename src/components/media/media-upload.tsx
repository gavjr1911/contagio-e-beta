"use client"

import { useCallback, useState } from "react"
import { Upload, X, FileIcon, ImageIcon, VideoIcon, FileTextIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  useUploadMedia,
  formatFileSize,
  isAllowedFileType,
  isFileSizeValid,
  getAllowedExtensions,
  MAX_FILE_SIZE,
} from "@/hooks/use-media"
import { cn } from "@/lib/utils"

interface MediaUploadProps {
  eventId: string
  eventItemId?: string
  category?: "ANNOUNCEMENTS" | "PREACHING" | "OTHER"
  onUploadComplete?: () => void
  disabled?: boolean
}

interface FileWithProgress {
  file: File
  progress: number
  status: "pending" | "uploading" | "complete" | "error"
  error?: string
}

export function MediaUpload({
  eventId,
  eventItemId,
  category = "OTHER",
  onUploadComplete,
  disabled = false,
}: MediaUploadProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const uploadMutation = useUploadMedia()

  const validateFile = (file: File): string | null => {
    if (!isAllowedFileType(file.type)) {
      return "Tipo de arquivo nao permitido"
    }
    if (!isFileSizeValid(file.size)) {
      return `Arquivo muito grande. Limite: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    }
    return null
  }

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const validFiles: FileWithProgress[] = []

    Array.from(newFiles).forEach((file) => {
      const error = validateFile(file)
      validFiles.push({
        file,
        progress: 0,
        status: error ? "error" : "pending",
        error: error || undefined,
      })
    })

    setFiles((prev) => [...prev, ...validFiles])
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
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

  const uploadFile = async (fileWithProgress: FileWithProgress, index: number) => {
    if (fileWithProgress.status !== "pending") return

    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, status: "uploading" as const, progress: 0 } : f
      )
    )

    try {
      await uploadMutation.mutateAsync({
        file: fileWithProgress.file,
        eventId,
        eventItemId,
        category,
        onProgress: (progress) => {
          setFiles((prev) =>
            prev.map((f, i) => (i === index ? { ...f, progress } : f))
          )
        },
      })

      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, status: "complete" as const, progress: 100 } : f
        )
      )
    } catch (error) {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: "error" as const,
                error: error instanceof Error ? error.message : "Erro ao enviar",
              }
            : f
        )
      )
    }
  }

  const uploadAllPending = async () => {
    const pendingFiles = files
      .map((f, i) => ({ file: f, index: i }))
      .filter(({ file }) => file.status === "pending")

    for (const { file, index } of pendingFiles) {
      await uploadFile(file, index)
    }

    onUploadComplete?.()
  }

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "complete"))
  }

  const pendingCount = files.filter((f) => f.status === "pending").length
  const hasCompleted = files.some((f) => f.status === "complete")

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />
    }
    if (file.type.startsWith("video/")) {
      return <VideoIcon className="h-4 w-4 text-purple-500" />
    }
    if (file.type === "application/pdf") {
      return <FileTextIcon className="h-4 w-4 text-red-500" />
    }
    return <FileIcon className="h-4 w-4 text-orange-500" />
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
            PDF, imagens, videos, PowerPoint (max. 50MB)
          </p>
        </div>
      </div>

      {/* Lista de arquivos */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileWithProgress, index) => (
            <div
              key={`${fileWithProgress.file.name}-${index}`}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3",
                fileWithProgress.status === "error" && "border-destructive/50 bg-destructive/5",
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
                </p>
                {fileWithProgress.status === "uploading" && (
                  <Progress value={fileWithProgress.progress} className="mt-1 h-1" />
                )}
                {fileWithProgress.error && (
                  <p className="text-xs text-destructive">{fileWithProgress.error}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(index)}
                disabled={fileWithProgress.status === "uploading"}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Botoes de acao */}
      {files.length > 0 && (
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <Button
              onClick={uploadAllPending}
              disabled={disabled || uploadMutation.isPending}
            >
              {uploadMutation.isPending
                ? "Enviando..."
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
