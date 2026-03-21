"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Song,
  SongWithHistory,
  SongFilters,
  SongsResponse,
  CreateSongInput,
  UpdateSongInput,
} from "@/types/music";

// Mock data para desenvolvimento
const mockSongs: Song[] = [
  {
    id: "1",
    name: "Quao Grande E O Meu Deus",
    artist: "Soraya Moraes",
    defaultKey: "G",
    lyrics: "A esplendor de um Rei\nVestido em majestade...",
    chordLink: "https://www.cifraclub.com.br/soraya-moraes/quao-grande-e-o-meu-deus/",
    tags: ["Adoracao", "Louvor"],
    timesPlayed: 45,
    lastPlayedAt: new Date("2024-03-10"),
    createdAt: new Date("2023-01-15"),
    updatedAt: new Date("2024-03-10"),
  },
  {
    id: "2",
    name: "Lugar Secreto",
    artist: "Gabriela Rocha",
    defaultKey: "D",
    lyrics: "Eu encontro paz\nQuando estou aos Teus pes...",
    chordLink: "https://www.cifraclub.com.br/gabriela-rocha/lugar-secreto/",
    tags: ["Intimidade", "Adoracao"],
    timesPlayed: 32,
    lastPlayedAt: new Date("2024-03-15"),
    createdAt: new Date("2023-02-20"),
    updatedAt: new Date("2024-03-15"),
  },
  {
    id: "3",
    name: "Oceanos",
    artist: "Hillsong United",
    defaultKey: "D",
    lyrics: "Voce me chama pra andar sobre as aguas...",
    chordLink: "https://www.cifraclub.com.br/hillsong-united/oceanos/",
    tags: ["Adoracao", "Intimidade"],
    timesPlayed: 67,
    lastPlayedAt: new Date("2024-03-18"),
    createdAt: new Date("2022-11-10"),
    updatedAt: new Date("2024-03-18"),
  },
  {
    id: "4",
    name: "Eu Navegarei",
    artist: "Comunidade de Nilopolis",
    defaultKey: "E",
    chordLink: "https://www.cifraclub.com.br/comunidade-de-nilopolis/eu-navegarei/",
    tags: ["Celebracao", "Louvor"],
    timesPlayed: 28,
    lastPlayedAt: new Date("2024-02-25"),
    createdAt: new Date("2023-03-05"),
    updatedAt: new Date("2024-02-25"),
  },
  {
    id: "5",
    name: "Nosso Deus",
    artist: "Chris Tomlin",
    defaultKey: "A",
    lyrics: "Agua Tu transformaste em vinho...",
    chordLink: "https://www.cifraclub.com.br/chris-tomlin/nosso-deus/",
    tags: ["Louvor", "Celebracao", "Avivamento"],
    timesPlayed: 55,
    lastPlayedAt: new Date("2024-03-20"),
    createdAt: new Date("2022-08-15"),
    updatedAt: new Date("2024-03-20"),
  },
];

const mockSongHistory: Record<string, SongWithHistory["eventHistory"]> = {
  "1": [
    { id: "e1", eventName: "Culto de Domingo", eventDate: new Date("2024-03-10"), keyPlayed: "G" },
    { id: "e2", eventName: "Culto de Quarta", eventDate: new Date("2024-02-28"), keyPlayed: "A" },
    { id: "e3", eventName: "Conferencia de Jovens", eventDate: new Date("2024-02-15"), keyPlayed: "G" },
  ],
  "2": [
    { id: "e4", eventName: "Culto de Domingo", eventDate: new Date("2024-03-15"), keyPlayed: "D" },
    { id: "e5", eventName: "Culto Especial", eventDate: new Date("2024-03-01"), keyPlayed: "E" },
  ],
  "3": [
    { id: "e6", eventName: "Culto de Domingo", eventDate: new Date("2024-03-18"), keyPlayed: "D" },
    { id: "e7", eventName: "Culto de Domingo", eventDate: new Date("2024-03-03"), keyPlayed: "D" },
    { id: "e8", eventName: "Retiro", eventDate: new Date("2024-02-20"), keyPlayed: "E" },
  ],
};

