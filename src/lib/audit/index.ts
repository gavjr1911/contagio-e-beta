/**
 * Sistema de Auditoria - Historico de Mudancas
 *
 * Este modulo fornece funcionalidades para registrar e consultar
 * o historico de mudancas nas escalas, eventos e outros recursos.
 */

import { prisma } from "@/lib/prisma"

// Tipos de entidades que podem ser auditadas
export type AuditEntityType = "Schedule" | "Event" | "EventItem" | "EventVacancy"

// Acoes que podem ser registradas
export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "confirmed"
  | "declined"
  | "assigned"
  | "unassigned"

// Interface para registrar um log de auditoria
export interface LogAuditParams {
  entityType: AuditEntityType
  entityId: string
  action: AuditAction
  userId?: string | null
  userEmail?: string | null
  userName?: string | null
  changes?: Record<string, { old: unknown; new: unknown }> | null
  metadata?: Record<string, unknown> | null
}

// Interface para consultar logs de auditoria
export interface AuditLogFilters {
  entityType?: AuditEntityType
  entityId?: string
  userId?: string
  action?: AuditAction
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
  /** Quando definido, restringe os logs aos ministerios cujos IDs estao nesta lista (escopo LEADER) */
  leaderMinistryIds?: string[]
}

// Campos sensiveis que devem ser removidos dos logs
const SENSITIVE_FIELDS = [
  "password",
  "passwordHash",
  "token",
  "secret",
  "accessToken",
  "refreshToken",
  "apiKey",
  "cpf",
]

/**
 * Remove campos sensiveis de um objeto
 */
export function sanitizeData<T extends Record<string, unknown>>(
  data: T
): Partial<T> {
  const sanitized: Partial<T> = {}

  for (const [key, value] of Object.entries(data)) {
    // Pular campos sensiveis
    if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      continue
    }

    // Recursivamente sanitizar objetos aninhados
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      sanitized[key as keyof T] = sanitizeData(value as Record<string, unknown>) as T[keyof T]
    } else {
      sanitized[key as keyof T] = value as T[keyof T]
    }
  }

  return sanitized
}

/**
 * Calcula as diferencas entre dois objetos
 * Retorna um objeto com as mudancas { field: { old: x, new: y } }
 */
export function calculateDiff<T extends Record<string, unknown>>(
  oldData: T | null | undefined,
  newData: T | null | undefined
): Record<string, { old: unknown; new: unknown }> | null {
  if (!oldData && !newData) return null
  if (!oldData) {
    // Criacao - todos os campos sao novos
    const changes: Record<string, { old: unknown; new: unknown }> = {}
    const sanitized = sanitizeData(newData!)
    for (const [key, value] of Object.entries(sanitized)) {
      if (value !== undefined && value !== null) {
        changes[key] = { old: null, new: value }
      }
    }
    return Object.keys(changes).length > 0 ? changes : null
  }

  if (!newData) {
    // Exclusao - todos os campos antigos
    const changes: Record<string, { old: unknown; new: unknown }> = {}
    const sanitized = sanitizeData(oldData)
    for (const [key, value] of Object.entries(sanitized)) {
      if (value !== undefined && value !== null) {
        changes[key] = { old: value, new: null }
      }
    }
    return Object.keys(changes).length > 0 ? changes : null
  }

  // Atualizacao - comparar campos
  const changes: Record<string, { old: unknown; new: unknown }> = {}
  const sanitizedOld = sanitizeData(oldData)
  const sanitizedNew = sanitizeData(newData)

  const allKeys = new Set([
    ...Object.keys(sanitizedOld),
    ...Object.keys(sanitizedNew),
  ])

  for (const key of allKeys) {
    const oldValue = sanitizedOld[key]
    const newValue = sanitizedNew[key]

    // Comparar valores (tratando datas e objetos)
    if (!isEqual(oldValue, newValue)) {
      changes[key] = { old: oldValue ?? null, new: newValue ?? null }
    }
  }

  return Object.keys(changes).length > 0 ? changes : null
}

/**
 * Compara dois valores para igualdade
 */
