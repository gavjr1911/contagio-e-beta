import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * Get the current authenticated user with full data from database
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return user
}

/**
 * Require authentication - redirects to login if not authenticated
 * Use this in Server Components or Server Actions
 */
export async function requireAuth() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return session
}

/**
 * Require specific role(s) - redirects to unauthorized page if role doesn't match
 * Use this in Server Components or Server Actions
 * @param allowedRoles - Array of allowed roles
 */
export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth()

  if (!session.user.role || !allowedRoles.includes(session.user.role)) {
    redirect("/unauthorized")
  }

  return session
}

/**
 * Check if current user has a specific role
 * Returns boolean instead of redirecting
 */
export async function hasRole(role: string): Promise<boolean> {
  const session = await auth()

  if (!session?.user?.role) {
    return false
  }

  return session.user.role === role
}

/**
 * Check if current user has any of the specified roles
 * Returns boolean instead of redirecting
 */
export async function hasAnyRole(roles: string[]): Promise<boolean> {
  const session = await auth()

  if (!session?.user?.role) {
    return false
  }

  return roles.includes(session.user.role)
}

/**
 * Get the current session without redirecting
 * Useful when you need to check auth status without forcing a redirect
 */
export async function getSession() {
  return await auth()
}
