"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MinistryType } from "@/generated/prisma/enums";

// Types
export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
}

export interface MinistryMember {
  id: string;
  userId: string;
  ministryId: string;
  position: string | null;
  active: boolean;
  createdAt: Date;
  user: User;
}

export interface Ministry {
  id: string;
  name: string;
  description: string | null;
  type: MinistryType;
  leaderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  leader: User | null;
  members: MinistryMember[];
  _count?: {
    members: number;
  };
}

export interface CreateMinistryInput {
  name: string;
  description?: string;
  type: MinistryType;
  leaderId?: string;
}

export interface UpdateMinistryInput {
  id: string;
  name?: string;
  description?: string;
  type?: MinistryType;
  leaderId?: string;
}

export interface AddMemberInput {
  ministryId: string;
  userId: string;
  position?: string;
}

export interface UpdateMemberInput {
  id: string;
  position?: string;
  active?: boolean;
}

// Paginated response type
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// API functions
async function fetchMinistries(type?: MinistryType): Promise<Ministry[]> {
  const params = new URLSearchParams();
  params.set("includeMembers", "true");
  params.set("includeLeader", "true");
  if (type) {
    params.set("type", type);
  }
  const response = await fetch(`/api/ministries?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Erro ao carregar ministerios");
  }
  const result: PaginatedResponse<Ministry> = await response.json();
  return result.data;
}

async function fetchMinistry(id: string): Promise<Ministry> {
  const response = await fetch(`/api/ministries/${id}`);
  if (!response.ok) {
    throw new Error("Erro ao carregar ministerio");
  }
  return response.json();
}

async function createMinistry(data: CreateMinistryInput): Promise<Ministry> {
  const response = await fetch("/api/ministries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erro ao criar ministerio");
  }
  return response.json();
}

async function updateMinistry(data: UpdateMinistryInput): Promise<Ministry> {
  const { id, ...body } = data;
  const response = await fetch(`/api/ministries/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erro ao atualizar ministerio");
  }
  return response.json();
}

async function deleteMinistry(id: string): Promise<void> {
  const response = await fetch(`/api/ministries/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erro ao excluir ministerio");
  }
}

async function addMember(data: AddMemberInput): Promise<MinistryMember> {
  const { ministryId, ...body } = data;
  const response = await fetch(`/api/ministries/${ministryId}/members`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erro ao adicionar membro");
  }
  return response.json();
}

async function updateMember(data: UpdateMemberInput): Promise<MinistryMember> {
  const { id, ...body } = data;
  const response = await fetch(`/api/ministry-members/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erro ao atualizar membro");
  }
  return response.json();
}

async function removeMember(id: string): Promise<void> {
  const response = await fetch(`/api/ministry-members/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erro ao remover membro");
  }
}

async function fetchUsers(): Promise<User[]> {
  const params = new URLSearchParams();
  params.set("limit", "100"); // Get more users for selection
  const response = await fetch(`/api/users?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Erro ao carregar usuarios");
  }
  const result: PaginatedResponse<User> = await response.json();
  return result.data;
}

// Hooks
export function useMinistries(type?: MinistryType) {
  return useQuery({
    queryKey: ["ministries", type],
    queryFn: () => fetchMinistries(type),
  });
}

export function useMinistry(id: string) {
  return useQuery({
    queryKey: ["ministry", id],
    queryFn: () => fetchMinistry(id),
    enabled: !!id,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
}

export function useCreateMinistry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMinistry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
    },
  });
}

export function useUpdateMinistry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMinistry,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
      queryClient.invalidateQueries({ queryKey: ["ministry", data.id] });
    },
  });
}

export function useDeleteMinistry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteMinistry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
    },
  });
}

export function useAddMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addMember,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
      queryClient.invalidateQueries({ queryKey: ["ministry", data.ministryId] });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
      queryClient.invalidateQueries({ queryKey: ["ministry"] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
      queryClient.invalidateQueries({ queryKey: ["ministry"] });
    },
  });
}

// Helper para traduzir tipos de ministerio
export const ministryTypeLabels: Record<MinistryType, string> = {
  RECEPTION: "Recepcao",
  PASTORAL: "Pastoral",
  TECHNICAL: "Tecnico",
  WORSHIP: "Louvor",
  COMMUNICATION: "Comunicacao",
  CONTAGIE: "Contagie",
};

export function getMinistryTypeLabel(type: MinistryType): string {
  return ministryTypeLabels[type] || type;
}
