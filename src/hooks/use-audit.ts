"use client";

import { useQuery } from "@tanstack/react-query";

// Types
export type AuditEntityType = "Schedule" | "Event" | "EventItem" | "EventVacancy";

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "confirmed"
  | "declined"
  | "assigned"
  | "unassigned";

export interface AuditLog {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditFilters {
  entityType?: AuditEntityType;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
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
};

// Mapeamento de tipos de entidade para labels em portugues
export const ENTITY_LABELS: Record<AuditEntityType, string> = {
  Schedule: "Escala",
  Event: "Evento",
  EventItem: "Item do Evento",
  EventVacancy: "Vaga do Evento",
};

// Fetch audit logs
async function fetchAuditLogs(filters: AuditFilters): Promise<AuditLogsResponse> {
  const params = new URLSearchParams();

  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.entityId) params.set("entityId", filters.entityId);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.action) params.set("action", filters.action);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const response = await fetch(`/api/audit?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao buscar logs de auditoria");
  }

  return response.json();
}

// Hook to fetch audit logs
export function useAuditLogs(filters: AuditFilters = {}) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => fetchAuditLogs(filters),
    staleTime: 1000 * 60, // 1 minute
  });
}

// Hook to fetch audit logs for a specific entity
export function useEntityAuditLogs(entityType: AuditEntityType, entityId: string) {
  return useQuery({
    queryKey: ["audit-logs", entityType, entityId],
    queryFn: () => fetchAuditLogs({ entityType, entityId, limit: 50 }),
    staleTime: 1000 * 60, // 1 minute
    enabled: !!entityId,
  });
}

// Hook to fetch audit logs for an event (including schedules)
export function useEventAuditLogs(eventId: string) {
  return useQuery({
    queryKey: ["audit-logs", "event-full", eventId],
    queryFn: async () => {
      // Buscar logs do evento
      const eventLogs = await fetchAuditLogs({ entityType: "Event", entityId: eventId, limit: 100 });

      // Buscar logs de schedules associados ao evento (via metadata ou changes)
      // Por enquanto, buscaremos apenas os logs de Schedule que mencionam o eventId
      const scheduleLogs = await fetch(`/api/audit?entityType=Schedule&limit=100`).then(r => r.json());

      // Filtrar logs de schedule que sao deste evento
      const filteredScheduleLogs = (scheduleLogs.data || []).filter((log: AuditLog) => {
        const changes = log.changes as Record<string, { old: unknown; new: unknown }> | null;
        if (!changes) return false;
        return changes.eventId?.new === eventId || changes.eventId?.old === eventId;
      });

      // Combinar e ordenar por data
      const allLogs = [...eventLogs.data, ...filteredScheduleLogs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return {
        data: allLogs,
        pagination: {
          page: 1,
          limit: 100,
          total: allLogs.length,
          totalPages: 1,
        },
      };
    },
    staleTime: 1000 * 60, // 1 minute
    enabled: !!eventId,
  });
}
