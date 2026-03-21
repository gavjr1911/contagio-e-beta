import { z } from "zod"

// ============================================
// Song Schemas
// ============================================

export const songCreateSchema = z.object({
  name: z.string().min(1, "Nome da musica e obrigatorio"),
  artist: z.string().nullable().optional(),
  defaultKey: z.string().nullable().optional(),
  lyrics: z.string().nullable().optional(),
  chordLink: z.string().url("URL invalida").nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  propresenterId: z.string().nullable().optional(),
})

export const songUpdateSchema = z.object({
  name: z.string().min(1, "Nome da musica e obrigatorio").optional(),
  artist: z.string().nullable().optional(),
  defaultKey: z.string().nullable().optional(),
  lyrics: z.string().nullable().optional(),
  chordLink: z.string().url("URL invalida").nullable().optional(),
  tags: z.array(z.string()).optional(),
  propresenterId: z.string().nullable().optional(),
})

export const songQuerySchema = z.object({
  search: z.string().optional(),
  tag: z.string().optional(),
  orderBy: z.enum(["name", "playCount", "lastPlayedAt", "createdAt"]).optional().default("name"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

export const songSearchSchema = z.object({
  q: z.string().min(1, "Termo de busca e obrigatorio"),
  limit: z.coerce.number().int().positive().max(20).optional().default(10),
})

// ============================================
// Band Schemas
// ============================================

export const bandCreateSchema = z.object({
  name: z.string().min(1, "Nome da banda e obrigatorio"),
  active: z.boolean().optional().default(true),
})

export const bandUpdateSchema = z.object({
  name: z.string().min(1, "Nome da banda e obrigatorio").optional(),
  active: z.boolean().optional(),
})

export const bandQuerySchema = z.object({
  search: z.string().optional(),
  active: z.enum(["true", "false", "all"]).optional().default("true"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

// ============================================
// Band Member Schemas
// ============================================

export const bandMemberCreateSchema = z.object({
  userId: z.string().min(1, "ID do usuario e obrigatorio"),
  instrument: z.string().min(1, "Instrumento e obrigatorio"),
})

export const bandMemberUpdateSchema = z.object({
  instrument: z.string().min(1, "Instrumento e obrigatorio").optional(),
})

// ============================================
// Setlist Schemas
// ============================================

export const setlistItemCreateSchema = z.object({
  songId: z.string().min(1, "ID da musica e obrigatorio"),
  key: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  order: z.number().int().nonnegative().optional(),
})

export const setlistItemUpdateSchema = z.object({
  key: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const setlistReorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      order: z.number().int().nonnegative(),
    })
  ).min(1, "Lista de itens e obrigatoria"),
})

// ============================================
// Reports Schemas
// ============================================

export const songReportQuerySchema = z.object({
  type: z.enum(["most_played", "least_played", "never_played", "recently_played", "not_played_recently"]).optional().default("most_played"),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  daysAgo: z.coerce.number().int().positive().optional().default(30),
})

// ============================================
// Type exports
// ============================================

export type SongCreate = z.infer<typeof songCreateSchema>
export type SongUpdate = z.infer<typeof songUpdateSchema>
export type SongQuery = z.infer<typeof songQuerySchema>
export type SongSearch = z.infer<typeof songSearchSchema>

export type BandCreate = z.infer<typeof bandCreateSchema>
export type BandUpdate = z.infer<typeof bandUpdateSchema>
export type BandQuery = z.infer<typeof bandQuerySchema>

export type BandMemberCreate = z.infer<typeof bandMemberCreateSchema>
export type BandMemberUpdate = z.infer<typeof bandMemberUpdateSchema>

export type SetlistItemCreate = z.infer<typeof setlistItemCreateSchema>
export type SetlistItemUpdate = z.infer<typeof setlistItemUpdateSchema>
export type SetlistReorder = z.infer<typeof setlistReorderSchema>

export type SongReportQuery = z.infer<typeof songReportQuerySchema>
