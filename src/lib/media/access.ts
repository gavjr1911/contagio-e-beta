import { prisma } from "@/lib/prisma"
import { resolveUserPermissions } from "@/lib/permissions/resolver"
import { hasPermission } from "@/lib/permissions/check"

/**
 * Quem pode VER a mídia de um evento.
 *
 * Espelha exatamente a regra que a tela já usa em
 * `src/app/(dashboard)/eventos/[id]/page.tsx:177`:
 * ADMIN, ou quem tem `media:view`, ou quem está escalado para aquele evento.
 *
 * O terceiro caso importa: um voluntário escalado enxerga a aba de mídia sem
 * ter `media:view` no ministério. Sem esse ramo aqui, o servidor devolveria 403
 * para uma tela que o próprio app mostra — inclusive na rota de download, onde
 * o erro apareceria como JSON cru numa página em branco.
 */
export async function canViewEventMedia(
  userId: string,
  role: string,
  eventId: string | null
): Promise<boolean> {
  if (role === "ADMIN") return true

  const permissions = await resolveUserPermissions(userId, role)
  if (hasPermission(permissions, "media", "view")) return true

  if (!eventId) return false

  const escalado = await prisma.schedule.findFirst({
    where: { eventId, userId },
    select: { id: true },
  })
  return escalado !== null
}
