"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { eventKeys } from "./use-events";
import { vacancyKeys } from "./use-vacancies";

// Types
export interface AutoAssignCandidate {
  userId: string;
  userName: string;
  score: number;
  factors: {
    availability: number;
    rotation: number;
    consecutive: number;
    positionMatch: number;
  };
}

export interface AutoAssignVacancy {
  vacancyId: string;
  positionName: string;
  quantity: number;
  filled: number;
  candidates: AutoAssignCandidate[];
}

export interface AutoAssignMinistry {
  ministryId: string;
  ministryName: string;
  vacancies: AutoAssignVacancy[];
}

export interface AutoAssignPreview {
  ministries: AutoAssignMinistry[];
}

export interface AutoAssignResult {
  assigned: Array<{
    vacancyId: string;
    userId: string;
    userName: string;
    score: number;
  }>;
  unassigned: string[];
  totalAssigned: number;
  totalUnassigned: number;
}

export interface AutoAssignConfig {
  ministryId: string;
  availabilityWeight: number;
  rotationWeight: number;
  consecutiveWeight: number;
  positionMatchWeight: number;
  maxConsecutiveEvents: number;
  minRestDays: number;
}

export interface UpdateAutoAssignConfigInput {
  ministryId: string;
  availabilityWeight?: number;
  rotationWeight?: number;
  consecutiveWeight?: number;
  positionMatchWeight?: number;
  maxConsecutiveEvents?: number;
  minRestDays?: number;
}

export interface ExecuteAutoAssignInput {
  eventId: string;
  ministryId?: string;
  dryRun?: boolean;
}

// Query keys
export const autoAssignKeys = {
  all: ["autoAssign"] as const,
  previews: () => [...autoAssignKeys.all, "preview"] as const,
  preview: (eventId: string, ministryId?: string) =>
    [...autoAssignKeys.previews(), eventId, ministryId] as const,
  configs: () => [...autoAssignKeys.all, "config"] as const,
  config: (ministryId: string) => [...autoAssignKeys.configs(), ministryId] as const,
};

// API functions
async function fetchAutoAssignPreview(
  eventId: string,
  ministryId?: string
): Promise<AutoAssignPreview> {
  const params = new URLSearchParams();
  if (ministryId) params.set("ministryId", ministryId);

  const response = await fetch(
    `/api/events/${eventId}/auto-assign/preview?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao carregar preview de distribuição");
  }

  const result = await response.json();
  return result.data;
}

async function executeAutoAssign(
  input: ExecuteAutoAssignInput
): Promise<AutoAssignResult> {
  const { eventId, ...body } = input;

  const response = await fetch(`/api/events/${eventId}/auto-assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao executar distribuição automática");
  }

  const result = await response.json();
  return result.data;
}

async function fetchAutoAssignConfig(
  ministryId: string
): Promise<AutoAssignConfig> {
  const response = await fetch(`/api/ministries/${ministryId}/auto-assign-config`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao carregar configuração de distribuição");
  }

  const result = await response.json();
  return result.data;
}

async function updateAutoAssignConfig(
  input: UpdateAutoAssignConfigInput
): Promise<AutoAssignConfig> {
  const { ministryId, ...body } = input;

  const response = await fetch(`/api/ministries/${ministryId}/auto-assign-config`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao atualizar configuração de distribuição");
  }

  const result = await response.json();
  return result.data;
}

// Hooks
export function useAutoAssignPreview(eventId: string, ministryId?: string) {
  return useQuery({
    queryKey: autoAssignKeys.preview(eventId, ministryId),
    queryFn: () => fetchAutoAssignPreview(eventId, ministryId),
    enabled: !!eventId,
  });
}

export function useExecuteAutoAssign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: executeAutoAssign,
    onSuccess: (_, variables) => {
      // Invalidate preview cache
      queryClient.invalidateQueries({
        queryKey: autoAssignKeys.preview(variables.eventId, variables.ministryId),
      });
      // Invalidate event data (schedules may have changed)
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(variables.eventId),
      });
      // Invalidate vacancies (filled count may have changed)
      queryClient.invalidateQueries({
        queryKey: vacancyKeys.list(variables.eventId),
      });
    },
  });
}

export function useAutoAssignConfig(ministryId: string) {
  return useQuery({
    queryKey: autoAssignKeys.config(ministryId),
    queryFn: () => fetchAutoAssignConfig(ministryId),
    enabled: !!ministryId,
  });
}

export function useUpdateAutoAssignConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAutoAssignConfig,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: autoAssignKeys.config(data.ministryId),
      });
    },
  });
}

// Helper functions
export function getScoreColor(score: number): "success" | "warning" | "destructive" {
  if (score > 70) return "success";
  if (score > 40) return "warning";
  return "destructive";
}

export function getScoreLabel(score: number): string {
  if (score > 70) return "Excelente";
  if (score > 40) return "Bom";
  return "Baixo";
}
