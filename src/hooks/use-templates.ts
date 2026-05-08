"use client"

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import type {
  CreateTemplateInput,
  UpdateTemplateInput,
  ApplyTemplateInput,
  TemplateItem,
  TemplateSchedule,
} from "@/lib/validations/template"

// Types
export interface EventTemplate {
  id: string
  name: string
  description: string | null
  eventType: string
  duration: number | null
  defaultSchedules: TemplateSchedule[] | null
  defaultItems: TemplateItem[] | null
  createdById: string
  createdAt: string | Date
  updatedAt: string | Date
  createdBy?: {
    id: string
    name: string | null
    email: string
  }
  _count?: {
    events: number
  }
}

export interface TemplateFilters {
  search?: string
  eventType?: "CULTO" | "SPECIAL"
  page?: number
  limit?: number
}

// Query keys
export const templateKeys = {
  all: ["templates"] as const,
  lists: () => [...templateKeys.all, "list"] as const,
  list: (filters?: TemplateFilters) => [...templateKeys.lists(), filters] as const,
  details: () => [...templateKeys.all, "detail"] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
}

// API functions
async function fetchTemplates(filters?: TemplateFilters): Promise<EventTemplate[]> {
  const params = new URLSearchParams()

  if (filters?.search) params.set("search", filters.search)
  if (filters?.eventType) params.set("eventType", filters.eventType)
  if (filters?.page) params.set("page", String(filters.page))
  if (filters?.limit) params.set("limit", String(filters.limit))

  const response = await fetch(`/api/templates?${params.toString()}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao carregar templates")
  }

  const result = await response.json()
  return result.data || []
}

async function fetchTemplate(id: string): Promise<EventTemplate> {
  const response = await fetch(`/api/templates/${id}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao carregar template")
  }

  const result = await response.json()
  return result.data
}

async function createTemplate(data: CreateTemplateInput): Promise<EventTemplate> {
  const response = await fetch("/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao criar template")
  }

  const result = await response.json()
  return result.data
}

async function updateTemplate({
  id,
  ...data
}: UpdateTemplateInput & { id: string }): Promise<EventTemplate> {
  const response = await fetch(`/api/templates/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao atualizar template")
  }

  const result = await response.json()
  return result.data
}

async function deleteTemplate(id: string): Promise<void> {
  const response = await fetch(`/api/templates/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao excluir template")
  }
}

interface ApplyTemplateResult {
  data: unknown
  applied: {
    itemsCreated: number
    vacanciesCreated: number
  }
  message: string
}

async function applyTemplate({
  templateId,
  ...data
}: ApplyTemplateInput & { templateId: string }): Promise<ApplyTemplateResult> {
  const response = await fetch(`/api/templates/${templateId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao aplicar template")
  }

  return response.json()
}

// Hooks
export function useTemplates(filters?: TemplateFilters) {
  return useQuery({
    queryKey: templateKeys.list(filters),
    queryFn: () => fetchTemplates(filters),
  })
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => fetchTemplate(id),
    enabled: !!id,
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
    },
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateTemplate,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
    },
  })
}

export function useApplyTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: applyTemplate,
    onSuccess: (_, variables) => {
      // Invalidate event queries to reflect applied template
      queryClient.invalidateQueries({ queryKey: ["events"] })
      queryClient.invalidateQueries({ queryKey: ["events", "detail", variables.eventId] })
    },
  })
}

// Utility functions
export function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    CULTO: "Culto",
    SPECIAL: "Evento Especial",
  }
  return labels[type] || type
}

// Re-export types
export type { CreateTemplateInput, UpdateTemplateInput, ApplyTemplateInput, TemplateItem, TemplateSchedule }
