"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduleKeys } from "./use-schedules";
import { vacancyKeys } from "./use-vacancies";

// ============================================
// TYPES
// ============================================

export interface SuggestionFactors {
  availability: number;
  frequency: number;
  history: number;
  timeConflict: number;
  positionMatch: number;
}

export interface VolunteerSuggestion {
  userId: string;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
  memberId: string;
  score: number;
  factors: SuggestionFactors;
  reason: string;
  positions: string[];
  lastScheduledAt: string | null;
  totalSchedules: number;
  ministrySchedules: number;
}

export interface SuggestionsResponse {
  event: {
    id: string;
    name: string;
    date: string;
  };
  ministry: {
    id: string;
    name: string;
  };
  positionId: string | null;
  positionName: string | null;
  suggestions: VolunteerSuggestion[];
  total: number;
}

export interface SuggestionsParams {
  eventId: string;
  ministryId: string;
  positionId?: string;
  limit?: number;
}

// Distribution Stats Types
export interface MemberStats {
  userId: string;
  userName: string | null;
  scheduleCount: number;
  confirmedCount: number;
  declinedCount: number;
  pendingCount: number;
  lastScheduledAt: string | null;
}

export interface MinistryDistributionStats {
  type: "ministry";
  days: number;
  ministry: {
    id: string;
    name: string;
  };
  members: MemberStats[];
  totalSchedules: number;
  averagePerMember: number;
  mostScheduled: {
    userId: string;
    userName: string | null;
    count: number;
  } | null;
  leastScheduled: {
    userId: string;
    userName: string | null;
    count: number;
  } | null;
}

export interface MinistryOverview {
  id: string;
  name: string;
  memberCount: number;
  scheduleCount: number;
  averagePerMember: number;
}

export interface TopVolunteer {
  userId: string;
  userName: string | null;
  totalSchedules: number;
  ministryBreakdown: Array<{
    ministryId: string;
    ministryName: string;
    count: number;
  }>;
}

export interface GlobalDistributionStats {
  type: "global";
  days: number;
  totalMembers: number;
  totalSchedules: number;
  averagePerMember: number;
  ministries: MinistryOverview[];
  topVolunteers: TopVolunteer[];
}

export type DistributionStats = MinistryDistributionStats | GlobalDistributionStats;

// ============================================
// QUERY KEYS
// ============================================

export const suggestionKeys = {
  all: ["suggestions"] as const,
  list: (eventId: string, ministryId: string, positionId?: string) =>
    [...suggestionKeys.all, eventId, ministryId, positionId] as const,
  stats: () => [...suggestionKeys.all, "stats"] as const,
  ministryStats: (ministryId: string, days?: number) =>
    [...suggestionKeys.stats(), "ministry", ministryId, days] as const,
  globalStats: (days?: number) =>
    [...suggestionKeys.stats(), "global", days] as const,
};

// ============================================
// API FUNCTIONS
// ============================================

async function fetchSuggestions(
  params: SuggestionsParams
): Promise<SuggestionsResponse> {
  const { eventId, ministryId, positionId, limit } = params;
  const searchParams = new URLSearchParams();
  searchParams.set("ministryId", ministryId);
  if (positionId) searchParams.set("positionId", positionId);
  if (limit) searchParams.set("limit", limit.toString());

  const response = await fetch(
    `/api/events/${eventId}/schedules/suggestions?${searchParams.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao carregar sugestões");
  }

  const result = await response.json();
  return result.data;
}

async function fetchDistributionStats(
  ministryId?: string,
  days?: number
): Promise<DistributionStats> {
  const searchParams = new URLSearchParams();
  if (ministryId) searchParams.set("ministryId", ministryId);
  if (days) searchParams.set("days", days.toString());

  const response = await fetch(
    `/api/schedules/stats?${searchParams.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao carregar estatisticas");
  }

  const result = await response.json();
  return result.data;
}

interface QuickAssignParams {
  eventId: string;
  userId: string;
  ministryId: string;
  vacancyId?: string;
  position?: string;
}

async function quickAssignVolunteer(params: QuickAssignParams): Promise<void> {
  const { eventId, ...body } = params;
  const response = await fetch(`/api/events/${eventId}/schedules`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao escalar voluntario");
  }
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook para buscar sugestoes de voluntarios para uma vaga
 */
export function useSuggestions(
  eventId: string,
  ministryId: string,
  positionId?: string,
  options?: { enabled?: boolean; limit?: number }
) {
  const { enabled = true, limit = 10 } = options || {};

  return useQuery({
    queryKey: suggestionKeys.list(eventId, ministryId, positionId),
    queryFn: () =>
      fetchSuggestions({ eventId, ministryId, positionId, limit }),
    enabled: enabled && !!eventId && !!ministryId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook para buscar estatisticas de distribuicao de um ministerio
 */
export function useMinistryDistributionStats(
  ministryId: string,
  days?: number,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: suggestionKeys.ministryStats(ministryId, days),
    queryFn: () => fetchDistributionStats(ministryId, days),
    enabled: enabled && !!ministryId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook para buscar estatisticas globais de distribuicao
 */
export function useGlobalDistributionStats(
  days?: number,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: suggestionKeys.globalStats(days),
    queryFn: () => fetchDistributionStats(undefined, days),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook para escalar voluntario rapidamente (1-click)
 */
export function useQuickAssign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: quickAssignVolunteer,
    onSuccess: (_, variables) => {
      // Invalidate suggestions
      queryClient.invalidateQueries({
        queryKey: suggestionKeys.list(variables.eventId, variables.ministryId),
      });
      // Invalidate schedules
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.event(variables.eventId),
      });
      // Invalidate vacancies
      queryClient.invalidateQueries({
        queryKey: vacancyKeys.list(variables.eventId),
      });
    },
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Retorna a cor do badge baseada no score
 */
export function getScoreColor(
  score: number
): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 80) return "default"; // Verde/Primary
  if (score >= 60) return "secondary"; // Azul
  if (score >= 40) return "outline"; // Amarelo/Neutro
  return "destructive"; // Vermelho
}

/**
 * Retorna o label do score
 */
export function getScoreLabel(score: number): string {
  if (score >= 80) return "Excelente";
  if (score >= 60) return "Bom";
  if (score >= 40) return "Razoavel";
  return "Baixo";
}

/**
 * Retorna a classe CSS para o score
 */
export function getScoreClassName(score: number): string {
  if (score >= 80) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  if (score >= 60) return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  if (score >= 40) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-red-500/10 text-red-500 border-red-500/20";
}

/**
 * Formata a data da ultima escala
 */
export function formatLastScheduled(dateString: string | null): string {
  if (!dateString) return "Nunca escalado";

  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atras`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atras`;
  return `${Math.floor(diffDays / 30)} meses atras`;
}
