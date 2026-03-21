"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";

// Types
export interface Event {
  id: string;
  name: string;
  type: EventType;
  date: string;
  startTime: string;
  endTime: string;
  status: EventStatus;
  description?: string;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
}

export type EventType =
  | "culto"
  | "reuniao"
  | "ensaio"
  | "evento_especial"
  | "conferencia";

export type EventStatus =
  | "rascunho"
  | "agendado"
  | "confirmado"
  | "em_andamento"
  | "concluido"
  | "cancelado";

export interface EventSchedule {
  id: string;
  eventId: string;
  ministryId: string;
  ministryName: string;
  members: ScheduledMember[];
}

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

export type ConfirmationStatus =
  | "pendente"
  | "confirmado"
  | "recusado"
  | "substituido";

export interface CreateEventData {
  name: string;
  type: EventType;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  templateId?: string;
  copyFromEventId?: string;
}

export interface UpdateEventData extends Partial<CreateEventData> {
  status?: EventStatus;
}

export interface ScheduleMemberData {
  eventId: string;
  ministryId: string;
  memberId: string;
  position: string;
}

export interface EventFilters {
  type?: EventType;
  status?: EventStatus;
  startDate?: string;
  endDate?: string;
}

// Query keys
export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: (filters?: EventFilters) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, "detail"] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
  schedules: (eventId: string) =>
    [...eventKeys.detail(eventId), "schedules"] as const,
  calendar: (month: number, year: number) =>
    [...eventKeys.all, "calendar", month, year] as const,
};

// Mock data - replace with actual API calls
const mockEvents: Event[] = [
  {
    id: "1",
    name: "Culto de Domingo",
    type: "culto",
    date: "2025-03-23",
    startTime: "18:00",
    endTime: "20:00",
    status: "agendado",
    createdAt: "2025-03-01T10:00:00Z",
    updatedAt: "2025-03-01T10:00:00Z",
  },
  {
    id: "2",
    name: "Ensaio Louvor",
    type: "ensaio",
    date: "2025-03-22",
    startTime: "19:00",
    endTime: "21:00",
    status: "confirmado",
    createdAt: "2025-03-01T10:00:00Z",
    updatedAt: "2025-03-01T10:00:00Z",
  },
  {
    id: "3",
    name: "Reuniao de Lideres",
    type: "reuniao",
    date: "2025-03-25",
    startTime: "20:00",
    endTime: "22:00",
    status: "agendado",
    createdAt: "2025-03-01T10:00:00Z",
    updatedAt: "2025-03-01T10:00:00Z",
  },
  {
    id: "4",
    name: "Conferencia de Jovens",
    type: "conferencia",
    date: "2025-03-30",
    startTime: "09:00",
    endTime: "18:00",
    status: "confirmado",
    createdAt: "2025-03-01T10:00:00Z",
    updatedAt: "2025-03-01T10:00:00Z",
  },
];

const mockSchedules: EventSchedule[] = [
  {
    id: "s1",
    eventId: "1",
    ministryId: "m1",
    ministryName: "Louvor",
    members: [
      {
        id: "sm1",
        memberId: "u1",
        memberName: "Ana Silva",
        position: "Vocal",
        status: "confirmado",
      },
      {
        id: "sm2",
        memberId: "u2",
        memberName: "Carlos Santos",
        position: "Guitarra",
        status: "pendente",
      },
      {
        id: "sm3",
        memberId: "u3",
        memberName: "Julia Oliveira",
        position: "Teclado",
        status: "confirmado",
        hasConflict: true,
        conflictWith: "Ensaio Louvor",
      },
    ],
  },
  {
    id: "s2",
    eventId: "1",
    ministryId: "m2",
    ministryName: "Som e Midia",
    members: [
      {
        id: "sm4",
        memberId: "u4",
        memberName: "Pedro Costa",
        position: "Operador de Som",
        status: "confirmado",
      },
      {
        id: "sm5",
        memberId: "u5",
        memberName: "Marina Lima",
        position: "Projeção",
        status: "recusado",
      },
    ],
  },
  {
    id: "s3",
    eventId: "1",
    ministryId: "m3",
    ministryName: "Recepcao",
    members: [
      {
        id: "sm6",
        memberId: "u6",
        memberName: "Roberto Alves",
        position: "Recepcionista",
        status: "pendente",
      },
    ],
  },
];

