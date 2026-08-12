"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
// Hook para gerenciar ministerios e posicoes

// Types
export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
}

export interface MemberPosition {
  id: string;
  memberId: string;
  positionId: string;
  assignedAt: Date;
  position: MinistryPosition;
}

export interface MinistryMember {
  id: string;
  userId: string;
  ministryId: string;
  active: boolean;
  createdAt: Date;
  user: User;
  positions: MemberPosition[];
}

export interface MinistryPosition {
  id: string;
  ministryId: string;
  name: string;
  description: string | null;
  icon: string | null;
  createdAt: Date;
}

export interface Ministry {
  id: string;
  name: string;
  description: string | null;
  leaderId: string | null;
  permissions: PermissionsJson | null;
  createdAt: Date;
  updatedAt: Date;
  leader: User | null;
  members: MinistryMember[];
  positions?: MinistryPosition[];
  _count?: {
    members: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PermissionsJson = Record<string, any>;

export interface CreateMinistryInput {
  name: string;
  description?: string;
  leaderId?: string;
  permissions?: PermissionsJson;
}

export interface UpdateMinistryInput {
  id: string;
  name?: string;
  description?: string;
  leaderId?: string;
  permissions?: PermissionsJson | null;
}

export interface AddMemberInput {
  ministryId: string;
  userId: string;
  positionIds?: string[];
}

export interface InviteMemberInput {
  name: string;
  email: string;
  cpf: string;
  phone?: string;
  birthDate?: string;
  ministryId: string;
  positionIds?: string[];
}

export interface InviteMemberResponse {
  user: User & {
    cpf?: string;
    phone?: string;
    birthDate?: string;
  };
  member: MinistryMember;
  /** false quando o convite foi criado mas o email nao saiu (ver emailError). */
  emailSent: boolean;
  emailError?: string;
}

export interface UpdateMemberInput {
  id: string;
  positionIds?: string[];
  active?: boolean;
}

export interface CreatePositionInput {
  ministryId: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface UpdatePositionInput {
  ministryId: string;
  positionId: string;
  name?: string;
  description?: string;
  icon?: string;
}

export interface SetLeaderInput {
  ministryId: string;
  leaderId: string;
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
async function fetchMinistries(): Promise<Ministry[]> {
  const params = new URLSearchParams();
  params.set("includeMembers", "true");
  params.set("includeLeader", "true");
  const response = await fetch(`/api/ministries?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Erro ao carregar ministerios");
  }
  const result = await response.json();
  // A API retorna { data: [...], pagination: {...} }
  return result.data || [];
}

async function fetchMinistry(id: string): Promise<Ministry> {
  const response = await fetch(`/api/ministries/${id}`);
  if (!response.ok) {
    throw new Error("Erro ao carregar ministério");
  }
  const result = await response.json();
  return result.data;
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
    throw new Error(error.error || "Erro ao criar ministério");
  }
  const result = await response.json();
  return result.data;
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
    throw new Error(error.error || error.message || "Erro ao atualizar ministério");
  }
  const result = await response.json();
  return result.data;
}

async function deleteMinistry(id: string): Promise<void> {
  const response = await fetch(`/api/ministries/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erro ao excluir ministério");
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

async function inviteMember(data: InviteMemberInput): Promise<InviteMemberResponse> {
  const response = await fetch("/api/users/invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao convidar membro");
  }
  const result = await response.json();
  return result.data;
}

async function fetchUsers(): Promise<User[]> {
  const params = new URLSearchParams();
  params.set("limit", "100"); // Get more users for selection
  const response = await fetch(`/api/users?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Erro ao carregar usuários");
  }
  const result = await response.json();
  // A API retorna { data: [...], pagination: {...} }
  return result.data || [];
}

async function fetchMinistryPositions(ministryId: string): Promise<MinistryPosition[]> {
  const response = await fetch(`/api/ministries/${ministryId}/positions`);
  if (!response.ok) {
    throw new Error("Erro ao carregar funções");
  }
  const result = await response.json();
  return result.data || [];
}

async function createPosition(data: CreatePositionInput): Promise<MinistryPosition> {
  const { ministryId, ...body } = data;
  const response = await fetch(`/api/ministries/${ministryId}/positions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao criar função");
  }
  const result = await response.json();
  return result.data;
}

async function updatePosition(data: UpdatePositionInput): Promise<MinistryPosition> {
  const { ministryId, positionId, ...body } = data;
  const response = await fetch(`/api/ministries/${ministryId}/positions/${positionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao atualizar função");
  }
  const result = await response.json();
  return result.data;
}

async function deletePosition({ ministryId, positionId }: { ministryId: string; positionId: string }): Promise<void> {
  const response = await fetch(`/api/ministries/${ministryId}/positions/${positionId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao remover função");
  }
}

async function setLeader(data: SetLeaderInput): Promise<Ministry> {
  const { ministryId, leaderId } = data;
  const response = await fetch(`/api/ministries/${ministryId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ leaderId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao definir lider");
  }
  const result = await response.json();
  return result.data;
}

// Hooks
export function useMinistries() {
  return useQuery({
    queryKey: ["ministries"],
    queryFn: () => fetchMinistries(),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useMinistry(id: string) {
  return useQuery({
    queryKey: ["ministry", id],
    queryFn: () => fetchMinistry(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2, // 2 minutos
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

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inviteMember,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
      queryClient.invalidateQueries({ queryKey: ["ministry", data.member.ministryId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });

      // O usuario foi criado de qualquer forma; o que pode ter falhado e o
      // convite por email. Avisar aqui cobre todos os chamadores da mutation.
      if (data.emailSent) {
        toast.success(`Convite enviado para ${data.user.email}`);
      } else {
        toast.warning(
          `Usuário criado, mas o convite não foi enviado para ${data.user.email}. Reenvie o acesso pela tela de Usuários.`
        );
      }
    },
  });
}

export function useMinistryPositions(ministryId: string) {
  return useQuery({
    queryKey: ["ministry-positions", ministryId],
    queryFn: () => fetchMinistryPositions(ministryId),
    enabled: !!ministryId,
  });
}

// Position with ministry info
export interface PositionWithMinistry extends MinistryPosition {
  ministry: {
    id: string;
    name: string;
  };
}

// Fetch all positions from all ministries
async function fetchAllPositions(): Promise<PositionWithMinistry[]> {
  const response = await fetch("/api/ministries?includePositions=true");
  if (!response.ok) {
    throw new Error("Erro ao carregar funções");
  }
  const result = await response.json();
  const ministries = result.data || [];

  // Flatten positions from all ministries
  const allPositions: PositionWithMinistry[] = [];
  for (const ministry of ministries) {
    if (ministry.positions) {
      for (const position of ministry.positions) {
        allPositions.push({
          ...position,
          ministry: {
            id: ministry.id,
            name: ministry.name,
          },
        });
      }
    }
  }

  // Sort by ministry name, then position name
  allPositions.sort((a, b) => {
    const ministryCompare = a.ministry.name.localeCompare(b.ministry.name);
    if (ministryCompare !== 0) return ministryCompare;
    return a.name.localeCompare(b.name);
  });

  return allPositions;
}

export function useAllPositions() {
  return useQuery({
    queryKey: ["all-positions"],
    queryFn: fetchAllPositions,
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPosition,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ministry-positions", data.ministryId] });
      queryClient.invalidateQueries({ queryKey: ["ministry", data.ministryId] });
    },
  });
}

export function useUpdatePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePosition,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ministry-positions", data.ministryId] });
      queryClient.invalidateQueries({ queryKey: ["ministry", data.ministryId] });
    },
  });
}

export function useDeletePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePosition,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ministry-positions", variables.ministryId] });
      queryClient.invalidateQueries({ queryKey: ["ministry", variables.ministryId] });
    },
  });
}

export function useSetLeader() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setLeader,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
      queryClient.invalidateQueries({ queryKey: ["ministry", data.id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
