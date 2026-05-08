import { z } from "zod"
import { ministryPermissionsSchema } from "@/lib/validations/permissions"

// Schema para criar um novo ministerio
export const createMinistrySchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  description: z
    .string()
    .max(500, "Descrição deve ter no máximo 500 caracteres")
    .optional()
    .nullable(),
  leaderId: z.string().optional().nullable(),
  permissions: ministryPermissionsSchema.optional().nullable(),
})

// Schema para atualizar um ministerio
export const updateMinistrySchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .optional(),
  description: z
    .string()
    .max(500, "Descrição deve ter no máximo 500 caracteres")
    .optional()
    .nullable(),
  leaderId: z.string().optional().nullable(),
  permissions: ministryPermissionsSchema.optional().nullable(),
})

// Schema para adicionar membro ao ministerio
export const addMemberSchema = z.object({
  userId: z.string().min(1, "ID do usuário inválido"),
  positionIds: z.array(z.string().min(1)).optional(),
})

// Schema para atualizar membro do ministerio
export const updateMemberSchema = z.object({
  positionIds: z.array(z.string().min(1)).optional(),
  active: z.boolean().optional(),
})

// Schema para filtros de listagem
export const ministryQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1).optional(),
  limit: z.coerce.number().min(1).max(100).default(20).optional(),
  search: z.string().optional(),
  includeMembers: z.coerce.boolean().default(false).optional(),
  includeLeader: z.coerce.boolean().default(true).optional(),
  includePositions: z.coerce.boolean().default(false).optional(),
})

// Types inferidos dos schemas
export type CreateMinistryInput = z.infer<typeof createMinistrySchema>
export type UpdateMinistryInput = z.infer<typeof updateMinistrySchema>
export type AddMemberInput = z.infer<typeof addMemberSchema>
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>
export type MinistryQueryInput = z.infer<typeof ministryQuerySchema>