// API functions (mock implementation)
async function fetchEvents(filters?: EventFilters): Promise<Event[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  let filteredEvents = [...mockEvents];

  if (filters?.type) {
    filteredEvents = filteredEvents.filter((e) => e.type === filters.type);
  }

  if (filters?.status) {
    filteredEvents = filteredEvents.filter((e) => e.status === filters.status);
  }

  return filteredEvents;
}

async function fetchEvent(id: string): Promise<Event | null> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockEvents.find((e) => e.id === id) || null;
}

async function fetchEventSchedules(eventId: string): Promise<EventSchedule[]> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return mockSchedules.filter((s) => s.eventId === eventId);
}

async function createEvent(data: CreateEventData): Promise<Event> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newEvent: Event = {
    id: Date.now().toString(),
    ...data,
    status: "rascunho",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockEvents.push(newEvent);
  return newEvent;
}

async function updateEvent(
  id: string,
  data: UpdateEventData
): Promise<Event | null> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const index = mockEvents.findIndex((e) => e.id === id);
  if (index === -1) return null;

  mockEvents[index] = {
    ...mockEvents[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  return mockEvents[index];
}

async function deleteEvent(id: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const index = mockEvents.findIndex((e) => e.id === id);
  if (index === -1) return false;
  mockEvents.splice(index, 1);
  return true;
}

async function duplicateEvent(id: string): Promise<Event | null> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const event = mockEvents.find((e) => e.id === id);
  if (!event) return null;

  const duplicated: Event = {
    ...event,
    id: Date.now().toString(),
    name: `${event.name} (Copia)`,
    status: "rascunho",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockEvents.push(duplicated);
  return duplicated;
}

async function scheduleMember(data: ScheduleMemberData): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  // In real implementation, this would add the member to the schedule
  return true;
}

async function updateMemberStatus(
  scheduleId: string,
  memberId: string,
  status: ConfirmationStatus
): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return true;
}

async function removeMemberFromSchedule(
  scheduleId: string,
  memberId: string
): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return true;
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

export function useEventSchedules(eventId: string) {
  return useQuery({
    queryKey: eventKeys.schedules(eventId),
    queryFn: () => fetchEventSchedules(eventId),
    enabled: !!eventId,
  });
}

export function useEventsForMonth(month: number, year: number) {
  return useQuery({
    queryKey: eventKeys.calendar(month, year),
    queryFn: async () => {
      const events = await fetchEvents();
      return events.filter((event) => {
        const eventDate = new Date(event.date);
        return (
          eventDate.getMonth() === month && eventDate.getFullYear() === year
        );
      });
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
    mutationFn: ({ id, data }: { id: string; data: UpdateEventData }) =>
      updateEvent(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.id) });
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

export function useDuplicateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: duplicateEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useScheduleMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: scheduleMember,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: eventKeys.schedules(variables.eventId),
      });
    },
  });
}

export function useUpdateMemberStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      scheduleId,
      memberId,
      status,
    }: {
      scheduleId: string;
      memberId: string;
      status: ConfirmationStatus;
    }) => updateMemberStatus(scheduleId, memberId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export function useRemoveMemberFromSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      scheduleId,
      memberId,
    }: {
      scheduleId: string;
      memberId: string;
    }) => removeMemberFromSchedule(scheduleId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

// Utility functions
export function getEventTypeLabel(type: EventType): string {
  const labels: Record<EventType, string> = {
    culto: "Culto",
    reuniao: "Reuniao",
    ensaio: "Ensaio",
    evento_especial: "Evento Especial",
    conferencia: "Conferencia",
  };
  return labels[type];
}

export function getEventStatusLabel(status: EventStatus): string {
  const labels: Record<EventStatus, string> = {
    rascunho: "Rascunho",
    agendado: "Agendado",
    confirmado: "Confirmado",
    em_andamento: "Em Andamento",
    concluido: "Concluido",
    cancelado: "Cancelado",
  };
  return labels[status];
}

export function getConfirmationStatusLabel(status: ConfirmationStatus): string {
  const labels: Record<ConfirmationStatus, string> = {
    pendente: "Pendente",
    confirmado: "Confirmado",
    recusado: "Recusado",
    substituido: "Substituido",
  };
  return labels[status];
}
