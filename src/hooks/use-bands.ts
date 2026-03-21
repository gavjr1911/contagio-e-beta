"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Band,
  BandWithHistory,
  BandsResponse,
  BandMember,
  CreateBandInput,
  UpdateBandInput,
} from "@/types/music";

// Mock data para desenvolvimento
const mockMembers: BandMember[] = [
  { id: "m1", name: "Lucas Silva", instruments: ["Vocal", "Violao"], avatarUrl: undefined },
  { id: "m2", name: "Ana Costa", instruments: ["Vocal"], avatarUrl: undefined },
  { id: "m3", name: "Pedro Santos", instruments: ["Guitarra", "Baixo"], avatarUrl: undefined },
  { id: "m4", name: "Maria Oliveira", instruments: ["Teclado", "Piano"], avatarUrl: undefined },
  { id: "m5", name: "Joao Ferreira", instruments: ["Bateria"], avatarUrl: undefined },
  { id: "m6", name: "Juliana Lima", instruments: ["Vocal"], avatarUrl: undefined },
  { id: "m7", name: "Carlos Rocha", instruments: ["Baixo"], avatarUrl: undefined },
  { id: "m8", name: "Fernanda Alves", instruments: ["Saxofone", "Flauta"], avatarUrl: undefined },
];

const mockBands: Band[] = [
  {
    id: "b1",
    name: "Banda Principal",
    description: "Banda que toca nos cultos de domingo pela manha",
    members: [mockMembers[0], mockMembers[2], mockMembers[3], mockMembers[4]],
    createdAt: new Date("2023-01-10"),
    updatedAt: new Date("2024-03-15"),
  },
  {
    id: "b2",
    name: "Banda Jovem",
    description: "Banda do ministerio de jovens",
    members: [mockMembers[1], mockMembers[5], mockMembers[6]],
    createdAt: new Date("2023-06-20"),
    updatedAt: new Date("2024-03-10"),
  },
  {
    id: "b3",
    name: "Banda Noturna",
    description: "Banda que toca nos cultos de domingo a noite",
    members: [mockMembers[0], mockMembers[1], mockMembers[3], mockMembers[4], mockMembers[7]],
    createdAt: new Date("2023-03-15"),
    updatedAt: new Date("2024-03-18"),
  },
];

const mockBandHistory: Record<string, BandWithHistory["eventHistory"]> = {
  b1: [
    { id: "be1", eventName: "Culto de Domingo - Manha", eventDate: new Date("2024-03-17") },
    { id: "be2", eventName: "Culto de Domingo - Manha", eventDate: new Date("2024-03-10") },
    { id: "be3", eventName: "Culto Especial de Pascoa", eventDate: new Date("2024-03-24") },
  ],
  b2: [
    { id: "be4", eventName: "Culto de Jovens", eventDate: new Date("2024-03-16") },
    { id: "be5", eventName: "Conferencia de Jovens", eventDate: new Date("2024-02-15") },
  ],
  b3: [
    { id: "be6", eventName: "Culto de Domingo - Noite", eventDate: new Date("2024-03-17") },
    { id: "be7", eventName: "Culto de Domingo - Noite", eventDate: new Date("2024-03-10") },
  ],
};

// API functions (substituir por chamadas reais)
async function fetchBands(): Promise<BandsResponse> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { bands: mockBands, total: mockBands.length };
}

async function fetchBand(id: string): Promise<BandWithHistory | null> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const band = mockBands.find((b) => b.id === id);
  if (!band) return null;
  return {
    ...band,
    eventHistory: mockBandHistory[id] || [],
  };
}

async function fetchMembers(): Promise<BandMember[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return mockMembers;
}

async function createBand(input: CreateBandInput): Promise<Band> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const members = mockMembers.filter((m) => input.memberIds.includes(m.id));
  const newBand: Band = {
    id: `b${mockBands.length + 1}`,
    name: input.name,
    description: input.description,
    members,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockBands.push(newBand);
  return newBand;
}

async function updateBand(input: UpdateBandInput): Promise<Band> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const index = mockBands.findIndex((b) => b.id === input.id);
  if (index === -1) throw new Error("Banda nao encontrada");

  const members = input.memberIds
    ? mockMembers.filter((m) => input.memberIds!.includes(m.id))
    : mockBands[index].members;

  mockBands[index] = {
    ...mockBands[index],
    ...input,
    members,
    updatedAt: new Date()
  };
  return mockBands[index];
}

async function deleteBand(id: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const index = mockBands.findIndex((b) => b.id === id);
  if (index !== -1) mockBands.splice(index, 1);
}

async function addMemberToBand(bandId: string, memberId: string): Promise<Band> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const bandIndex = mockBands.findIndex((b) => b.id === bandId);
  if (bandIndex === -1) throw new Error("Banda nao encontrada");

  const member = mockMembers.find((m) => m.id === memberId);
  if (!member) throw new Error("Membro nao encontrado");

  if (!mockBands[bandIndex].members.find((m) => m.id === memberId)) {
    mockBands[bandIndex].members.push(member);
    mockBands[bandIndex].updatedAt = new Date();
  }

  return mockBands[bandIndex];
}

async function removeMemberFromBand(bandId: string, memberId: string): Promise<Band> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const bandIndex = mockBands.findIndex((b) => b.id === bandId);
  if (bandIndex === -1) throw new Error("Banda nao encontrada");

  mockBands[bandIndex].members = mockBands[bandIndex].members.filter(
    (m) => m.id !== memberId
  );
  mockBands[bandIndex].updatedAt = new Date();

  return mockBands[bandIndex];
}

// Query keys
export const bandKeys = {
  all: ["bands"] as const,
  lists: () => [...bandKeys.all, "list"] as const,
  list: () => [...bandKeys.lists()] as const,
  details: () => [...bandKeys.all, "detail"] as const,
  detail: (id: string) => [...bandKeys.details(), id] as const,
  members: () => ["members"] as const,
};

// Hooks
export function useBands() {
  return useQuery({
    queryKey: bandKeys.list(),
    queryFn: fetchBands,
  });
}

export function useBand(id: string) {
  return useQuery({
    queryKey: bandKeys.detail(id),
    queryFn: () => fetchBand(id),
    enabled: !!id,
  });
}

export function useMembers() {
  return useQuery({
    queryKey: bandKeys.members(),
    queryFn: fetchMembers,
  });
}

export function useCreateBand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bandKeys.lists() });
    },
  });
}

export function useUpdateBand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBand,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bandKeys.lists() });
      queryClient.setQueryData(bandKeys.detail(data.id), data);
    },
  });
}

export function useDeleteBand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bandKeys.lists() });
    },
  });
}

export function useAddMemberToBand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bandId, memberId }: { bandId: string; memberId: string }) =>
      addMemberToBand(bandId, memberId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bandKeys.lists() });
      queryClient.setQueryData(bandKeys.detail(data.id), data);
    },
  });
}

export function useRemoveMemberFromBand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bandId, memberId }: { bandId: string; memberId: string }) =>
      removeMemberFromBand(bandId, memberId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bandKeys.lists() });
      queryClient.setQueryData(bandKeys.detail(data.id), data);
    },
  });
}
