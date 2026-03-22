import { z } from "zod"
import { parseLocalDate } from "@/lib/date-utils"

/**
 * Schema para data local (YYYY-MM-DD).
 * Converte a string para Date usando o timezone local, nao UTC.
 */
const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
  .transform((val) => parseLocalDate(val))

// ============================================
// Schedule Status Enum
// ============================================

export const ScheduleStatusEnum = z.enum(["PENDING", "CONFIRMED", "DECLINED"])

// ============================================
// Schedule Schemas
// ============================================

export const createScheduleSchema = z.object({
  userId: z.string().cuid("ID do usuario invalido"),
  ministryId: z.string().cuid("ID do ministerio invalido"),
  vacancyId: z.string().cuid("ID da vaga invalido").optional(),
  position: z.string().max(100).optional(),
})

export const updateScheduleSchema = z.object({
  position: z.string().max(100).optional(),
  status: ScheduleStatusEnum.optional(),
})

export const scheduleFiltersSchema = z.object({
  userId: z.string().cuid().optional(),
  eventId: z.string().cuid().optional(),
  ministryId: z.string().cuid().optional(),
  status: ScheduleStatusEnum.optional(),
  startDate: localDateSchema.optional(),
  endDate: localDateSchema.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

export const confirmScheduleSchema = z.object({
  // No additional data needed for confirmation
})

export const declineScheduleSchema = z.object({
  reason: z
    .string()
    .max(500, "Motivo deve ter no maximo 500 caracteres")
    .optional(),
})

// ============================================
// Blocked Date Schemas
// ============================================

export const createBlockedDateSchema = z
  .object({
    startDate: localDateSchema,
    endDate: localDateSchema,
    reason: z
      .string()
      .max(500, "Motivo deve ter no maximo 500 caracteres")
      .optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "Data final deve ser igual ou posterior a data inicial",
    path: ["endDate"],
  })

export const blockedDateFiltersSchema = z.object({
  startDate: localDateSchema.optional(),
  endDate: localDateSchema.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

// ============================================
// Types
// ============================================

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>
export type ScheduleFiltersInput = z.infer<typeof scheduleFiltersSchema>
export type ConfirmScheduleInput = z.infer<typeof confirmScheduleSchema>
export type DeclineScheduleInput = z.infer<typeof declineScheduleSchema>
export type CreateBlockedDateInput = z.infer<typeof createBlockedDateSchema>
export type BlockedDateFiltersInput = z.infer<typeof blockedDateFiltersSchema>
