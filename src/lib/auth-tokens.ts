import { randomBytes, randomUUID } from "crypto"

/**
 * Gera um token de redefinição de senha (reusa o mecanismo inviteToken/inviteExpires).
 * @param hours validade em horas (padrão 2h para reset self-service).
 */
export function generateResetToken(hours = 2): { token: string; expires: Date } {
  return {
    token: randomUUID(),
    expires: new Date(Date.now() + hours * 60 * 60 * 1000),
  }
}

// Alfabeto sem caracteres ambíguos (0/O, 1/l/I) para senha temporária legível.
const TEMP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"

/**
 * Gera uma senha temporária aleatória e legível (padrão 12 caracteres).
 * Usa randomBytes (CSPRNG) com rejeição de módulo enviesado.
 */
export function generateTempPassword(length = 12): string {
  const out: string[] = []
  const max = Math.floor(256 / TEMP_ALPHABET.length) * TEMP_ALPHABET.length
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < max) {
        out.push(TEMP_ALPHABET[byte % TEMP_ALPHABET.length])
        if (out.length === length) break
      }
    }
  }
  return out.join("")
}
