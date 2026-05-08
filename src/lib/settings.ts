import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"
import { ENCRYPTED_SETTINGS, DEFAULT_SETTINGS, type SettingKey } from "@/lib/validations/settings"

/**
 * Obtem o valor de uma configuracao do banco de dados
 * @param key - Chave da configuracao
 * @returns Valor da configuracao (descriptografado se necessario) ou valor padrao
 */
export async function getSetting(key: SettingKey): Promise<string> {
  try {
    const setting = await prisma.appSettings.findUnique({
      where: { key },
    })

    if (!setting) {
      return DEFAULT_SETTINGS[key]
    }

    // Descriptografar se necessario
    if (setting.encrypted) {
      const decrypted = decrypt(setting.value)
      return decrypted || DEFAULT_SETTINGS[key]
    }

    return setting.value
  } catch (error) {
    console.error(`Erro ao obter configuracao ${key}:`, error)
    return DEFAULT_SETTINGS[key]
  }
}

/**
 * Obtem multiplas configuracoes de uma vez
 * @param keys - Array de chaves das configuracoes
 * @returns Objeto com as configuracoes
 */
export async function getSettings<K extends SettingKey>(
  keys: K[]
): Promise<Record<K, string>> {
  try {
    const settings = await prisma.appSettings.findMany({
      where: { key: { in: keys } },
    })

    const settingsMap = new Map(settings.map((s) => [s.key, s]))
    const result = {} as Record<K, string>

    for (const key of keys) {
      const setting = settingsMap.get(key)

      if (!setting) {
        result[key] = DEFAULT_SETTINGS[key]
        continue
      }

      if (setting.encrypted) {
        const decrypted = decrypt(setting.value)
        result[key] = decrypted || DEFAULT_SETTINGS[key]
      } else {
        result[key] = setting.value
      }
    }

    return result
  } catch (error) {
    console.error("Erro ao obter configuracoes:", error)
    // Retorna valores padrao em caso de erro
    const result = {} as Record<K, string>
    for (const key of keys) {
      result[key] = DEFAULT_SETTINGS[key]
    }
    return result
  }
}

/**
 * Obtem as configuracoes do ProPresenter
 * @returns Host e porta do ProPresenter
 */
export async function getProPresenterConfig(): Promise<{ host: string; port: number }> {
  const settings = await getSettings(["PROPRESENTER_HOST", "PROPRESENTER_PORT"])

  return {
    host: settings.PROPRESENTER_HOST || "localhost",
    port: parseInt(settings.PROPRESENTER_PORT || "1025", 10),
  }
}
