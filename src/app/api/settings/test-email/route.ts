import { NextRequest } from "next/server"
import { Resend } from "resend"
import { createDecipheriv, scryptSync } from "crypto"

import {
  apiError,
  apiSuccess,
  validateBody,
  withRole,
} from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { testEmailSchema } from "@/lib/validations/settings"

// Chave para criptografia
const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || "contagie-beta-settings-key-32ch"

function decrypt(encryptedText: string): string {
  try {
    const key = scryptSync(ENCRYPTION_KEY, "salt", 32)
    const [ivHex, encrypted] = encryptedText.split(":")
    if (!ivHex || !encrypted) return ""
    const iv = Buffer.from(ivHex, "hex")
    const decipher = createDecipheriv("aes-256-cbc", key, iv)
    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")
    return decrypted
  } catch {
    return ""
  }
}

// POST /api/settings/test-email - Enviar email de teste (apenas admin)
export async function POST(request: NextRequest) {
  return withRole(["ADMIN"], async (session) => {
    const bodyResult = await validateBody(request, testEmailSchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    const { to } = bodyResult.data

    try {
      // Buscar configuracoes do banco
      const [apiKeySetting, fromEmailSetting, appNameSetting] = await Promise.all([
        prisma.appSettings.findUnique({ where: { key: "RESEND_API_KEY" } }),
        prisma.appSettings.findUnique({ where: { key: "RESEND_FROM_EMAIL" } }),
        prisma.appSettings.findUnique({ where: { key: "APP_NAME" } }),
      ])

      // Obter API key (do banco ou variavel de ambiente)
      let apiKey = process.env.RESEND_API_KEY || ""
      if (apiKeySetting?.value) {
        const decrypted = decrypt(apiKeySetting.value)
        if (decrypted) {
          apiKey = decrypted
        }
      }

      if (!apiKey) {
        return apiError("Chave da API do Resend nao configurada", 400)
      }

      // Obter email de envio
      const fromEmail = fromEmailSetting?.value ||
        process.env.RESEND_FROM_EMAIL ||
        "Beta Church <noreply@beta.church>"

      // Obter nome da aplicacao
      const appName = appNameSetting?.value || "Beta Church"

      // Criar cliente Resend com a chave configurada
      const resend = new Resend(apiKey)

      // Enviar email de teste
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject: `[${appName}] Email de Teste`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">
                  Email de Teste - ${appName}
                </h1>
                <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                  Este e um email de teste enviado pelo sistema de configuracoes.
                </p>
                <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                  Se voce esta recebendo esta mensagem, a configuracao de email esta funcionando corretamente!
                </p>
                <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
                <p style="color: #888; font-size: 14px;">
                  Enviado por: ${session.user.email}<br>
                  Data: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </p>
              </div>
            </body>
          </html>
        `,
      })

      if (error) {
        console.error("[Settings] Erro ao enviar email de teste:", error)
        return apiError(`Erro ao enviar email: ${error.message}`, 400)
      }

      return apiSuccess({
        message: "Email de teste enviado com sucesso",
        emailId: data?.id,
        to,
      })
    } catch (error) {
      console.error("Erro ao enviar email de teste:", error)
      const message = error instanceof Error ? error.message : "Erro desconhecido"
      return apiError(`Erro ao enviar email de teste: ${message}`, 500)
    }
  })
}
