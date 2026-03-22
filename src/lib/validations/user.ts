import { z } from "zod"

// ============================================
// CPF VALIDATION
// ============================================

// Validacao de CPF brasileiro
export function validateCPF(cpf: string): boolean {
  // Remove caracteres nao numericos
  const cleanCPF = cpf.replace(/\D/g, "");

  if (cleanCPF.length !== 11) return false;

  // Verifica se todos os digitos sao iguais
  if (/^(\d)\1+$/.test(cleanCPF)) return false;

  // Validacao do primeiro digito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF[9])) return false;

  // Validacao do segundo digito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF[10])) return false;

  return true;
}

// Formatar CPF para exibicao
export function formatCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, "");
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// Limpar CPF para armazenamento
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

// ============================================
// PHONE VALIDATION
// ============================================

// Validacao de telefone brasileiro
export function validatePhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, "");
  // Aceita 10 ou 11 digitos (com ou sem 9)
  return clean.length === 10 || clean.length === 11;
}

// Formatar telefone para exibicao
export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  return clean.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
}

// ============================================
// USER ROLES
// ============================================

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

// ============================================
// INVITE USER SCHEMAS
// ============================================

// Schema Zod para criacao de usuario via convite
export const inviteUserSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no maximo 100 caracteres"),
  email: z
    .string()
    .email("Email invalido")
    .transform((v) => v.toLowerCase()),
  cpf: z
    .string()
    .min(11, "CPF invalido")
    .refine((val) => validateCPF(val), "CPF invalido")
    .transform((v) => cleanCPF(v)),
  phone: z
    .string()
    .min(10, "Telefone obrigatório")
    .refine((val) => validatePhone(val), "Telefone inválido")
    .transform((v) => v.replace(/\D/g, "")),
  birthDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  ministryId: z.string().min(1, "Ministerio obrigatorio"),
  positionIds: z.array(z.string().cuid()).optional(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

// Schema para definir senha
export const setPasswordSchema = z.object({
  token: z.string().min(1, "Token obrigatorio"),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .max(100, "Senha deve ter no maximo 100 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas nao conferem",
  path: ["confirmPassword"],
});

export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

// Schema para atualizar perfil com foto
export const updateProfileWithPhotoSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional().refine((val) => !val || validatePhone(val), "Telefone inválido"),
  image: z.string().url("URL inválida").optional().nullable(),
})
