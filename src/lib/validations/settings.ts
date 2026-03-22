import { z } from "zod"

// ============================================
// SETTINGS SCHEMAS
// ============================================

// Chaves de configuracao disponiveis
export const SettingKey = z.enum([
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "APP_NAME",
])
export type SettingKey = z.infer<typeof SettingKey>

// Configuracoes que devem ser criptografadas
export const ENCRYPTED_SETTINGS: SettingKey[] = ["RESEND_API_KEY"]

// Schema para atualizar uma configuracao
export const updateSettingSchema = z.object({
  key: SettingKey,
  value: z.string().min(1, "Valor obrigatorio"),
})

// Schema para atualizar multiplas configuracoes
export const updateSettingsSchema = z.object({
  settings: z.array(updateSettingSchema).min(1, "Pelo menos uma configuracao obrigatoria"),
})

// Schema para testar email
export const testEmailSchema = z.object({
  to: z.string().email("Email invalido"),
})

// Types inferidos
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
export type TestEmailInput = z.infer<typeof testEmailSchema>

// Interface para configuracao retornada pela API
export interface SettingResponse {
  key: SettingKey
  value: string
  encrypted: boolean
  updatedAt: string
}

// Valores padrao para configuracoes
export const DEFAULT_SETTINGS: Record<SettingKey, string> = {
  RESEND_API_KEY: "",
  RESEND_FROM_EMAIL: "Beta Church <noreply@beta.church>",
  APP_NAME: "Beta Church",
}

// Labels para configuracoes
export const SETTING_LABELS: Record<SettingKey, string> = {
  RESEND_API_KEY: "Chave da API do Resend",
  RESEND_FROM_EMAIL: "Email de Envio",
  APP_NAME: "Nome da Aplicacao",
}

// Descricoes para configuracoes
export const SETTING_DESCRIPTIONS: Record<SettingKey, string> = {
  RESEND_API_KEY: "Chave de acesso da API do Resend para envio de emails",
  RESEND_FROM_EMAIL: "Email que aparecera como remetente nas notificacoes",
  APP_NAME: "Nome exibido na aplicacao e nos emails",
}
