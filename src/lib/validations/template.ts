import { z } from "zod"

// ============================================
// Event Template Schemas
// ============================================

// Schema para items da ordem do culto no template
export const templateItemSchema = z.object({
  type: z.enum([
    "WELCOME",
    "WORSHIP",
    "PRAYER",
    "READING",
    "ANNOUNCEMENTS",
    "OFFERING",
    "PREACHING",
    "COMMUNION",
    "VIDEO",
    "SPECIAL",
    "TRANSITION",
    "OTHER",
  ]),
  title: z.string().min(1, "Título é obrigatório").max(200),
  description: z.string().max(1000).optional(),
  durationMinutes: z.number().int().positive().optional(),
  requiresMedia: z.boolean().optional().default(false),
  bibleReference: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  isPublic: z.boolean().optional().default(true),
  expectedSongCount: z.number().int().min(1).max(20).optional(),
})

// Schema para vagas/escalas no template
export const templateScheduleSchema = z.object({
  ministryId: z.string().min(1, "ID do ministério inválido"),
  positionId: z.string().min(1, "ID da função inválido"),
  quantity: z.number().int().positive().default(1),
})

// Schema para criar template
export const createTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(200, "Nome deve ter no máximo 200 caracteres"),
  description: z.string().max(2000).optional(),
  eventType: z.enum(["CULTO", "SPECIAL"]),
  duration: z.number().int().positive().optional(),
  defaultSchedules: z.array(templateScheduleSchema).optional(),
  defaultItems: z.array(templateItemSchema).optional(),
})

// Schema para atualizar template
export const updateTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(200, "Nome deve ter no máximo 200 caracteres")
    .optional(),
  description: z.string().max(2000).optional().nullable(),
  eventType: z.enum(["CULTO", "SPECIAL"]).optional(),
  duration: z.number().int().positive().optional().nullable(),
  defaultSchedules: z.array(templateScheduleSchema).optional().nullable(),
  defaultItems: z.array(templateItemSchema).optional().nullable(),
})

// Schema para aplicar template a um evento
export const applyTemplateSchema = z.object({
  eventId: z.string().min(1, "ID do evento inválido"),
  applyItems: z.boolean().optional().default(true),
  applyVacancies: z.boolean().optional().default(true),
})

// Schema para query de templates
export const templateQuerySchema = z.object({
  search: z.string().optional(),
  eventType: z.enum(["CULTO", "SPECIAL"]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

// ============================================
// Type exports
// ============================================

export type TemplateItem = z.infer<typeof templateItemSchema>
export type TemplateSchedule = z.infer<typeof templateScheduleSchema>
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>
export type ApplyTemplateInput = z.infer<typeof applyTemplateSchema>
export type TemplateQueryInput = z.infer<typeof templateQuerySchema>
