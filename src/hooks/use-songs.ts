"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  Song,
  SongWithHistory,
  SongFilters,
  SongsResponse,
  CreateSongInput,
  UpdateSongInput,
} from "@/types/music"

// Query keys
export const songKeys = {
  all: ["songs"] as const,
  lists: () => [...songKeys.all, "list"] as const,
  list: (filters: SongFilters) => [...songKeys.lists(), filters] as const,
  details: () => [...songKeys.all, "detail"] as const,
  detail: (id: string) => [...songKeys.details(), id] as const,
  search: (query: string) => [...songKeys.all, "search", query] as const,
}

// API types from backend
interface ApiSong {
  id: string
  name: string
  artist: string | null
  defaultKey: string | null
  lyrics: string | null
  chordLink: string | null
  spotifyUrl: string | null
  youtubeUrl: string | null
  tags: string[]
  playCount: number
  lastPlayedAt: string | null
  createdAt: string
}

interface ApiPaginatedResponse {
  data: ApiSong[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Transform API response to match expected types
function transformApiSong(apiSong: ApiSong): Song {
  return {
    id: apiSong.id,
    name: apiSong.name,
    artist: apiSong.artist || "",
    defaultKey: apiSong.defaultKey || "",
    lyrics: apiSong.lyrics || undefined,
    chordLink: apiSong.chordLink || undefined,
    spotifyUrl: apiSong.spotifyUrl || undefined,
    youtubeUrl: apiSong.youtubeUrl || undefined,
    tags: apiSong.tags || [],
    timesPlayed: apiSong.playCount,
    lastPlayedAt: apiSong.lastPlayedAt ? new Date(apiSong.lastPlayedAt) : undefined,
    createdAt: new Date(apiSong.createdAt),
    updatedAt: new Date(apiSong.createdAt),
  }
}

// API functions
async function fetchSongs(filters?: SongFilters): Promise<SongsResponse> {
  const params = new URLSearchParams()

  // A Biblioteca de Músicas pagina no cliente — traz todas as músicas que
  // casam com o filtro (sem limite silencioso do servidor).
  params.set("all", "true")

  if (filters?.search) params.set("search", filters.search)
  if (filters?.tags && filters.tags.length > 0) params.set("tag", filters.tags[0])
  if (filters?.sortBy) {
    switch (filters.sortBy) {
      case "name":
        params.set("orderBy", "name")
        params.set("order", "asc")
        break
      case "most_played":
        params.set("orderBy", "playCount")
        params.set("order", "desc")
        break
      case "last_played":
        params.set("orderBy", "lastPlayedAt")
        params.set("order", "desc")
        break
    }
  }

  const response = await fetch(`/api/songs?${params.toString()}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao carregar musicas")
  }

  const result: ApiPaginatedResponse = await response.json()

  return {
    songs: result.data.map(transformApiSong),
    total: result.pagination.total,
  }
}

async function fetchSong(id: string): Promise<SongWithHistory | null> {
  const response = await fetch(`/api/songs/${id}`)

  if (!response.ok) {
    if (response.status === 404) return null
    const error = await response.json()
    throw new Error(error.error || "Erro ao carregar música")
  }

  const result = await response.json()
  const apiSong: ApiSong = result.data || result

  return {
    ...transformApiSong(apiSong),
    eventHistory: [], // TODO: Fetch event history from setlist
  }
}

async function searchSongs(query: string): Promise<Song[]> {
  if (!query || query.length < 2) return []

  const response = await fetch(`/api/songs?search=${encodeURIComponent(query)}&limit=20`)

  if (!response.ok) {
    return []
  }

  const result: ApiPaginatedResponse = await response.json()
  return result.data.map(transformApiSong)
}

async function createSong(input: CreateSongInput): Promise<Song> {
  const response = await fetch("/api/songs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao criar música")
  }

  const result = await response.json()
  const apiSong: ApiSong = result.data
  return transformApiSong(apiSong)
}

async function updateSong(input: UpdateSongInput): Promise<Song> {
  const { id, ...data } = input
  const response = await fetch(`/api/songs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao atualizar música")
  }

  const result = await response.json()
  const apiSong: ApiSong = result.data || result
  return transformApiSong(apiSong)
}

async function deleteSong(id: string): Promise<void> {
  const response = await fetch(`/api/songs/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao deletar música")
  }
}

// Hooks
export function useSongs(filters?: SongFilters | null) {
  return useQuery({
    queryKey: songKeys.list(filters || {}),
    queryFn: () => fetchSongs(filters || undefined),
    enabled: filters !== null && filters !== undefined,
    staleTime: 30 * 1000,
  })
}

export function useSong(id: string) {
  return useQuery({
    queryKey: songKeys.detail(id),
    queryFn: () => fetchSong(id),
    enabled: !!id,
  })
}

export function useSongSearch(query: string) {
  return useQuery({
    queryKey: songKeys.search(query),
    queryFn: () => searchSongs(query),
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  })
}

export function useCreateSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSong,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: songKeys.lists() })
    },
  })
}

export function useUpdateSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateSong,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: songKeys.lists() })
      queryClient.setQueryData(songKeys.detail(data.id), data)
    },
  })
}

export function useDeleteSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSong,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: songKeys.lists() })
    },
  })
}

// Utility para obter todas as tags unicas (carrega a biblioteca inteira)
export function useAllTags() {
  const { data } = useSongs({})
  if (!data?.songs) return []
  const allTags = data.songs.flatMap((song) => song.tags || [])
  return [...new Set(allTags)].sort()
}

// Re-export types for convenience
export type { Song, SongWithHistory, SongFilters, CreateSongInput, UpdateSongInput }
