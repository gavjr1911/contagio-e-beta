import { prisma } from "@/lib/prisma"
import { looksLikeCuid } from "@/lib/slug"

/**
 * Resolve um identificador (cuid ou slug) para o id real do evento.
 * Retorna o id (cuid) se encontrado, ou null caso contrário.
 *
 * Permite que rotas dinâmicas (`/api/events/[id]/...`) aceitem tanto o id
 * antigo quanto o slug humano sem mudar a assinatura externa.
 */
export async function resolveEventId(idOrSlug: string): Promise<string | null> {
  // Se parece com cuid, tenta primeiro como id direto
  if (looksLikeCuid(idOrSlug)) {
    const byId = await prisma.event.findUnique({
      where: { id: idOrSlug },
      select: { id: true },
    })
    if (byId) return byId.id
  }
  // Tenta como slug
  const bySlug = await prisma.event.findUnique({
    where: { slug: idOrSlug },
    select: { id: true },
  })
  return bySlug?.id ?? null
}
