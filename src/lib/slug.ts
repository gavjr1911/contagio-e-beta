/**
 * Helpers para geração de slugs de URL.
 *
 * Convenção do projeto:
 *   slug do evento = slugify(nome) + "-" + YYYY-MM-DD + "-" + HH-mm
 *   ex.: "culto-de-domingo-2026-04-19-10-00"
 */

import { formatDateToISO, formatTimeToHHMM } from "@/lib/date-utils"

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

/**
 * Gera o slug determinístico de um evento a partir de nome, data e horário.
 * Aceita tanto Date quanto string YYYY-MM-DD / HH:mm.
 */
export function buildEventSlug(input: {
  name: string
  date: Date | string
  startTime: Date | string
}): string {
  const dateStr =
    typeof input.date === "string" ? input.date.slice(0, 10) : formatDateToISO(input.date)
  const timeStr =
    typeof input.startTime === "string"
      ? input.startTime.slice(0, 5).replace(":", "-")
      : formatTimeToHHMM(input.startTime).replace(":", "-")
  return `${slugify(input.name)}-${dateStr}-${timeStr}`
}

/**
 * Verifica se uma string parece um cuid (formato gerado pelo Prisma @default(cuid())).
 * Usado para distinguir id legado de slug em rotas dinâmicas.
 */
export function looksLikeCuid(value: string): boolean {
  return /^c[a-z0-9]{20,}$/i.test(value)
}
