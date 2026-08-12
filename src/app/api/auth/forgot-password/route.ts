import { NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import { apiSuccess, apiError, validateBody } from "@/lib/api-utils"
import { forgotPasswordSchema } from "@/lib/validations/user"
import { generateResetToken } from "@/lib/auth-tokens"
import { sendPasswordReset } from "@/lib/email/send"
import { isBlocked, hit } from "@/lib/rate-limit"

// Resposta genérica — NÃO revela se o email existe (evita enumeração de usuários).
const GENERIC_OK = {
  message:
    "Se houver uma conta com este email, enviamos um link para redefinir a senha.",
}

const RATE_MAX = 5 // tentativas por janela
const RATE_WINDOW_MS = 15 * 60 * 1000 // 15 min

function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]!.trim()
  return request.headers.get("x-real-ip") ?? "unknown"
}

export async function POST(request: NextRequest) {
  const validation = await validateBody(request, forgotPasswordSchema)
  if (!validation.success) {
    return validation.response
  }

  const email = validation.data.email.toLowerCase().trim()

  // Rate limit por IP e por email (best-effort no IP; email é a chave principal).
  const ipKey = `forgot:ip:${getClientIp(request)}`
  const emailKey = `forgot:email:${email}`
  if (
    isBlocked(ipKey, RATE_MAX, RATE_WINDOW_MS) ||
    isBlocked(emailKey, RATE_MAX, RATE_WINDOW_MS)
  ) {
    // Mesmo bloqueado, devolve a resposta genérica (não vaza estado).
    return apiSuccess(GENERIC_OK)
  }
  hit(ipKey, RATE_MAX, RATE_WINDOW_MS)
  hit(emailKey, RATE_MAX, RATE_WINDOW_MS)

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, active: true },
    })

    // Só envia para contas existentes e ativas — mas a resposta é sempre genérica.
    if (user && user.active) {
      const { token, expires } = generateResetToken(2)
      await prisma.user.update({
        where: { id: user.id },
        data: { inviteToken: token, inviteExpires: expires },
      })
      try {
        // Resposta ao cliente é sempre genérica (não revela se a conta existe),
        // mas a falha precisa ficar registrada: `sendPasswordReset` não lança,
        // devolve `{ success: false }`.
        const sendResult = await sendPasswordReset({
          name: user.name,
          email: user.email,
          token,
          expiresAt: expires,
        })
        if (!sendResult.success) {
          console.error("[ForgotPassword] Falha ao enviar email:", sendResult.error)
        }
      } catch (emailError) {
        console.error("[ForgotPassword] Erro ao enviar email:", emailError)
        // Não vaza a falha ao cliente.
      }
    }

    return apiSuccess(GENERIC_OK)
  } catch (error) {
    console.error("[ForgotPassword] Erro:", error)
    return apiError("Erro ao processar solicitação", 500)
  }
}
