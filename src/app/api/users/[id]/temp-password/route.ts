import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"

import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError, withRole } from "@/lib/api-utils"
import { generateTempPassword } from "@/lib/auth-tokens"

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/users/[id]/temp-password - Gera senha temporária (ADMIN)
// Retorna a senha em texto puro UMA vez para o admin repassar ao usuário.
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
      return apiError("Usuário inativo — reative-o antes de gerar a senha", 400)
    }

    const tempPassword = generateTempPassword(12)
    const hashed = await bcrypt.hash(tempPassword, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        emailVerified: new Date(),
        // invalida qualquer token de convite/reset pendente
        inviteToken: null,
        inviteExpires: null,
      },
    })

    return apiSuccess({
      message: "Senha temporária gerada",
      email: user.email,
      tempPassword,
    })
  })
}
