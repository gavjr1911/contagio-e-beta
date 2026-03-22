import { z } from "zod"

// ============================================
// Auto-Assign Preview Query Schema
// ============================================

export const autoAssignPreviewQuerySchema = z.object({
  ministryId: z.string().cuid().optional(),
})

// ============================================
// Auto-Assign Execute Body Schema
// ============================================

export const autoAssignExecuteSchema = z.object({
  ministryId: z.string().cuid().optional(),
})

// ============================================
// Auto-Assign Config Update Schema
// ============================================

export const updateAutoAssignConfigSchema = z.object({
  enabled: z.boolean().optional(),
  autoAssignUntil: z
    .string()
    .datetime()
    .transform((val) => new Date(val))
    .nullable()
    .optional(),
  avoidConsecutive: z.boolean().optional(),
  maxEventsPerMonth: z.number().int().min(1).max(31).nullable().optional(),
  rotationWeight: z.number().int().min(0).max(100).optional(),
  availabilityWeight: z.number().int().min(0).max(100).optional(),
})

// ============================================
// Types
// ============================================

export type AutoAssignPreviewQuery = z.infer<typeof autoAssignPreviewQuerySchema>
export type AutoAssignExecuteInput = z.infer<typeof autoAssignExecuteSchema>
export type UpdateAutoAssignConfigInput = z.infer<typeof updateAutoAssignConfigSchema>