// API functions (substituir por chamadas reais)
async function fetchSongs(filters?: SongFilters): Promise<SongsResponse> {
  // Simular delay de rede
  await new Promise((resolve) => setTimeout(resolve, 500));

  let filtered = [...mockSongs];

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (song) =>
        song.name.toLowerCase().includes(searchLower) ||
        song.artist.toLowerCase().includes(searchLower)
    );
  }

  if (filters?.tags && filters.tags.length > 0) {
    filtered = filtered.filter((song) =>
      filters.tags!.some((tag) => song.tags.includes(tag))
    );
  }

  if (filters?.sortBy) {
    switch (filters.sortBy) {
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "most_played":
        filtered.sort((a, b) => b.timesPlayed - a.timesPlayed);
        break;
      case "last_played":
        filtered.sort((a, b) => {
          const dateA = a.lastPlayedAt?.getTime() || 0;
          const dateB = b.lastPlayedAt?.getTime() || 0;
          return dateB - dateA;
        });
        break;
    }
  }

  return { songs: filtered, total: filtered.length };
}

async function fetchSong(id: string): Promise<SongWithHistory | null> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const song = mockSongs.find((s) => s.id === id);
  if (!song) return null;
  return {
    ...song,
    eventHistory: mockSongHistory[id] || [],
  };
}

async function searchSongs(query: string): Promise<Song[]> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const searchLower = query.toLowerCase();
  return mockSongs.filter(
    (song) =>
      song.name.toLowerCase().includes(searchLower) ||
      song.artist.toLowerCase().includes(searchLower)
  );
}

async function createSong(input: CreateSongInput): Promise<Song> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const newSong: Song = {
    id: String(mockSongs.length + 1),
    ...input,
    timesPlayed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  mockSongs.push(newSong);
  return newSong;
}

async function updateSong(input: UpdateSongInput): Promise<Song> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const index = mockSongs.findIndex((s) => s.id === input.id);
  if (index === -1) throw new Error("Musica nao encontrada");
  mockSongs[index] = { ...mockSongs[index], ...input, updatedAt: new Date() };
  return mockSongs[index];
}

async function deleteSong(id: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const index = mockSongs.findIndex((s) => s.id === id);
  if (index !== -1) mockSongs.splice(index, 1);
}

// Query keys
export const songKeys = {
  all: ["songs"] as const,
  lists: () => [...songKeys.all, "list"] as const,
  list: (filters: SongFilters) => [...songKeys.lists(), filters] as const,
  details: () => [...songKeys.all, "detail"] as const,
  detail: (id: string) => [...songKeys.details(), id] as const,
  search: (query: string) => [...songKeys.all, "search", query] as const,
};

// Hooks
export function useSongs(filters?: SongFilters) {
  return useQuery({
    queryKey: songKeys.list(filters || {}),
    queryFn: () => fetchSongs(filters),
  });
}

export function useSong(id: string) {
  return useQuery({
    queryKey: songKeys.detail(id),
    queryFn: () => fetchSong(id),
    enabled: !!id,
  });
}

export function useSongSearch(query: string) {
  return useQuery({
    queryKey: songKeys.search(query),
    queryFn: () => searchSongs(query),
    enabled: query.length >= 2,
    staleTime: 30 * 1000, // 30 segundos
  });
}

export function useCreateSong() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSong,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: songKeys.lists() });
    },
  });
}

export function useUpdateSong() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSong,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: songKeys.lists() });
      queryClient.setQueryData(songKeys.detail(data.id), data);
    },
  });
}

export function useDeleteSong() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSong,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: songKeys.lists() });
    },
  });
}

// Utility para obter todas as tags unicas
export function useAllTags() {
  const { data } = useSongs();
  if (!data) return [];
  const allTags = data.songs.flatMap((song) => song.tags);
  return [...new Set(allTags)].sort();
}
