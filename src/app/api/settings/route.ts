import { NextRequest } from "next/server"

import {
  apiError,
  apiSuccess,
  validateBody,
  withRole,
} from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { encrypt, decrypt, maskEncryptedValue } from "@/lib/crypto"
import {
  updateSettingsSchema,
  ENCRYPTED_SETTINGS,
  SettingKey,
  DEFAULT_SETTINGS,
} from "@/lib/validations/settings"

// GET /api/settings - Listar configuracoes (apenas admin)
export async function GET() {
  return withRole(["ADMIN"], async () => {
    try {
      const settings = await prisma.appSettings.findMany({
        orderBy: { key: "asc" },
      })

      // Mapear configuracoes com valores padroes
      const allKeys = Object.keys(DEFAULT_SETTINGS) as SettingKey[]
      const settingsMap = new Map(settings.map((s) => [s.key, s]))

      const result = allKeys.map((key) => {
        const setting = settingsMap.get(key)
        const isEncrypted = ENCRYPTED_SETTINGS.includes(key)

        if (!setting) {
          return {
            key,
            value: isEncrypted ? "" : DEFAULT_SETTINGS[key],
            encrypted: isEncrypted,
            updatedAt: null,
          }
        }

        let displayValue = setting.value
        if (setting.encrypted) {
          const decrypted = decrypt(setting.value)
          displayValue = decrypted ? maskEncryptedValue(decrypted) : ""
        }

        return {
          key: setting.key,
          value: displayValue,
          encrypted: setting.encrypted,
          updatedAt: setting.updatedAt.toISOString(),
        }
      })

      return apiSuccess(result)
    } catch (error) {
      console.error("Erro ao listar configuracoes:", error)
      return apiError("Erro ao listar configuracoes", 500)
    }
  })
}

// POST /api/settings - Atualizar configuracoes (apenas admin)
export async function POST(request: NextRequest) {
  return withRole(["ADMIN"], async () => {
    const bodyResult = await validateBody(request, updateSettingsSchema)

    if (!bodyResult.success) {
      return bodyResult.response
    }

    const { settings } = bodyResult.data

    try {
      const results = await Promise.all(
        settings.map(async ({ key, value }) => {
          const isEncrypted = ENCRYPTED_SETTINGS.includes(key)
          const storedValue = isEncrypted ? encrypt(value) : value

          return prisma.appSettings.upsert({
            where: { key },
            create: {
              key,
              value: storedValue,
              encrypted: isEncrypted,
            },
            update: {
              value: storedValue,
              encrypted: isEncrypted,
            },
          })
        })
      )

      // Retornar configuracoes atualizadas (mascarando valores encriptados)
      const response = results.map((setting) => ({
        key: setting.key,
        value: setting.encrypted
          ? maskEncryptedValue(decrypt(setting.value))
          : setting.value,
        encrypted: setting.encrypted,
        updatedAt: setting.updatedAt.toISOString(),
      }))

      return apiSuccess(response)
    } catch (error) {
      console.error("Erro ao atualizar configuracoes:", error)
      return apiError("Erro ao atualizar configuracoes", 500)
    }
  })
}

// PATCH /api/settings - Alias para POST (atualizar configuracoes)
export async function PATCH(request: NextRequest) {
  return POST(request)
}
