import { z } from "zod"

import { FESTIVAL_STATE_KEYS } from "@/lib/festival/data"

/**
 * Normaliza um telefone para apenas dígitos.
 * Usado como identificador único do voto (1 voto por telefone).
 */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "")
}

const stateKey = z.enum(FESTIVAL_STATE_KEYS, {
  message: "Selecione uma barraca válida",
})

export const festivalVoteSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Informe seu nome completo")
    .max(120, "Nome muito longo")
    // exige ao menos duas palavras (nome + sobrenome)
    .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, {
      message: "Informe seu nome completo (nome e sobrenome)",
    }),
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((v) => v.length >= 10 && v.length <= 13, {
      message: "Telefone inválido (informe DDD + número)",
    }),
  barracaBonita: stateKey,
  melhorAtendimento: stateKey,
  gastronomiaSalgada: stateKey,
  gastronomiaDoce: stateKey,
  espiritoBeta: stateKey,
})

export type FestivalVoteInput = z.infer<typeof festivalVoteSchema>
