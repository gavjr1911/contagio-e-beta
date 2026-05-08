"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScheduleStatus } from "@/generated/prisma/enums";
import { vacancyKeys } from "./use-vacancies";
import { formatDateToISO } from "@/lib/date-utils";

// Types
export interface Schedule {
  id: string;
  eventId: string;
  ministryId: string;
  userId: string;
  /** @deprecated — usar `vacancy.position.name`. */
  position: string | null;
  vacancy?: {
    id: string;
    positionId: string;
    position: { id: string; name: string };
  } | null;
  status: ScheduleStatus;
  confirmedAt: Date | string | null;
  declinedReason: string | null;
  createdAt: Date | string;
  event: {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD format
    startTime: string; // HH:MM format
    endTime: string | null; // HH:MM format
    type: string;
    status: string;
  };
  ministry: {
    id: string;
    name: string;
    type: string;
  };
}

// Event Schedule types (grouped by ministry)
export interface EventScheduleUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface VacancyInfo {
  id: string;
  positionId: string;
  position: { id: string; name: string };
}

export interface EventScheduleItem {
  id: string;
  user: EventScheduleUser;
  position: string | null;
  vacancyId: string | null;
  vacancy: VacancyInfo | null;
  status: ScheduleStatus;
  confirmedAt: Date | null;
  createdAt: Date;
}

export interface EventMinistry {
  id: string;
  name: string;
  type: string;
}

export interface EventScheduleGroup {
  ministry: EventMinistry;
  schedules: EventScheduleItem[];
}

export interface CreateScheduleInput {
  eventId: string;
  userId: string;
  ministryId: string;
  vacancyId?: string;
  position?: string;
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

// Query keys
export const scheduleKeys = {
  all: ["schedules"] as const,
  my: (filter: ScheduleFilter) => [...scheduleKeys.all, "my", filter] as const,
  event: (eventId: string) => [...scheduleKeys.all, "event", eventId] as const,
  blocked: () => [...scheduleKeys.all, "blocked-dates"] as const,
};

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
    body: JSON.stringify({
      startDate: formatDateToISO(data.startDate),
      endDate: formatDateToISO(data.endDate),
      reason: data.reason,
    }),
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

// Fetch event schedules (grouped by ministry)
async function fetchEventSchedules(eventId: string): Promise<EventScheduleGroup[]> {
  const response = await fetch(`/api/events/${eventId}/schedules`);
  if (!response.ok) {
    throw new Error("Erro ao carregar escalas do evento");
  }
  const result = await response.json();
  return result.data || [];
}

// Schedule creation response with optional warnings
export interface CreateScheduleResponse {
  schedule: Schedule;
  warnings?: string[];
  timeConflicts?: TimeConflict[];
}

// Create schedule (assign member to event)
async function createSchedule(data: CreateScheduleInput): Promise<CreateScheduleResponse> {
  const { eventId, ...body } = data;
  const response = await fetch(`/api/events/${eventId}/schedules`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao criar escala");
  }
  const result = await response.json();
  return {
    schedule: result.data,
    warnings: result.warnings,
    timeConflicts: result.timeConflicts,
  };
}

// Delete schedule
async function deleteSchedule(data: { eventId: string; scheduleId: string }): Promise<void> {
  const response = await fetch(`/api/events/${data.eventId}/schedules/${data.scheduleId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao remover escala");
  }
}

// Hook: useMySchedules
export function useMySchedules(filter: ScheduleFilter = "all") {
  return useQuery({
    queryKey: scheduleKeys.my(filter),
    queryFn: () => fetchMySchedules(filter),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook: useEventSchedules
export function useEventSchedules(eventId: string) {
  return useQuery({
    queryKey: scheduleKeys.event(eventId),
    queryFn: () => fetchEventSchedules(eventId),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook: useConfirmSchedule
export function useConfirmSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: confirmSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

// Hook: useDeclineSchedule
export function useDeclineSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: declineSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

// Hook: useCreateSchedule
export function useCreateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSchedule,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.event(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: vacancyKeys.list(variables.eventId) });
    },
  });
}

// Hook: useDeleteSchedule
export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSchedule,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.event(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: vacancyKeys.list(variables.eventId) });
    },
  });
}

// Hook: useBlockedDates
export function useBlockedDates() {
  return useQuery({
    queryKey: scheduleKeys.blocked(),
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
      queryClient.invalidateQueries({ queryKey: scheduleKeys.blocked() });
    },
  });
}

// Hook: useRemoveBlockedDate
export function useRemoveBlockedDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeBlockedDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.blocked() });
    },
  });
}

// ============================================
// Bulk Scheduling Types and Functions
// ============================================

export interface BulkScheduleItem {
  userId: string;
  ministryId: string;
  vacancyId?: string;
  position?: string;
}

export interface BulkScheduleResult {
  userId: string;
  ministryId: string;
  success: boolean;
  scheduleId?: string;
  error?: string;
  warnings?: string[];
}

export interface TimeConflict {
  eventId: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  ministryName: string;
  conflictType: "same_event" | "overlapping" | "close_proximity";
}

export interface BulkScheduleResponse {
  results: BulkScheduleResult[];
  summary: {
    total: number;
    success: number;
    failed: number;
    withWarnings: number;
  };
  notificationsSent: boolean;
}

export interface CreateBulkSchedulesInput {
  eventId: string;
  schedules: BulkScheduleItem[];
  sendNotifications?: boolean;
}

export interface CheckConflictsInput {
  eventId: string;
  userIds: string[];
}

// API function: Create bulk schedules
async function createBulkSchedules(
  data: CreateBulkSchedulesInput
): Promise<BulkScheduleResponse> {
  const { eventId, ...body } = data;
  const response = await fetch(`/api/events/${eventId}/schedules/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Erro ao criar escalas em lote");
  }

  return result.data;
}

// API function: Check conflicts for multiple users
async function checkBulkConflicts(
  data: CheckConflictsInput
): Promise<Record<string, TimeConflict[]>> {
  const { eventId, userIds } = data;
  const params = new URLSearchParams();
  params.set("userIds", userIds.join(","));

  const response = await fetch(
    `/api/events/${eventId}/schedules/bulk?${params.toString()}`
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Erro ao verificar conflitos");
  }

  return result.data;
}

// Hook: useBulkSchedule
export function useBulkSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBulkSchedules,
    onSuccess: (_, variables) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: scheduleKeys.event(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      queryClient.invalidateQueries({ queryKey: vacancyKeys.list(variables.eventId) });
    },
  });
}

// Hook: useCheckBulkConflicts
export function useCheckBulkConflicts(eventId: string, userIds: string[]) {
  return useQuery({
    queryKey: [...scheduleKeys.event(eventId), "conflicts", userIds],
    queryFn: () => checkBulkConflicts({ eventId, userIds }),
    enabled: !!eventId && userIds.length > 0,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}
