import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError } from "@/lib/api-utils"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  if (!token) {
    return apiSuccess({ valid: false })
  }

  try {
    // Buscar usuario pelo token
    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      select: {
        id: true,
        name: true,
        email: true,
        inviteExpires: true,
      },
    })

    if (!user) {
      return apiSuccess({ valid: false })
    }

    // Verificar se token expirou
    if (!user.inviteExpires || user.inviteExpires < new Date()) {
      return apiSuccess({ valid: false, expired: true })
    }

    return apiSuccess({
      valid: true,
      name: user.name,
    })
  } catch (error) {
    console.error("[VerifyInvite] Erro:", error)
    return apiError("Erro ao verificar convite", 500)
  }
}
