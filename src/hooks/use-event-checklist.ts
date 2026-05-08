"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { eventKeys } from "./use-events"
import type { ChecklistTemplate, ChecklistTemplateItem } from "./use-checklist-templates"

// Types
export interface EventChecklistItem {
  id: string
  eventId: string
  title: string
  order: number
  completed: boolean
  completedAt: string | null
  completedById: string | null
  fromTemplate: boolean
  createdAt: string
  updatedAt: string
  completedBy?: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
}

export interface EventChecklistData {
  items: EventChecklistItem[]
  template: (ChecklistTemplate & { items: ChecklistTemplateItem[] }) | null
  hasInstantiatedItems: boolean
  hasTemplate: boolean
  canEdit: boolean
  stats: {
    total: number
    completed: number
    pending: number
    percentComplete: number
  }
}

export interface CreateEventChecklistItemData {
  title: string
  order?: number
}

export interface UpdateEventChecklistItemData {
  title?: string
  completed?: boolean
}

// Query keys
export const eventChecklistKeys = {
  all: ["eventChecklist"] as const,
  lists: () => [...eventChecklistKeys.all, "list"] as const,
  list: (eventId: string) => [...eventChecklistKeys.lists(), eventId] as const,
}

// API helpers
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || "Erro na requisicao")
  }
  return data.data
}

// ============================================
// Event Checklist Hooks
// ============================================

export function useEventChecklist(eventId: string) {
  return useQuery({
    queryKey: eventChecklistKeys.list(eventId),
    queryFn: () => fetchApi<EventChecklistData>(`/api/events/${eventId}/checklist`),
    enabled: !!eventId,
  })
}

export function useInitEventChecklist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, templateId }: { eventId: string; templateId?: string }) =>
      fetchApi<{ items: EventChecklistItem[]; message: string }>(
        `/api/events/${eventId}/checklist/init`,
        {
          method: "POST",
          body: JSON.stringify({ templateId }),
        }
      ),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventChecklistKeys.list(eventId) })
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
      toast.success("Checklist iniciado com sucesso")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao iniciar checklist")
    },
  })
}

export function useToggleChecklistItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      eventId,
      itemId,
      completed,
    }: {
      eventId: string
      itemId: string
      completed: boolean
    }) =>
      fetchApi<EventChecklistItem>(`/api/events/${eventId}/checklist/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ completed }),
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventChecklistKeys.list(eventId) })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar item")
    },
  })
}

export function useAddChecklistItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: CreateEventChecklistItemData }) =>
      fetchApi<EventChecklistItem>(`/api/events/${eventId}/checklist`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventChecklistKeys.list(eventId) })
      toast.success("Item adicionado")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao adicionar item")
    },
  })
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, itemId }: { eventId: string; itemId: string }) =>
      fetchApi<{ deleted: boolean }>(`/api/events/${eventId}/checklist/${itemId}`, {
        method: "DELETE",
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventChecklistKeys.list(eventId) })
      toast.success("Item removido")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover item")
    },
  })
}

export function useUpdateChecklistItemTitle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      eventId,
      itemId,
      title,
    }: {
      eventId: string
      itemId: string
      title: string
    }) =>
      fetchApi<EventChecklistItem>(`/api/events/${eventId}/checklist/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      }),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventChecklistKeys.list(eventId) })
      toast.success("Item atualizado")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar item")
    },
  })
}
