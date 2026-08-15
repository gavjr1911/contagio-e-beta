import { z } from "zod"
// Importa das constantes compartilhadas (sem dependência de servidor), não de
// @/lib/storage/r2 — que arrasta Prisma e não pode ir para o bundle do client.
import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  getMaxSizeForMime,
  type AllowedMimeType,
} from "@/lib/media/constants"

const allowedMimeTypes = Object.keys(ALLOWED_FILE_TYPES) as [string, ...string[]]

// Schema para solicitar URL de upload
export const uploadUrlRequestSchema = z
  .object({
    filename: z.string().min(1, "Nome do arquivo obrigatório"),
    contentType: z.enum(allowedMimeTypes, "Tipo de arquivo não permitido") as z.ZodType<AllowedMimeType>,
    fileSize: z
      .number()
      .positive("Tamanho deve ser positivo")
      // Teto absoluto; o limite real depende do tipo e é aplicado abaixo.
      .max(MAX_FILE_SIZE, "Arquivo muito grande"),
    eventId: z.string().min(1, "ID do evento obrigatório"),
    eventItemId: z.string().min(1, "ID do item inválido").optional(),
  })
  // O limite efetivo depende do contentType, então precisa ser checado com o
  // objeto inteiro em mãos — um `.max()` fixo no campo daria o teto de vídeo
  // (500MB) também para imagem.
  .superRefine((data, ctx) => {
    const maxSize = getMaxSizeForMime(data.contentType)
    if (data.fileSize > maxSize) {
      ctx.addIssue({
        code: "custom",
        path: ["fileSize"],
        message: `Arquivo muito grande. Limite para este tipo: ${Math.round(maxSize / (1024 * 1024))}MB`,
      })
    }
  })

export type UploadUrlRequest = z.infer<typeof uploadUrlRequestSchema>

// Schema para confirmar upload
export const confirmUploadSchema = z.object({
  key: z.string().min(1, "Key do arquivo obrigatória"),
  eventId: z.string().min(1, "ID do evento obrigatório"),
  eventItemId: z.string().min(1, "ID do item inválido").optional(),
  originalName: z.string().min(1, "Nome original obrigatório"),
  fileSize: z.number().positive("Tamanho deve ser positivo"),
  mimeType: z.enum(allowedMimeTypes, "Tipo de arquivo não permitido") as z.ZodType<AllowedMimeType>,
  category: z.enum(["ANNOUNCEMENTS", "PREACHING", "OTHER"]).default("OTHER"),
})

export type ConfirmUploadRequest = z.infer<typeof confirmUploadSchema>

// Schema para deletar midia
export const deleteMediaSchema = z.object({
  id: z.string().min(1, "ID da mídia inválido"),
})

// Schema para listar midia de evento
export const listEventMediaSchema = z.object({
  eventId: z.string().min(1, "ID do evento obrigatório"),
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
