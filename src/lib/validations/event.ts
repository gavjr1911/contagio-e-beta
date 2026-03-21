import { z } from "zod"

// ============================================
// Event Type and Status Enums
// ============================================

export const EventTypeEnum = z.enum([
  "SUNDAY_MORNING",
  "SUNDAY_EVENING",
  "SPECIAL",
])

export const EventStatusEnum = z.enum(["DRAFT", "PUBLISHED", "COMPLETED"])

export const EventItemTypeEnum = z.enum([
  "WORSHIP",
  "PREACHING",
  "ANNOUNCEMENTS",
  "COMMUNION",
  "OTHER",
])

// ============================================
// Event Schemas
// ============================================

export const createEventSchema = z.object({
  name: z
    .string()
    .min(1, "Nome e obrigatorio")
    .max(200, "Nome deve ter no maximo 200 caracteres"),
  type: EventTypeEnum,
  date: z.coerce.date({ message: "Data invalida" }),
  startTime: z.coerce.date({ message: "Horario de inicio invalido" }),
  endTime: z.coerce.date({ message: "Horario de termino invalido" }).optional(),
  status: EventStatusEnum.optional().default("DRAFT"),
  templateId: z.string().cuid().optional(),
})

export const updateEventSchema = createEventSchema.partial()

export const eventFiltersSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: EventStatusEnum.optional(),
  type: EventTypeEnum.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

// ============================================
// Event Item Schemas (Ordem do Culto)
// ============================================

export const createEventItemSchema = z.object({
  type: EventItemTypeEnum,
  title: z
    .string()
    .min(1, "Titulo e obrigatorio")
    .max(200, "Titulo deve ter no maximo 200 caracteres"),
  description: z.string().max(1000).optional(),
  durationMinutes: z.coerce.number().int().positive().optional(),
  responsibleId: z.string().cuid().optional(),
  order: z.coerce.number().int().min(0).optional(),
})

export const updateEventItemSchema = createEventItemSchema.partial()

export const reorderEventItemsSchema = z.object({
  itemIds: z
    .array(z.string().cuid())
    .min(1, "Pelo menos um item deve ser fornecido"),
})

// ============================================
// Types
// ============================================

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type EventFiltersInput = z.infer<typeof eventFiltersSchema>
export type CreateEventItemInput = z.infer<typeof createEventItemSchema>
export type UpdateEventItemInput = z.infer<typeof updateEventItemSchema>
export type ReorderEventItemsInput = z.infer<typeof reorderEventItemsSchema>
