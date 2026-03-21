import { z } from "zod"

// Tipos de ministerio disponiveis
export const MinistryType = z.enum([
  "RECEPTION",
  "PASTORAL",
  "TECHNICAL",
  "WORSHIP",
  "COMMUNICATION",
  "CONTAGIE",
])
export type MinistryType = z.infer<typeof MinistryType>

// Schema para criar um novo ministerio
export const createMinistrySchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no maximo 100 caracteres"),
  description: z
    .string()
    .max(500, "Descricao deve ter no maximo 500 caracteres")
    .optional()
    .nullable(),
  type: MinistryType,
  leaderId: z.string().optional().nullable(),
})

// Schema para atualizar um ministerio
export const updateMinistrySchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no maximo 100 caracteres")
    .optional(),
  description: z
    .string()
    .max(500, "Descricao deve ter no maximo 500 caracteres")
    .optional()
    .nullable(),
  type: MinistryType.optional(),
  leaderId: z.string().optional().nullable(),
})

// Schema para adicionar membro ao ministerio
export const addMemberSchema = z.object({
  userId: z.string().uuid("ID do usuario invalido"),
  position: z
    .string()
    .min(2, "Posicao deve ter pelo menos 2 caracteres")
    .max(100, "Posicao deve ter no maximo 100 caracteres")
    .optional()
    .nullable(),
})

// Schema para atualizar membro do ministerio
export const updateMemberSchema = z.object({
  position: z
    .string()
    .min(2, "Posicao deve ter pelo menos 2 caracteres")
    .max(100, "Posicao deve ter no maximo 100 caracteres")
    .optional()
    .nullable(),
  active: z.boolean().optional(),
})

// Schema para filtros de listagem
export const ministryQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1).optional(),
  limit: z.coerce.number().min(1).max(100).default(20).optional(),
  search: z.string().optional(),
  type: MinistryType.optional(),
  includeMembers: z.coerce.boolean().default(false).optional(),
  includeLeader: z.coerce.boolean().default(true).optional(),
})

// Types inferidos dos schemas
export type CreateMinistryInput = z.infer<typeof createMinistrySchema>
export type UpdateMinistryInput = z.infer<typeof updateMinistrySchema>
export type AddMemberInput = z.infer<typeof addMemberSchema>
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>
export type MinistryQueryInput = z.infer<typeof ministryQuerySchema>
