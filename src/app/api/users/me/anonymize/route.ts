import { type NextRequest } from "next/server"
import { randomUUID } from "crypto"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * DELETE /api/users/me
 * (montado em /api/users/me/anonymize para evitar conflito com o PATCH no route.ts)
 *
 * Anonimiza o usuario autenticado de acordo com a LGPD (Art. 18, IV — exclusao).
 * O registro NAO e removido para preservar integridade de escalas historicas.
 * Os dados pessoais identificadores sao substituidos por valores neutros.
 */
export async function DELETE(_request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return Response.json({ error: "Não autorizado" }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const uniqueSuffix = randomUUID().replace(/-/g, "")

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: "Usuário removido",
        email: `removed-${uniqueSuffix}@example.invalid`,
        phone: null,
        image: null,
        password: null,
        active: false,
        // Limpar campos adicionais de identificacao
        cpf: null,
        birthDate: null,
        inviteToken: null,
        inviteExpires: null,
      },
    })

    // Invalidar sessoes ativas do usuario
    await prisma.session.deleteMany({ where: { userId } })

    return Response.json(
      { message: "Conta anonimizada com sucesso. Seus dados pessoais foram removidos." },
      { status: 200 }
    )
  } catch (error) {
    console.error("[LGPD/Anonymize] Erro ao anonimizar usuario:", error)
    return Response.json({ error: "Erro ao processar solicitação de remoção" }, { status: 500 })
  }
}
