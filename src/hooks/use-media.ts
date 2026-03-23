"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type {
  EventMediaResponse,
  MediaResponse,
  UploadUrlRequest,
  ConfirmUploadRequest,
} from "@/lib/validations/media"

// Query keys
export const mediaKeys = {
  all: ["media"] as const,
  event: (eventId: string) => [...mediaKeys.all, "event", eventId] as const,
  detail: (id: string) => [...mediaKeys.all, "detail", id] as const,
}

// Buscar midia do evento
export function useEventMedia(eventId: string | undefined) {
  return useQuery({
    queryKey: eventId ? mediaKeys.event(eventId) : [],
    queryFn: async (): Promise<EventMediaResponse> => {
      if (!eventId) throw new Error("Event ID required")

      const response = await fetch(`/api/events/${eventId}/media`)
      const json = await response.json()

      if (!response.ok) {
        throw new Error(json.error || "Erro ao carregar midia")
      }

      return json.data
    },
    enabled: !!eventId,
  })
}

// Tipo para upload de arquivo
interface UploadFileParams {
  file: File
  eventId: string
  eventItemId?: string
  category?: "ANNOUNCEMENTS" | "PREACHING" | "OTHER"
  onProgress?: (progress: number) => void
}

// Upload completo de arquivo (presigned URL + upload + confirm)
export function useUploadMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      file,
      eventId,
      eventItemId,
      category = "OTHER",
      onProgress,
    }: UploadFileParams): Promise<MediaResponse> => {
      // Passo 1: Solicitar URL presigned
      const uploadUrlRequest: UploadUrlRequest = {
        filename: file.name,
        contentType: file.type as UploadUrlRequest["contentType"],
        fileSize: file.size,
        eventId,
        eventItemId,
      }

      const urlResponse = await fetch("/api/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadUrlRequest),
      })

      const urlJson = await urlResponse.json()

      if (!urlResponse.ok) {
        throw new Error(urlJson.error || "Erro ao gerar URL de upload")
      }

      const { uploadUrl, key } = urlJson.data

      // Passo 2: Fazer upload para R2
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable && onProgress) {
            const progress = Math.round((e.loaded / e.total) * 100)
            onProgress(progress)
          }
        })

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload falhou: ${xhr.status}`))
          }
        })

        xhr.addEventListener("error", () => {
          reject(new Error("Erro de rede durante upload"))
        })

        xhr.open("PUT", uploadUrl)
        xhr.setRequestHeader("Content-Type", file.type)
        xhr.send(file)
      })

      // Passo 3: Confirmar upload
      const confirmRequest: ConfirmUploadRequest = {
        key,
        eventId,
        eventItemId,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type as ConfirmUploadRequest["mimeType"],
        category,
      }

      const confirmResponse = await fetch("/api/media/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(confirmRequest),
      })

      const confirmJson = await confirmResponse.json()

      if (!confirmResponse.ok) {
        throw new Error(confirmJson.error || "Erro ao confirmar upload")
      }

      return confirmJson.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: mediaKeys.event(variables.eventId),
      })
      toast.success("Arquivo enviado com sucesso")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar arquivo")
    },
  })
}

// Deletar midia
export function useDeleteMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      eventId,
    }: {
      id: string
      eventId: string
    }): Promise<void> => {
      const response = await fetch(`/api/media/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const json = await response.json()
        throw new Error(json.error || "Erro ao remover midia")
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: mediaKeys.event(variables.eventId),
      })
      toast.success("Arquivo removido com sucesso")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao remover arquivo")
    },
  })
}

// Helpers

// Formatar tamanho de arquivo
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// Icone por tipo de midia
export function getMediaIcon(type: string): string {
  switch (type) {
    case "IMAGE":
      return "image"
    case "VIDEO":
      return "video"
    case "PDF":
      return "file-text"
    case "PRESENTATION":
      return "presentation"
    default:
      return "file"
  }
}

// Verificar se tipo de arquivo e permitido
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
]

export function isAllowedFileType(mimeType: string): boolean {
  return ALLOWED_TYPES.includes(mimeType)
}

// Limite de 50MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024

export function isFileSizeValid(size: number): boolean {
  return size <= MAX_FILE_SIZE
}

// Extensoes permitidas por tipo
export function getAllowedExtensions(): string {
  return ".png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.pdf,.pptx,.ppt"
}

// Obter extensao do arquivo
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || ""
}

// Verificar se e imagem
export function isImageType(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false
  return mimeType.startsWith("image/")
}

// Verificar se e video
export function isVideoType(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false
  return mimeType.startsWith("video/")
}
