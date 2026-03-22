"use client"

import { useQuery } from "@tanstack/react-query"

// Types
export interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  role: "ADMIN" | "COORDINATOR" | "LEADER" | "COMMUNICATION" | "VOLUNTEER"
  createdAt: string
  ministryMemberships?: {
    ministry: {
      id: string
      name: string
    }
  }[]
}

export interface UserFilters {
  search?: string
  role?: string
  ministryId?: string
  page?: number
  limit?: number
}

export interface PaginatedUsersResponse {
  data: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Query keys
export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
}

// API functions
async function fetchUsers(filters?: UserFilters): Promise<PaginatedUsersResponse> {
  const params = new URLSearchParams()

  if (filters?.search) params.set("search", filters.search)
  if (filters?.role) params.set("role", filters.role)
  if (filters?.ministryId) params.set("ministryId", filters.ministryId)
  if (filters?.page) params.set("page", String(filters.page))
  if (filters?.limit) params.set("limit", String(filters.limit))

  const response = await fetch(`/api/users?${params.toString()}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao carregar usuarios")
  }

  return response.json()
}

// Hooks
export function useUsers(filters?: UserFilters | null) {
  return useQuery({
    queryKey: userKeys.list(filters || {}),
    queryFn: () => fetchUsers(filters || undefined),
    enabled: filters !== null && filters !== undefined,
    staleTime: 30 * 1000,
  })
}

export function useUserSearch(query: string) {
  return useQuery({
    queryKey: userKeys.list({ search: query, limit: 20 }),
    queryFn: () => fetchUsers({ search: query, limit: 20 }),
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  })
}
