"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScheduleStatus } from "@/generated/prisma/enums";

// Types
export interface Schedule {
  id: string;
  eventId: string;
  ministryId: string;
  userId: string;
  position: string | null;
  status: ScheduleStatus;
  confirmedAt: Date | null;
  declinedReason: string | null;
  createdAt: Date;
  event: {
    id: string;
    title: string;
    date: Date;
    startTime: string;
    endTime: string | null;
    type: string;
    status: string;
  };
  ministry: {
    id: string;
    name: string;
    type: string;
  };
}

export interface BlockedDate {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  createdAt: Date;
}

export type ScheduleFilter = "all" | "pending" | "confirmed" | "history";

// Fetch my schedules
async function fetchMySchedules(filter: ScheduleFilter): Promise<Schedule[]> {
  const params = new URLSearchParams();
  if (filter !== "all") {
    params.append("filter", filter);
  }

  const response = await fetch(`/api/schedules/my?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Erro ao carregar escalas");
  }
  return response.json();
}

// Confirm schedule
async function confirmSchedule(scheduleId: string): Promise<Schedule> {
  const response = await fetch(`/api/schedules/${scheduleId}/confirm`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Erro ao confirmar escala");
  }
  const result = await response.json();
  return result.data || result;
}

// Decline schedule
async function declineSchedule(data: {
  scheduleId: string;
  reason?: string;
}): Promise<Schedule> {
  const response = await fetch(`/api/schedules/${data.scheduleId}/decline`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason: data.reason }),
  });
  if (!response.ok) {
    throw new Error("Erro ao recusar escala");
  }
  const result = await response.json();
  return result.data || result;
}

// Fetch blocked dates
async function fetchBlockedDates(): Promise<BlockedDate[]> {
  const response = await fetch("/api/blocked-dates");
  if (!response.ok) {
    throw new Error("Erro ao carregar datas bloqueadas");
  }
  return response.json();
}

// Add blocked date
async function addBlockedDate(data: {
  startDate: Date;
  endDate: Date;
  reason?: string;
}): Promise<BlockedDate> {
  const response = await fetch("/api/blocked-dates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Erro ao adicionar data bloqueada");
  }
  return response.json();
}

// Remove blocked date
async function removeBlockedDate(id: string): Promise<void> {
  const response = await fetch(`/api/blocked-dates/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Erro ao remover data bloqueada");
  }
}

// Hook: useMySchedules
export function useMySchedules(filter: ScheduleFilter = "all") {
  return useQuery({
    queryKey: ["my-schedules", filter],
    queryFn: () => fetchMySchedules(filter),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook: useConfirmSchedule
export function useConfirmSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: confirmSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-schedules"] });
    },
  });
}

// Hook: useDeclineSchedule
export function useDeclineSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: declineSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-schedules"] });
    },
  });
}

// Hook: useBlockedDates
export function useBlockedDates() {
  return useQuery({
    queryKey: ["blocked-dates"],
    queryFn: fetchBlockedDates,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook: useAddBlockedDate
export function useAddBlockedDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addBlockedDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-dates"] });
    },
  });
}

// Hook: useRemoveBlockedDate
export function useRemoveBlockedDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeBlockedDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-dates"] });
    },
  });
}
