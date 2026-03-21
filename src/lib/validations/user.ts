import { z } from "zod"

// Roles disponiveis no sistema
export const UserRole = z.enum(["ADMIN", "COORDINATOR", "LEADER", "COMMUNICATION", "VOLUNTEER"])
export type UserRole = z.infer<typeof UserRole>

// Schema para criar um novo usuario
export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no maximo 100 caracteres"),
  email: z.string().email("Email invalido"),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .max(100, "Senha deve ter no maximo 100 caracteres"),
  role: UserRole.default("VOLUNTEER"),
  image: z.string().url("URL da imagem invalida").optional().nullable(),
})

// Schema para atualizar um usuario (admin)
export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no maximo 100 caracteres")
    .optional(),
  email: z.string().email("Email invalido").optional(),
  role: UserRole.optional(),
  image: z.string().url("URL da imagem invalida").optional().nullable(),
})

// Schema para atualizar proprio perfil
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no maximo 100 caracteres")
    .optional(),
  image: z.string().url("URL da imagem invalida").optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, "Nova senha deve ter pelo menos 8 caracteres")
    .max(100, "Nova senha deve ter no maximo 100 caracteres")
    .optional(),
}).refine(
  (data) => {
    // Se newPassword foi fornecido, currentPassword tambem deve ser
    if (data.newPassword && !data.currentPassword) {
      return false
    }
    return true
  },
  {
    message: "Senha atual e obrigatoria para alterar a senha",
    path: ["currentPassword"],
  }
)

// Schema para filtros de listagem de usuarios
export const userQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1).optional(),
  limit: z.coerce.number().min(1).max(100).default(20).optional(),
  search: z.string().optional(),
  role: UserRole.optional(),
  ministryId: z.string().optional(),
})

// Types inferidos dos schemas
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UserQueryInput = z.infer<typeof userQuerySchema>
