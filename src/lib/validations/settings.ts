import { z } from "zod"

// ============================================
// SETTINGS SCHEMAS
// ============================================

// Chaves de configuracao disponiveis
export const SettingKey = z.enum([
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "APP_NAME",
  // Cloudflare R2 Storage
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
  // ProPresenter
  "PROPRESENTER_HOST",
  "PROPRESENTER_PORT",
])
export type SettingKey = z.infer<typeof SettingKey>

// Configuracoes que devem ser criptografadas
export const ENCRYPTED_SETTINGS: SettingKey[] = [
  "RESEND_API_KEY",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
]

// Schema para atualizar uma configuracao
export const updateSettingSchema = z.object({
  key: SettingKey,
  value: z.string().min(1, "Valor obrigatório"),
})

// Schema para atualizar multiplas configuracoes
export const updateSettingsSchema = z.object({
  settings: z.array(updateSettingSchema).min(1, "Pelo menos uma configuração obrigatória"),
})

// Schema para testar email
export const testEmailSchema = z.object({
  to: z.string().email("Email inválido"),
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
  // R2
  R2_ACCOUNT_ID: "",
  R2_ACCESS_KEY_ID: "",
  R2_SECRET_ACCESS_KEY: "",
  R2_BUCKET_NAME: "",
  R2_PUBLIC_URL: "",
  // ProPresenter
  PROPRESENTER_HOST: "localhost",
  PROPRESENTER_PORT: "1025",
}

// Labels para configuracoes
export const SETTING_LABELS: Record<SettingKey, string> = {
  RESEND_API_KEY: "Chave da API do Resend",
  RESEND_FROM_EMAIL: "Email de Envio",
  APP_NAME: "Nome da Aplicação",
  // R2
  R2_ACCOUNT_ID: "Account ID",
  R2_ACCESS_KEY_ID: "Access Key ID",
  R2_SECRET_ACCESS_KEY: "Secret Access Key",
  R2_BUCKET_NAME: "Nome do Bucket",
  R2_PUBLIC_URL: "URL Pública",
  // ProPresenter
  PROPRESENTER_HOST: "Host/IP",
  PROPRESENTER_PORT: "Porta",
}

// Descricoes para configuracoes
export const SETTING_DESCRIPTIONS: Record<SettingKey, string> = {
  RESEND_API_KEY: "Chave de acesso da API do Resend para envio de emails",
  RESEND_FROM_EMAIL: "Email que aparecerá como remetente nas notificações",
  APP_NAME: "Nome exibido na aplicação e nos emails",
  // R2
  R2_ACCOUNT_ID: "ID da conta Cloudflare (encontre em cloudflare.com > R2 > Manage R2 API Tokens)",
  R2_ACCESS_KEY_ID: "Access Key ID do token R2",
  R2_SECRET_ACCESS_KEY: "Secret Access Key do token R2",
  R2_BUCKET_NAME: "Nome do bucket R2 criado para armazenar os arquivos",
  R2_PUBLIC_URL: "URL pública do bucket (ex: https://pub-xxx.r2.dev ou domínio customizado)",
  // ProPresenter
  PROPRESENTER_HOST: "IP ou hostname do computador com ProPresenter (ex: localhost, 192.168.1.100)",
  PROPRESENTER_PORT: "Porta da API do ProPresenter (padrão: 1025)",
}
