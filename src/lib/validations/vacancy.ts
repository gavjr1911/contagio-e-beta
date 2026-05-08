import { z } from "zod"

// ============================================
// EventVacancy Schemas (Vagas do Evento)
// ============================================

export const createVacancySchema = z.object({
  ministryId: z.string().min(1),
  positionId: z.string().min(1),
  quantity: z.number().int().min(1).max(20).default(1),
})

export const updateVacancySchema = z.object({
  quantity: z.number().int().min(1).max(20).optional(),
})

export const createBulkVacanciesSchema = z.object({
  vacancies: z.array(
    z.object({
      ministryId: z.string().min(1),
      positionId: z.string().min(1),
      quantity: z.number().int().min(1).max(20).default(1),
    })
  ).min(1),
})

// ============================================
// Types
// ============================================

export type CreateVacancyInput = z.infer<typeof createVacancySchema>
export type UpdateVacancyInput = z.infer<typeof updateVacancySchema>
export type CreateBulkVacanciesInput = z.infer<typeof createBulkVacanciesSchema>
