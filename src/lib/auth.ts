import { PrismaAdapter } from "@auth/prisma-adapter"
import { compare } from "bcryptjs"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Resend from "next-auth/providers/resend"

import { prisma } from "@/lib/prisma"
import { hit, isBlocked, reset } from "@/lib/rate-limit"

// Rate limit do login por credenciais: tentativas FALHAS por IP e por email.
//
// A chave por EMAIL é a defesa principal contra força-bruta de uma conta: não
// depende de headers e não é contornável. A chave por IP é best-effort —
// `x-forwarded-for` pode ser forjado pelo cliente, então serve só como camada
// extra. Trade-off conhecido: um atacante que saiba o email de alguém pode
// disparar falhas e bloquear aquele login por 15 min (account-lockout DoS);
// aceitável para o porte deste app (instância única, público restrito).
const LOGIN_MAX_ATTEMPTS = 8
const LOGIN_WINDOW_MS = 15 * 60 * 1000 // 15 minutos

function getClientIp(request?: Request): string {
  const forwarded = request?.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return request?.headers.get("x-real-ip") || "unknown"
}

export const authConfig: NextAuthConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        // Rate limiting: bloqueia força-bruta por IP e por email.
        const ipKey = `login:ip:${getClientIp(request)}`
        const emailKey = `login:email:${email.toLowerCase().trim()}`
        if (
          isBlocked(ipKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS) ||
          isBlocked(emailKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)
        ) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.password) {
          hit(ipKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)
          hit(emailKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)
          return null
        }

        const isPasswordValid = await compare(password, user.password)

        if (!isPasswordValid) {
          hit(ipKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)
          hit(emailKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)
          return null
        }

        // Sucesso: zera os contadores para não penalizar o usuário legítimo.
        reset(ipKey)
        reset(emailKey)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM || "noreply@example.com",
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? ""
        token.role = user.role ?? "VOLUNTEER"
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
}
