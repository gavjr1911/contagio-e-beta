import { z } from "zod"
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, type AllowedMimeType } from "@/lib/storage/r2"

const allowedMimeTypes = Object.keys(ALLOWED_FILE_TYPES) as [string, ...string[]]

// Schema para solicitar URL de upload
export const uploadUrlRequestSchema = z.object({
  filename: z.string().min(1, "Nome do arquivo obrigatorio"),
  contentType: z.enum(allowedMimeTypes, "Tipo de arquivo nao permitido") as z.ZodType<AllowedMimeType>,
  fileSize: z
    .number()
    .positive("Tamanho deve ser positivo")
    .max(MAX_FILE_SIZE, `Arquivo muito grande. Limite: ${MAX_FILE_SIZE / (1024 * 1024)}MB`),
  eventId: z.string().cuid("ID do evento invalido"),
  eventItemId: z.string().cuid("ID do item invalido").optional(),
})

export type UploadUrlRequest = z.infer<typeof uploadUrlRequestSchema>

// Schema para confirmar upload
export const confirmUploadSchema = z.object({
  key: z.string().min(1, "Key do arquivo obrigatoria"),
  eventId: z.string().cuid("ID do evento invalido"),
  eventItemId: z.string().cuid("ID do item invalido").optional(),
  originalName: z.string().min(1, "Nome original obrigatorio"),
  fileSize: z.number().positive("Tamanho deve ser positivo"),
  mimeType: z.enum(allowedMimeTypes, "Tipo de arquivo nao permitido") as z.ZodType<AllowedMimeType>,
  category: z.enum(["ANNOUNCEMENTS", "PREACHING", "OTHER"]).default("OTHER"),
})

export type ConfirmUploadRequest = z.infer<typeof confirmUploadSchema>

// Schema para deletar midia
export const deleteMediaSchema = z.object({
  id: z.string().cuid("ID da midia invalido"),
})

// Schema para listar midia de evento
export const listEventMediaSchema = z.object({
  eventId: z.string().cuid("ID do evento invalido"),
})

// Tipo para resposta de midia
export interface MediaResponse {
  id: string
  eventId: string | null
  eventItemId: string | null
  type: "IMAGE" | "VIDEO" | "PDF" | "PRESENTATION"
  url: string
  filename: string | null
  originalName: string | null
  fileSize: number | null
  mimeType: string | null
  category: "ANNOUNCEMENTS" | "PREACHING" | "OTHER"
  uploadedById: string | null
  uploadedBy?: {
    id: string
    name: string | null
  }
  createdAt: string
}

// Tipo para item do evento com status de midia
export interface EventItemMediaStatus {
  id: string
  title: string
  type: string
  order: number
  requiresMedia: boolean
  mediaCount: number
  mediaFiles: MediaResponse[]
}

// Tipo para resposta completa de midia do evento
export interface EventMediaResponse {
  items: EventItemMediaStatus[]
  looseMedia: MediaResponse[] // Arquivos nao vinculados a itens
  stats: {
    totalItems: number
    itemsRequiringMedia: number
    itemsWithMedia: number
    pendingItems: number
    totalFiles: number
  }
}
