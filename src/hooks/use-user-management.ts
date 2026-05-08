"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ManagedUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  role: "ADMIN" | "LEADER" | "VOLUNTEER";
  active: boolean;
  createdAt: string;
  ministryMemberships: {
    id: string;
    active: boolean;
    ministry: {
      id: string;
      name: string;
    };
  }[];
}

interface UsersResponse {
  data: ManagedUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UsersHookResult {
  items: ManagedUser[];
  pagination: UsersResponse["pagination"];
}

interface UserFilters {
  search?: string;
  role?: string;
  ministryId?: string;
  active?: string;
  page?: number;
  limit?: number;
}

async function fetchUsers(filters: UserFilters): Promise<UsersHookResult> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.role) params.set("role", filters.role);
  if (filters.ministryId) params.set("ministryId", filters.ministryId);
  if (filters.active !== undefined) params.set("active", filters.active);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const res = await fetch(`/api/users?${params.toString()}`);
  if (!res.ok) throw new Error("Erro ao carregar usuários");
  const json: UsersResponse = await res.json();
  // API agora retorna { data: items, pagination }
  // Mantemos a forma { items, pagination } para o consumidor.
  return { items: json.data, pagination: json.pagination };
}

export function useManagedUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: ["managed-users", filters],
    queryFn: () => fetchUsers(filters),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
      active?: boolean;
      image?: string | null;
    }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erro ao atualizar usuário");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-users"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
    },
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erro ao alterar status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-users"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
