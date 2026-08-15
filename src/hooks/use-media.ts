"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  uploadToR2,
  UploadError,
  UPLOAD_ERROR_MESSAGES,
  type UploadProgress,
} from "@/lib/media/upload"
import {
  ACCEPT_ATTRIBUTE,
  describeAllowedTypes,
  describeLimits,
  formatFileSize as formatBytes,
  getMaxSizeForMime,
  isAllowedMimeType,
  resolveContentType,
  type AllowedMimeType,
} from "@/lib/media/constants"
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

// Buscar mídia do evento
export function useEventMedia(eventId: string | undefined) {
  return useQuery({
    queryKey: eventId ? mediaKeys.event(eventId) : [],
    queryFn: async (): Promise<EventMediaResponse> => {
      if (!eventId) throw new Error("Event ID required")

      const response = await fetch(`/api/events/${eventId}/media`)
      const json = await response.json()

      if (!response.ok) {
        throw new Error(json.error || "Erro ao carregar mídia")
      }

      return json.data
    },
    enabled: !!eventId,
  })
}

// Tipo para upload de arquivo
export type UploadProgressInfo = UploadProgress

/** Fase do envio, para a tela não ficar parada em "100%" durante o registro. */
export type UploadPhase = "uploading" | "finalizing"

interface UploadFileParams {
  file: File
  eventId: string
  eventItemId?: string
  category?: "ANNOUNCEMENTS" | "PREACHING" | "OTHER"
  onProgress?: (progress: number, info?: UploadProgressInfo) => void
  onPhase?: (phase: UploadPhase) => void
  /** Permite cancelar o envio em andamento (arquivo grande pode levar minutos). */
  signal?: AbortSignal
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
      onPhase,
      signal,
    }: UploadFileParams): Promise<MediaResponse> => {
      // O navegador nem sempre preenche file.type (.mov/.pptx no Windows e em
      // alguns Androids); nesses casos o tipo vem da extensão.
      const contentType = resolveContentType(file)
      if (!contentType) {
        throw new Error(`Tipo de arquivo não permitido. Formatos aceitos: ${describeAllowedTypes()}.`)
      }

      // Passo 1: Solicitar URL presigned
      const uploadUrlRequest: UploadUrlRequest = {
        filename: file.name,
        contentType,
        fileSize: file.size,
        eventId,
        eventItemId,
      }

      const urlResponse = await fetch("/api/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadUrlRequest),
        signal,
      })

      const presignedAt = Date.now()
      const urlJson = await urlResponse.json()

      if (!urlResponse.ok) {
        throw new Error(urlJson.error || "Erro ao gerar URL de upload")
      }

      const { uploadUrl, key } = urlJson.data

      // Passo 2: PUT direto do navegador ao bucket. A mecânica (progresso,
      // watchdog de estagnação e dedução da causa da falha) vive em
      // @/lib/media/upload, fora do React, para poder ser testada.
      await uploadToR2({
        url: uploadUrl,
        file,
        contentType,
        signal,
        presignedAt,
        onProgress: (info) => onProgress?.(info.progress, info),
      })

      // Passo 3: Confirmar upload.
      onPhase?.("finalizing")

      if (signal?.aborted) {
        throw new UploadError("canceled", UPLOAD_ERROR_MESSAGES.canceled)
      }

      const confirmRequest: ConfirmUploadRequest = {
        key,
        eventId,
        eventItemId,
        originalName: file.name,
        fileSize: file.size,
        mimeType: contentType,
        category,
      }

      // O arquivo já está no bucket neste ponto. Deixar o confirm cair por uma
      // falha transitória jogaria fora o envio inteiro (que pode ter levado 10
      // minutos) e ainda deixaria o objeto órfão no R2 — por isso as tentativas.
      let confirmJson: { data?: MediaResponse; error?: string } | null = null

      for (let tentativa = 1; tentativa <= 3; tentativa++) {
        if (signal?.aborted) {
          throw new UploadError("canceled", UPLOAD_ERROR_MESSAGES.canceled)
        }

        try {
          const confirmResponse = await fetch("/api/media/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(confirmRequest),
            signal,
          })

          confirmJson = await confirmResponse.json()

          if (confirmResponse.ok) {
            return confirmJson!.data as MediaResponse
          }

          // 4xx é decisão do servidor e não muda em nova tentativa.
          if (confirmResponse.status < 500) {
            throw new Error(confirmJson?.error || "Erro ao confirmar upload")
          }
        } catch (err) {
          // Cancelamento e erro de regra sobem direto.
          if (signal?.aborted) {
            throw new UploadError("canceled", UPLOAD_ERROR_MESSAGES.canceled)
          }
          if (tentativa === 3) {
            throw err instanceof Error
              ? err
              : new Error("Erro ao confirmar o envio do arquivo.")
          }
        }

        if (tentativa < 3) {
          await new Promise((r) => setTimeout(r, tentativa * 1000))
        }
      }

      throw new Error(
        confirmJson?.error ||
          "O arquivo foi enviado, mas não foi possível registrá-lo. Tente enviar novamente."
      )
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: mediaKeys.event(variables.eventId),
      })
      toast.success("Arquivo enviado com sucesso")
    },
    onError: (error) => {
      // Cancelamento é ação do próprio usuário, não falha.
      if (error instanceof UploadError && error.reason === "canceled") {
        toast.info(error.message)
        return
      }
      toast.error(error instanceof Error ? error.message : "Erro ao enviar arquivo")
    },
  })
}

// Deletar mídia
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
        throw new Error(json.error || "Erro ao remover mídia")
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

export function formatFileSize(bytes: number | null | undefined): string {
  return formatBytes(bytes ?? 0)
}

// Icone por tipo de mídia
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

export function isAllowedFileType(mimeType: string): boolean {
  return isAllowedMimeType(mimeType)
}

/**
 * Valida o arquivo escolhido pelo usuário e devolve uma mensagem pronta para a
 * tela. Resolve o content-type pela extensão quando o navegador não informa
 * `file.type` (comum com .mov e .pptx no Windows/Android) — antes esses
 * arquivos eram recusados como "tipo não permitido" mesmo sendo válidos.
 */
export function validateMediaFile(file: File): { ok: true; contentType: AllowedMimeType } | { ok: false; error: string } {
  const contentType = resolveContentType(file)
  if (!contentType) {
    return { ok: false, error: `Tipo de arquivo não permitido. Formatos aceitos: ${describeAllowedTypes()}.` }
  }

  const maxSize = getMaxSizeForMime(contentType)
  if (file.size > maxSize) {
    return {
      ok: false,
      error: `Arquivo muito grande (${formatBytes(file.size)}). Limite: ${describeLimits()}.`,
    }
  }

  return { ok: true, contentType }
}

export { getMaxSizeForMime, describeLimits, getFileExtension } from "@/lib/media/constants"

/** Extensões para o atributo `accept` do input, derivadas da allowlist. */
export function getAllowedExtensions(): string {
  return ACCEPT_ATTRIBUTE
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
