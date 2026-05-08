"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

// Types
export interface ChecklistTemplateItem {
  id: string
  templateId: string
  title: string
  order: number
  createdAt: string
}

export interface ChecklistTemplate {
  id: string
  name: string
  description: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  items: ChecklistTemplateItem[]
  createdBy?: {
    id: string
    name: string | null
    email: string
  }
  _count?: {
    events: number
  }
}

export interface CreateChecklistTemplateData {
  name: string
  description?: string
}

export interface UpdateChecklistTemplateData {
  name?: string
  description?: string | null
}

export interface CreateChecklistTemplateItemData {
  title: string
  order?: number
}

// Query keys
export const checklistTemplateKeys = {
  all: ["checklistTemplates"] as const,
  lists: () => [...checklistTemplateKeys.all, "list"] as const,
  list: (filters?: { search?: string; page?: number; limit?: number }) =>
    [...checklistTemplateKeys.lists(), filters] as const,
  details: () => [...checklistTemplateKeys.all, "detail"] as const,
  detail: (id: string) => [...checklistTemplateKeys.details(), id] as const,
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
// Template Hooks
// ============================================

export function useChecklistTemplates(filters?: { search?: string; page?: number; limit?: number }) {
  const params = new URLSearchParams()
  if (filters?.search) params.set("search", filters.search)
  if (filters?.page) params.set("page", String(filters.page))
  if (filters?.limit) params.set("limit", String(filters.limit))

  return useQuery({
    queryKey: checklistTemplateKeys.list(filters),
    queryFn: async () => {
      const res = await fetch(`/api/checklist-templates?${params}`, {
        headers: { "Content-Type": "application/json" },
      })
      const body = await res.json()
      if (!res.ok) {
        throw new Error(body.error || "Erro na requisicao")
      }
      // API retorna { data: ChecklistTemplate[], pagination }
      // Mantemos a forma antiga { items, pagination } para o consumidor
      return {
        items: (body.data || []) as ChecklistTemplate[],
        pagination: body.pagination as {
          page: number
          limit: number
          total: number
          totalPages: number
        },
      }
    },
  })
}

export function useChecklistTemplate(id: string) {
  return useQuery({
    queryKey: checklistTemplateKeys.detail(id),
    queryFn: () => fetchApi<ChecklistTemplate>(`/api/checklist-templates/${id}`),
    enabled: !!id,
  })
}

export function useCreateChecklistTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateChecklistTemplateData) =>
      fetchApi<ChecklistTemplate>("/api/checklist-templates", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistTemplateKeys.lists() })
      toast.success("Template criado com sucesso")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar template")
    },
  })
}

export function useUpdateChecklistTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChecklistTemplateData }) =>
      fetchApi<ChecklistTemplate>(`/api/checklist-templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: checklistTemplateKeys.lists() })
      queryClient.invalidateQueries({ queryKey: checklistTemplateKeys.detail(id) })
      toast.success("Template atualizado com sucesso")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar template")
    },
  })
}

export function useDeleteChecklistTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<{ deleted: boolean; eventsAffected: number }>(`/api/checklist-templates/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistTemplateKeys.lists() })
      toast.success("Template excluido com sucesso")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao excluir template")
    },
  })
}

// ============================================
// Template Item Hooks
// ============================================

export function useAddTemplateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: CreateChecklistTemplateItemData }) =>
      fetchApi<ChecklistTemplateItem>(`/api/checklist-templates/${templateId}/items`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: checklistTemplateKeys.detail(templateId) })
      queryClient.invalidateQueries({ queryKey: checklistTemplateKeys.lists() })
      toast.success("Item adicionado")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao adicionar item")
    },
  })
}

export function useUpdateTemplateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      templateId,
      itemId,
      data,
    }: {
      templateId: string
      itemId: string
      data: { title?: string }
    }) =>
      fetchApi<ChecklistTemplateItem>(`/api/checklist-templates/${templateId}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: checklistTemplateKeys.detail(templateId) })
      toast.success("Item atualizado")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar item")
    },
  })
}

export function useDeleteTemplateItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, itemId }: { templateId: string; itemId: string }) =>
      fetchApi<{ deleted: boolean }>(`/api/checklist-templates/${templateId}/items/${itemId}`, {
        method: "DELETE",
      }),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: checklistTemplateKeys.detail(templateId) })
      queryClient.invalidateQueries({ queryKey: checklistTemplateKeys.lists() })
      toast.success("Item removido")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover item")
    },
  })
}

export function useReorderTemplateItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, itemIds }: { templateId: string; itemIds: string[] }) =>
      fetchApi<ChecklistTemplateItem[]>(`/api/checklist-templates/${templateId}/items`, {
        method: "PATCH",
        body: JSON.stringify({ itemIds }),
      }),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: checklistTemplateKeys.detail(templateId) })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao reordenar itens")
    },
  })
}
