import { NextRequest } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError, validateBody } from "@/lib/api-utils"
import { setPasswordSchema } from "@/lib/validations/user"

export async function POST(request: NextRequest) {
  // Validar body
  const validation = await validateBody(request, setPasswordSchema)
  if (!validation.success) {
    return validation.response
  }

  const { token, password } = validation.data

  try {
    // Buscar usuario pelo token
    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
    })

    if (!user) {
      return apiError("Token de convite invalido", 400)
    }

    // Verificar se token expirou
    if (!user.inviteExpires || user.inviteExpires < new Date()) {
      return apiError("Token de convite expirado", 400)
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12)

    // Atualizar usuario
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        emailVerified: new Date(),
        inviteToken: null,
        inviteExpires: null,
      },
    })

    return apiSuccess({
      message: "Senha definida com sucesso",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    console.error("[SetPassword] Erro:", error)
    return apiError("Erro ao definir senha", 500)
  }
}
