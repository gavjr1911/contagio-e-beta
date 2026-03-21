import { PrismaAdapter } from "@auth/prisma-adapter"
import { compare } from "bcryptjs"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Resend from "next-auth/providers/resend"

import { prisma } from "@/lib/prisma"

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await compare(password, user.password)

        if (!isPasswordValid) {
          return null
        }

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
