import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { apiError, type AuthSession } from "@/lib/api-utils"

// Nome do ministerio que tem permissao para gerenciar checklists
export const CERIMONIAL_MINISTRY_NAME = "Contagie - Cerimonial"

/**
 * Verifica se um usuario e membro do ministerio Cerimonial
 */
export async function isCerimonialMember(userId: string): Promise<boolean> {
  const membership = await prisma.ministryMember.findFirst({
    where: {
      userId,
      active: true,
      ministry: {
        name: CERIMONIAL_MINISTRY_NAME,
      },
    },
  })
  return !!membership
}

/**
 * Wrapper para verificar se usuario e membro do Cerimonial
 * Usado em APIs que requerem permissao especial para gerenciar checklists de eventos
 */
export async function withCerimonial(
  handler: (session: AuthSession) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await auth()

  if (!session?.user) {
    return apiError("Nao autenticado", 401)
  }

  // Admin sempre tem acesso
  if (session.user.role === "ADMIN") {
    return handler(session as AuthSession)
  }

  const hasPermission = await isCerimonialMember(session.user.id)
  if (!hasPermission) {
    return apiError("Apenas membros do Cerimonial podem realizar esta acao", 403)
  }

  return handler(session as AuthSession)
}

/**
 * Verifica se usuario pode visualizar checklist (qualquer usuario autenticado)
 */
export async function canViewChecklist(userId: string): Promise<boolean> {
  return !!userId
}

/**
 * Verifica se usuario pode editar checklist (marcar itens, adicionar extras)
 */
export async function canEditChecklist(userId: string, userRole: string): Promise<boolean> {
  // Admin sempre pode
  if (userRole === "ADMIN") {
    return true
  }

  // Outros usuarios precisam ser membros do Cerimonial
  return isCerimonialMember(userId)
}
