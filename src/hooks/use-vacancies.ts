"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { eventKeys } from "./use-events";

// Types
export interface EventVacancy {
  id: string;
  eventId: string;
  ministryId: string;
  positionId: string;
  quantity: number;
  createdAt: Date;
  ministry: { id: string; name: string };
  position: { id: string; name: string };
  _count?: { schedules: number };
  filled?: number;
  remaining?: number;
}

export interface CreateVacancyInput {
  ministryId: string;
  positionId: string;
  quantity?: number;
}

export interface CreateBulkVacanciesInput {
  eventId: string;
  vacancies: CreateVacancyInput[];
}

export interface UpdateVacancyInput {
  eventId: string;
  vacancyId: string;
  quantity: number;
}

export interface DeleteVacancyInput {
  eventId: string;
  vacancyId: string;
}

// Query keys
export const vacancyKeys = {
  all: ["vacancies"] as const,
  lists: () => [...vacancyKeys.all, "list"] as const,
  list: (eventId: string) => [...vacancyKeys.lists(), eventId] as const,
};

// API functions
async function fetchEventVacancies(eventId: string): Promise<EventVacancy[]> {
  const response = await fetch(`/api/events/${eventId}/vacancies`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao carregar vagas");
  }

  const result = await response.json();
  return result.data || [];
}

async function createVacancy({
  eventId,
  ...data
}: CreateVacancyInput & { eventId: string }): Promise<EventVacancy> {
  const response = await fetch(`/api/events/${eventId}/vacancies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao criar vaga");
  }

  const result = await response.json();
  return result.data;
}

async function createBulkVacancies({
  eventId,
  vacancies,
}: CreateBulkVacanciesInput): Promise<EventVacancy[]> {
  const response = await fetch(`/api/events/${eventId}/vacancies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ vacancies }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao criar vagas");
  }

  const result = await response.json();
  return result.data;
}

async function updateVacancy({
  eventId,
  vacancyId,
  quantity,
}: UpdateVacancyInput): Promise<EventVacancy> {
  const response = await fetch(`/api/events/${eventId}/vacancies/${vacancyId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ quantity }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao atualizar vaga");
  }

  const result = await response.json();
  return result.data;
}

async function deleteVacancy({
  eventId,
  vacancyId,
}: DeleteVacancyInput): Promise<void> {
  const response = await fetch(`/api/events/${eventId}/vacancies/${vacancyId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao remover vaga");
  }
}

// Hooks
export function useEventVacancies(eventId: string) {
  return useQuery({
    queryKey: vacancyKeys.list(eventId),
    queryFn: () => fetchEventVacancies(eventId),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useCreateVacancy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVacancy,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: vacancyKeys.list(data.eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(data.eventId) });
    },
  });
}

export function useCreateBulkVacancies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBulkVacancies,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: vacancyKeys.list(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) });
    },
  });
}

export function useUpdateVacancy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateVacancy,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: vacancyKeys.list(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) });
    },
  });
}

export function useDeleteVacancy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVacancy,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vacancyKeys.list(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) });
    },
  });
}
