import { NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError, withRole } from "@/lib/api-utils"
import { generateResetToken } from "@/lib/auth-tokens"
import { sendPasswordReset } from "@/lib/email/send"

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/users/[id]/send-reset - Reenvia link de acesso/redefinição (ADMIN)
export async function POST(_request: NextRequest, { params }: RouteParams) {
  return withRole(["ADMIN"], async () => {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, active: true },
    })

    if (!user) {
      return apiError("Usuário não encontrado", 404)
    }
    if (!user.active) {
      return apiError("Usuário inativo — reative-o antes de enviar o acesso", 400)
    }

    // Admin envia com validade maior (24h) para dar tempo ao usuário.
    const { token, expires } = generateResetToken(24)
    await prisma.user.update({
      where: { id: user.id },
      data: { inviteToken: token, inviteExpires: expires },
    })

    try {
      await sendPasswordReset({
        name: user.name,
        email: user.email,
        token,
        expiresAt: expires,
        byAdmin: true,
      })
    } catch (emailError) {
      console.error("[SendReset] Erro ao enviar email:", emailError)
      return apiError("Não foi possível enviar o email. Tente novamente.", 502)
    }

    return apiSuccess({
      message: `Link de acesso enviado para ${user.email}`,
      email: user.email,
    })
  })
}
