import { z } from "zod"
import { parseLocalDate, parseLocalTime } from "@/lib/date-utils"

// ============================================
// Custom Date/Time Transformers
// ============================================

/**
 * Schema para data local (YYYY-MM-DD).
 * Converte a string para Date usando o timezone local, nao UTC.
 */
const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
  .transform((val) => parseLocalDate(val))

/**
 * Schema para hora local (HH:MM).
 * Converte a string para Date com hora local.
 */
const localTimeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Hora deve estar no formato HH:MM")
  .transform((val) => parseLocalTime(val))

// ============================================
// Event Type and Status Enums
// ============================================

export const EventTypeEnum = z.enum([
  "SUNDAY_MORNING",
  "SUNDAY_EVENING",
  "SPECIAL",
])

export const EventStatusEnum = z.enum(["PUBLISHED", "COMPLETED"])

export const RecurrencePatternEnum = z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"])

export const EventItemTypeEnum = z.enum([
  "WELCOME",       // Boas-vindas
  "WORSHIP",       // Bloco de louvor
  "PRAYER",        // Oracao
  "READING",       // Leitura Biblica
  "ANNOUNCEMENTS", // Avisos
  "OFFERING",      // Dizimos e Ofertas
  "PREACHING",     // Pregacao/Palavra
  "COMMUNION",     // Santa Ceia
  "VIDEO",         // Video/Midia
  "SPECIAL",       // Participacao Especial
  "TRANSITION",    // Transicao/Intervalo
  "OTHER",         // Outros
])

// ============================================
// Event Schemas
// ============================================

// Base schema without refinement (for .partial() compatibility)
const baseEventSchema = z.object({
  name: z
    .string()
    .min(1, "Nome e obrigatorio")
    .max(200, "Nome deve ter no maximo 200 caracteres"),
  type: EventTypeEnum,
  date: localDateSchema,
  startTime: localTimeSchema,
  endTime: localTimeSchema.optional(),
  status: EventStatusEnum.optional().default("PUBLISHED"),
  templateId: z.string().cuid().optional(),
  isRecurring: z.boolean().optional().default(false),
  recurrencePattern: RecurrencePatternEnum.optional(),
  recurrenceEndDate: z.string().optional(),
})

export const createEventSchema = baseEventSchema.refine(
  (data) => {
    // If isRecurring is true, pattern and endDate are required
    if (data.isRecurring) {
      return !!data.recurrencePattern && !!data.recurrenceEndDate
    }
    return true
  },
  {
    message:
      "Padrao de recorrencia e data final sao obrigatorios para eventos recorrentes",
    path: ["recurrencePattern"],
  }
)

// Update schema precisa aceitar campos opcionais
export const updateEventSchema = z.object({
  name: z
    .string()
    .min(1, "Nome e obrigatorio")
    .max(200, "Nome deve ter no maximo 200 caracteres")
    .optional(),
  type: EventTypeEnum.optional(),
  date: localDateSchema.optional(),
  startTime: localTimeSchema.optional(),
  endTime: localTimeSchema.optional().nullable(),
  status: EventStatusEnum.optional(),
  templateId: z.string().cuid().optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurrencePattern: RecurrencePatternEnum.optional().nullable(),
  recurrenceEndDate: z.string().optional().nullable(),
})

export const eventFiltersSchema = z.object({
  startDate: localDateSchema.optional(),
  endDate: localDateSchema.optional(),
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
  // Campos adicionais
  bibleReference: z.string().max(100).optional(),
  mediaUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(2000).optional(),
  isPublic: z.boolean().optional().default(true),
  expectedSongCount: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number().int().min(1).max(20).optional()
  ),
  requiresMedia: z.boolean().optional().default(false),
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
