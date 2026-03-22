"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { EventType, EventStatus } from "@/generated/prisma/enums";

// Re-export enums for convenience
export { EventType, EventStatus } from "@/generated/prisma/enums";

// Types matching API response
export interface Event {
  id: string;
  name: string;
  type: EventType;
  date: string | Date;
  startTime: string | Date;
  endTime: string | Date | null;
  status: EventStatus;
  templateId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  template?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    schedules: number;
    items: number;
  };
  // Related data (when fetching single event)
  items?: EventItem[];
  schedules?: EventSchedule[];
  setlists?: EventSetlist[];
}

export interface EventItem {
  id: string;
  eventId: string;
  type: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  order: number;
  responsible?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface EventSchedule {
  id: string;
  eventId: string;
  userId: string;
  ministryId: string;
  position: string | null;
  status: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  ministry: {
    id: string;
    name: string;
    type: string | null;
  };
}

export interface EventSetlist {
  id: string;
  eventId: string;
  songId: string;
  order: number;
  key: string | null;
  song: {
    id: string;
    name: string;
    artist: string | null;
    defaultKey: string | null;
  };
}

export interface CreateEventData {
  name: string;
  type: EventType;
  date: string;
  startTime: string;
  endTime?: string;
  status?: EventStatus;
  templateId?: string;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string;
}

export interface EventFilters {
  type?: EventType;
  status?: EventStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Query keys
export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: (filters?: EventFilters) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, "detail"] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
  calendar: (month: number, year: number) =>
    [...eventKeys.all, "calendar", month, year] as const,
};

// Helper to convert time input (HH:mm) to ISO string
function timeToISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

// Helper to format time from Date/ISO string to HH:mm
export function formatTimeFromDate(dateOrString: string | Date | null): string {
  if (!dateOrString) return "";
  const date = typeof dateOrString === "string" ? new Date(dateOrString) : dateOrString;
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// Helper to format date from Date/ISO string to YYYY-MM-DD
export function formatDateFromDate(dateOrString: string | Date): string {
  const date = typeof dateOrString === "string" ? new Date(dateOrString) : dateOrString;
  return date.toISOString().split("T")[0];
}

// API functions
async function fetchEvents(filters?: EventFilters): Promise<Event[]> {
  const params = new URLSearchParams();

  if (filters?.type) params.set("type", filters.type);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  const response = await fetch(`/api/events?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao carregar eventos");
  }

  const result = await response.json();
  return result.data || [];
}

async function fetchEvent(id: string): Promise<Event> {
  const response = await fetch(`/api/events/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao carregar evento");
  }

  const result = await response.json();
  return result.data;
}

async function createEvent(data: CreateEventData): Promise<Event> {
  // Convert time strings to ISO format
  const body = {
    name: data.name,
    type: data.type,
    date: new Date(data.date).toISOString(),
    startTime: timeToISO(data.date, data.startTime),
    endTime: data.endTime ? timeToISO(data.date, data.endTime) : undefined,
    status: data.status || "DRAFT",
    templateId: data.templateId,
  };

  const response = await fetch("/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao criar evento");
  }

  const result = await response.json();
  return result.data;
}

async function updateEvent({ id, ...data }: UpdateEventData): Promise<Event> {
  const body: Record<string, unknown> = {};

  if (data.name) body.name = data.name;
  if (data.type) body.type = data.type;
  if (data.date) body.date = new Date(data.date).toISOString();
  if (data.startTime && data.date) body.startTime = timeToISO(data.date, data.startTime);
  if (data.endTime && data.date) body.endTime = timeToISO(data.date, data.endTime);
  if (data.status) body.status = data.status;
  if (data.templateId) body.templateId = data.templateId;

  const response = await fetch(`/api/events/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao atualizar evento");
  }

  const result = await response.json();
  return result.data;
}

async function deleteEvent(id: string): Promise<void> {
  const response = await fetch(`/api/events/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao excluir evento");
  }
}

// Hooks
export function useEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: () => fetchEvents(filters),
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => fetchEvent(id),
    enabled: !!id,
  });
}

export function useEventsForMonth(month: number, year: number) {
  return useQuery({
    queryKey: eventKeys.calendar(month, year),
    queryFn: async () => {
      const startDate = new Date(year, month, 1).toISOString().split("T")[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
      return fetchEvents({ startDate, endDate });
    },
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEvent,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

// Utility functions for labels
export function getEventTypeLabel(type: EventType): string {
  const labels: Record<EventType, string> = {
    SUNDAY_MORNING: "Culto Matutino",
    SUNDAY_EVENING: "Culto Noturno",
    SPECIAL: "Evento Especial",
  };
  return labels[type] || type;
}

export function getEventStatusLabel(status: EventStatus): string {
  const labels: Record<EventStatus, string> = {
    DRAFT: "Rascunho",
    PUBLISHED: "Publicado",
    COMPLETED: "Concluido",
  };
  return labels[status] || status;
}

// Legacy types for schedule-board component compatibility
export type ConfirmationStatus = "PENDING" | "CONFIRMED" | "DECLINED";

export interface ScheduledMember {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  position: string;
  status: ConfirmationStatus;
  hasConflict?: boolean;
  conflictWith?: string;
}

export function getConfirmationStatusLabel(status: ConfirmationStatus): string {
  const labels: Record<ConfirmationStatus, string> = {
    PENDING: "Pendente",
    CONFIRMED: "Confirmado",
    DECLINED: "Recusado",
  };
  return labels[status] || status;
}
