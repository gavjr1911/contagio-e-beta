import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

// Chave para criptografia — obrigatoria em todos os ambientes
const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  throw new Error("SETTINGS_ENCRYPTION_KEY não configurada — defina a variável de ambiente");
}

/**
 * Criptografa um texto usando AES-256-CBC com salt aleatorio por registro.
 *
 * Formato de saida: salt:iv:ciphertext  (todos em hex, separados por ":")
 *
 * O salt aleatorio impede ataques de dicionario mesmo que a mesma chave
 * mestra seja reutilizada entre registros.
 */
export function encrypt(text: string): string {
  const salt = randomBytes(16)
  const key = scryptSync(ENCRYPTION_KEY as string, salt, 32)
  const iv = randomBytes(16)
  const cipher = createCipheriv("aes-256-cbc", key, iv)
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  return salt.toString("hex") + ":" + iv.toString("hex") + ":" + encrypted
}

/**
 * Descriptografa um texto criptografado com encrypt().
 *
 * Suporta dois formatos para compatibilidade retroativa:
 *   - Novo  (v2): salt:iv:ciphertext  — 3 partes
 *   - Legado (v1): iv:ciphertext      — 2 partes (salt fixo "salt")
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(":")

    if (parts.length === 3) {
      // Formato v2: salt:iv:ciphertext
      const [saltHex, ivHex, encrypted] = parts
      if (!saltHex || !ivHex || !encrypted) return ""
      const salt = Buffer.from(saltHex, "hex")
      const key = scryptSync(ENCRYPTION_KEY as string, salt, 32)
      const iv = Buffer.from(ivHex, "hex")
      const decipher = createDecipheriv("aes-256-cbc", key, iv)
      let decrypted = decipher.update(encrypted, "hex", "utf8")
      decrypted += decipher.final("utf8")
      return decrypted
    }

    if (parts.length === 2) {
      // Formato legado v1: iv:ciphertext — salt fixo "salt"
      const [ivHex, encrypted] = parts
      if (!ivHex || !encrypted) return ""
      const key = scryptSync(ENCRYPTION_KEY as string, "salt", 32)
      const iv = Buffer.from(ivHex, "hex")
      const decipher = createDecipheriv("aes-256-cbc", key, iv)
      let decrypted = decipher.update(encrypted, "hex", "utf8")
      decrypted += decipher.final("utf8")
      return decrypted
    }

    return ""
  } catch {
    return ""
  }
}

/**
 * Mascara valor encriptado para exibicao
 */
export function maskEncryptedValue(value: string): string {
  if (!value || value.length < 8) return "****"
  return value.substring(0, 4) + "****" + value.substring(value.length - 4)
}
