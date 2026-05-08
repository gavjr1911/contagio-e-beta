"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { EventType, EventStatus, RecurrencePattern } from "@/generated/prisma/enums";

// Re-export enums for convenience
export { EventType, EventStatus, RecurrencePattern } from "@/generated/prisma/enums";

// Types matching API response
export interface Event {
  id: string;
  slug?: string | null;
  name: string;
  type: EventType;
  date: string | Date;
  startTime: string | Date;
  endTime: string | Date | null;
  status: EventStatus;
  templateId: string | null;
  checklistTemplateId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  // Recurrence fields
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern | null;
  recurrenceEndDate?: string | Date | null;
  parentEventId?: string | null;
  template?: {
    id: string;
    name: string;
  } | null;
  checklistTemplate?: {
    id: string;
    name: string;
  } | null;
  attendance?: {
    attendees: number;
    visitors: number;
    conversions: number;
  } | null;
  _count?: {
    schedules: number;
    items: number;
    childEvents?: number;
  };
  // Related data (when fetching single event)
  items?: EventItem[];
  schedules?: EventSchedule[];
  setlists?: EventSetlist[];
  childEvents?: Event[];
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
  checklistTemplateId?: string;
  // Recurrence fields
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
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

// Helper to format time from string or Date to HH:mm
// If it's already a string in HH:mm format, return as-is
// If it's an ISO string or Date, extract local time
export function formatTimeFromDate(dateOrString: string | Date | null): string {
  if (!dateOrString) return "";

  // If it's already in HH:mm format, return as-is
  if (typeof dateOrString === "string" && /^\d{2}:\d{2}$/.test(dateOrString)) {
    return dateOrString;
  }

  const date = typeof dateOrString === "string" ? new Date(dateOrString) : dateOrString;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Helper to format date from string or Date to YYYY-MM-DD
// If it's already a string in YYYY-MM-DD format, return as-is
// If it's an ISO string or Date, extract local date
export function formatDateFromDate(dateOrString: string | Date): string {
  // If it's already in YYYY-MM-DD format, return as-is
  if (typeof dateOrString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateOrString)) {
    return dateOrString;
  }

  const date = typeof dateOrString === "string" ? new Date(dateOrString) : dateOrString;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  // Send date/time as simple strings (YYYY-MM-DD and HH:MM)
  // The API will parse them correctly with the local timezone
  const body: Record<string, unknown> = {
    name: data.name,
    type: data.type,
    date: data.date, // YYYY-MM-DD string
    startTime: data.startTime, // HH:MM string
    endTime: data.endTime || undefined, // HH:MM string
    status: data.status || "PUBLISHED",
    templateId: data.templateId,
  };

  // Add recurrence fields if present
  if (data.isRecurring) {
    body.isRecurring = true;
    body.recurrencePattern = data.recurrencePattern;
    body.recurrenceEndDate = data.recurrenceEndDate;
  }

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
  // Send date/time as simple strings (YYYY-MM-DD and HH:MM)
  const body: Record<string, unknown> = {};

  if (data.name) body.name = data.name;
  if (data.type) body.type = data.type;
  if (data.date) body.date = data.date; // YYYY-MM-DD string
  if (data.startTime) body.startTime = data.startTime; // HH:MM string
  if (data.endTime) body.endTime = data.endTime; // HH:MM string
  if (data.status) body.status = data.status;
  if (data.templateId) body.templateId = data.templateId;
  if (data.checklistTemplateId) body.checklistTemplateId = data.checklistTemplateId;

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
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => fetchEvent(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useEventsForMonth(month: number, year: number) {
  return useQuery({
    queryKey: eventKeys.calendar(month, year),
    queryFn: async () => {
      const startDate = formatDateFromDate(new Date(year, month, 1));
      const endDate = formatDateFromDate(new Date(year, month + 1, 0));
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
    CULTO: "Culto",
    SPECIAL: "Evento Especial",
  };
  return labels[type] || type;
}

export function getEventStatusLabel(status: EventStatus): string {
  const labels: Record<EventStatus, string> = {
    PUBLISHED: "Ativo",
    COMPLETED: "Concluído",
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

export function getRecurrencePatternLabel(pattern: RecurrencePattern): string {
  const labels: Record<RecurrencePattern, string> = {
    WEEKLY: "Semanal",
    BIWEEKLY: "Quinzenal",
    MONTHLY: "Mensal",
  };
  return labels[pattern] || pattern;
}
