import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { auth } from "@/auth"

// Routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/set-password", // definir senha via token de convite (valida em /api/auth/verify-invite)
  "/offline", // fallback do service worker (PWA)
  "/sw.js", // service worker — NUNCA redirecionar (senão o SW recebe HTML e quebra)
  "/manifest.webmanifest", // manifest do PWA
]

// Routes that start with these prefixes are public
const publicPrefixes = [
  "/auth/",
  "/api/auth/",
  "/api/cron/", // protegidas pelo CRON_SECRET na própria rota
  "/api/email/confirm/", // links de email (confirm/decline) — protegidas por token HMAC na própria rota
]

function isPublicRoute(pathname: string): boolean {
  // Check exact matches
  if (publicRoutes.includes(pathname)) {
    return true
  }

  // Check prefix matches
  for (const prefix of publicPrefixes) {
    if (pathname.startsWith(prefix)) {
      return true
    }
  }

  return false
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Check authentication
  const session = await auth()

  if (!session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
