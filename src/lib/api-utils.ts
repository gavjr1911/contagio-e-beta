import { NextRequest, NextResponse } from "next/server"
import { ZodError, ZodSchema } from "zod"

import { auth } from "@/auth"
import type { UserRole } from "@/lib/validations/user"

// Tipos para respostas padronizadas
export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
  details?: Record<string, string[]>
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// Tipo para sessao autenticada
export interface AuthSession {
  user: {
    id: string
    email: string
    name?: string | null
    role: string
  }
}

// Funcao para criar resposta de sucesso
export function apiSuccess<T>(data: T, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

// Funcao para criar resposta de erro
export function apiError(
  error: string,
  status: number = 400,
  details?: Record<string, string[]>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ success: false, error, details }, { status })
}

// Funcao para formatar erros do Zod
export function formatZodError(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {}

  for (const issue of error.issues) {
    const path = issue.path.join(".")
    if (!details[path]) {
      details[path] = []
    }
    details[path].push(issue.message)
  }

  return details
}

// Funcao para validar body com schema Zod
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse<ApiErrorResponse> }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        response: apiError("Dados invalidos", 400, formatZodError(error)),
      }
    }
    if (error instanceof SyntaxError) {
      return {
        success: false,
        response: apiError("JSON invalido", 400),
      }
    }
    return {
      success: false,
      response: apiError("Erro ao processar requisicao", 500),
    }
  }
}

// Funcao para validar query params com schema Zod
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; response: NextResponse<ApiErrorResponse> } {
  try {
    const params: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      params[key] = value
    })
    const data = schema.parse(params)
    return { success: true, data }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        response: apiError("Parametros invalidos", 400, formatZodError(error)),
      }
    }
    return {
      success: false,
      response: apiError("Erro ao processar parametros", 500),
    }
  }
}

// Wrapper para verificar autenticacao
export async function withAuth(
  handler: (session: AuthSession) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await auth()

  if (!session?.user) {
    return apiError("Nao autenticado", 401)
  }

  return handler(session as AuthSession)
}

// Wrapper para verificar permissao por role
export async function withRole(
  roles: UserRole[],
  handler: (session: AuthSession) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await auth()

  if (!session?.user) {
    return apiError("Nao autenticado", 401)
  }

  const userRole = session.user.role as UserRole

  if (!roles.includes(userRole)) {
    return apiError("Permissao negada", 403)
  }

  return handler(session as AuthSession)
}

// Funcao auxiliar para verificar se usuario e admin
export function isAdmin(session: AuthSession): boolean {
  return session.user.role === "ADMIN"
}

// Funcao auxiliar para verificar se usuario e lider
export function isLeader(session: AuthSession): boolean {
  return session.user.role === "LEADER" || session.user.role === "ADMIN"
}

// Funcao auxiliar para verificar se usuario e coordenador
export function isCoordinator(session: AuthSession): boolean {
  return session.user.role === "COORDINATOR" || session.user.role === "ADMIN"
}

// Funcao para extrair ID dos parametros da rota
export function getRouteParam(params: Promise<{ [key: string]: string }>, key: string): Promise<string> {
  return params.then(p => p[key])
}

// Funcao para paginacao
export function getPaginationParams(page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit
  return { skip, take: limit }
}

// Tipo para resposta paginada
export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Funcao para criar resposta paginada
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
