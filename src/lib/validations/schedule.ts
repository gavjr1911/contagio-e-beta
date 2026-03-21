import { z } from "zod"

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
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
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
    startDate: z.coerce.date({ message: "Data inicial invalida" }),
    endDate: z.coerce.date({ message: "Data final invalida" }),
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
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
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
