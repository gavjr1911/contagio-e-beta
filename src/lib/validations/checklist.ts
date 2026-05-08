import { z } from "zod"

// ============================================
// Checklist Template Schemas
// ============================================

export const createChecklistTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(200, "Nome deve ter no máximo 200 caracteres"),
  description: z.string().max(2000).optional(),
})

export const updateChecklistTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(200, "Nome deve ter no máximo 200 caracteres")
    .optional(),
  description: z.string().max(2000).optional().nullable(),
})

export const checklistTemplateQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

// ============================================
// Checklist Template Item Schemas
// ============================================

export const createChecklistTemplateItemSchema = z.object({
  title: z
    .string()
    .min(1, "Título é obrigatório")
    .max(500, "Título deve ter no máximo 500 caracteres"),
  order: z.coerce.number().int().min(0).optional(),
})

export const updateChecklistTemplateItemSchema = z.object({
  title: z
    .string()
    .min(1, "Título é obrigatório")
    .max(500, "Título deve ter no máximo 500 caracteres")
    .optional(),
})

export const reorderChecklistItemsSchema = z.object({
  itemIds: z
    .array(z.string().min(1))
    .min(1, "Pelo menos um item deve ser fornecido"),
})

// ============================================
// Event Checklist Item Schemas
// ============================================

export const createEventChecklistItemSchema = z.object({
  title: z
    .string()
    .min(1, "Título é obrigatório")
    .max(500, "Título deve ter no máximo 500 caracteres"),
  order: z.coerce.number().int().min(0).optional(),
})

export const updateEventChecklistItemSchema = z.object({
  title: z
    .string()
    .min(1, "Título é obrigatório")
    .max(500, "Título deve ter no máximo 500 caracteres")
    .optional(),
  completed: z.boolean().optional(),
})

export const initEventChecklistSchema = z.object({
  templateId: z.string().min(1, "ID do template inválido").optional(),
})

// ============================================
// Type exports
// ============================================

export type CreateChecklistTemplateInput = z.infer<typeof createChecklistTemplateSchema>
export type UpdateChecklistTemplateInput = z.infer<typeof updateChecklistTemplateSchema>
export type ChecklistTemplateQueryInput = z.infer<typeof checklistTemplateQuerySchema>
export type CreateChecklistTemplateItemInput = z.infer<typeof createChecklistTemplateItemSchema>
export type UpdateChecklistTemplateItemInput = z.infer<typeof updateChecklistTemplateItemSchema>
export type ReorderChecklistItemsInput = z.infer<typeof reorderChecklistItemsSchema>
export type CreateEventChecklistItemInput = z.infer<typeof createEventChecklistItemSchema>
export type UpdateEventChecklistItemInput = z.infer<typeof updateEventChecklistItemSchema>
export type InitEventChecklistInput = z.infer<typeof initEventChecklistSchema>