function isEqual(a: unknown, b: unknown): boolean {
  // Ambos null ou undefined
  if (a == null && b == null) return true
  if (a == null || b == null) return false

  // Datas
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => isEqual(item, b[index]))
  }

  // Objetos
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a as object)
    const keysB = Object.keys(b as object)
    if (keysA.length !== keysB.length) return false
    return keysA.every((key) =>
      isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    )
  }

  // Primitivos
  return a === b
}

/**
 * Registra um log de auditoria
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    // Convertemos para JSON serializable para satisfazer o tipo InputJsonValue
    const changesJson = params.changes ? JSON.parse(JSON.stringify(params.changes)) : undefined
    const metadataJson = params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined

    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        userId: params.userId ?? null,
        userEmail: params.userEmail ?? null,
        userName: params.userName ?? null,
        changes: changesJson,
        metadata: metadataJson,
      },
    })
  } catch (error) {
    // Log de auditoria nao deve quebrar a aplicacao
    console.error("[Audit] Erro ao registrar log de auditoria:", error)
  }
}

/**
 * Registra auditoria de forma assincrona (fire and forget)
 * Util para nao bloquear a resposta da API
 */
export function logAuditAsync(params: LogAuditParams): void {
  logAudit(params).catch((error) => {
    console.error("[Audit] Erro ao registrar log de auditoria:", error)
  })
}

/**
 * Busca logs de auditoria com filtros e paginacao
 */
export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const { entityType, entityId, userId, action, startDate, endDate, page = 1, limit = 20, leaderMinistryIds } = filters

  const where: Record<string, unknown> = {}

  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = entityId
  if (userId) where.userId = userId
  if (action) where.action = action

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate
  }

  // Restringir ao escopo de ministerios liderados (para role LEADER)
  if (leaderMinistryIds !== undefined) {
    // Filtra logs de entidades que envolvam um dos ministerios liderados.
    // Para Schedule: o metadata.ministryId ou entityId via Schedule.ministryId.
    // Estrategia: filtrar por entityId IN (schedules e eventos dos ministerios liderados)
    // ou por metadata jsonpath quando disponivel.
    // Implementacao conservadora: retornar apenas logs em que o entityId corresponda
    // a uma escala, vaga ou item pertencente a um dos ministerios liderados,
    // ou logs de ministerios proprios.
    where.OR = [
      // Logs diretos de ministerios liderados
      {
        entityType: "Schedule",
        metadata: {
          path: ["ministryId"],
          in: leaderMinistryIds,
        },
      },
      // Logs de ministerios proprios (entityType Ministry com entityId owned)
      {
        entityType: { in: ["Schedule", "Event", "EventItem", "EventVacancy"] as AuditEntityType[] },
        metadata: {
          path: ["ministryId"],
          in: leaderMinistryIds,
        },
      },
    ]
  }

  const skip = (page - 1) * limit

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Helper para criar contexto de auditoria a partir de uma sessao
 */
export function getAuditContext(session: {
  user?: { id?: string; email?: string | null; name?: string | null } | null
} | null) {
  return {
    userId: session?.user?.id ?? null,
    userEmail: session?.user?.email ?? null,
    userName: session?.user?.name ?? null,
  }
}

/**
 * Helper para criar metadados de requisicao
 */
export function getRequestMetadata(request: Request): Record<string, unknown> {
  return {
    userAgent: request.headers.get("user-agent") ?? null,
    ip: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null,
    referer: request.headers.get("referer") ?? null,
  }
}

// Mapeamento de acoes para labels em portugues
export const ACTION_LABELS: Record<AuditAction, string> = {
  created: "Criado",
  updated: "Atualizado",
  deleted: "Removido",
  confirmed: "Confirmado",
  declined: "Recusado",
  assigned: "Escalado",
  unassigned: "Removido da escala",
}

// Mapeamento de tipos de entidade para labels em portugues
export const ENTITY_LABELS: Record<AuditEntityType, string> = {
  Schedule: "Escala",
  Event: "Evento",
  EventItem: "Item do Evento",
  EventVacancy: "Vaga do Evento",
}
