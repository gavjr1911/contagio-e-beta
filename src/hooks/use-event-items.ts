"use client"

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { eventKeys } from "./use-events"

// Types
export type EventItemType =
  | "WELCOME"
  | "WORSHIP"
  | "PRAYER"
  | "READING"
  | "ANNOUNCEMENTS"
  | "OFFERING"
  | "PREACHING"
  | "COMMUNION"
  | "VIDEO"
  | "SPECIAL"
  | "TRANSITION"
  | "OTHER"

export interface SetlistItemSong {
  id: string
  name: string
  artist: string | null
  defaultKey: string | null
  chordLink?: string | null
}

export interface SetlistItem {
  id: string
  eventId: string
  eventItemId: string | null
  order: number
  songId: string
  key: string | null
  notes: string | null
  song: SetlistItemSong
}

export interface EventItem {
  id: string
  eventId: string
  order: number
  type: EventItemType
  title: string
  description: string | null
  durationMinutes: number | null
  responsibleId: string | null
  bibleReference: string | null
  mediaUrl: string | null
  notes: string | null
  isPublic: boolean
  expectedSongCount: number | null
  requiresMedia: boolean
  createdAt: string
  updatedAt: string
  responsible: {
    id: string
    name: string | null
    email: string
    image?: string | null
  } | null
  setlistItems: SetlistItem[]
}

export interface CreateEventItemInput {
  type: EventItemType
  title: string
  description?: string
  durationMinutes?: number
  responsibleId?: string
  order?: number
  bibleReference?: string
  mediaUrl?: string
  notes?: string
  isPublic?: boolean
  expectedSongCount?: number
  requiresMedia?: boolean
}

export interface UpdateEventItemInput {
  type?: EventItemType
  title?: string
  description?: string
  durationMinutes?: number
  responsibleId?: string
  bibleReference?: string
  mediaUrl?: string
  notes?: string
  isPublic?: boolean
  expectedSongCount?: number | null
  requiresMedia?: boolean
}

// Labels and icons for each item type
export const eventItemTypeConfig: Record<
  EventItemType,
  { label: string; emoji: string; color: string }
> = {
  WELCOME: { label: "Boas-vindas", emoji: "👋", color: "bg-blue-500" },
  WORSHIP: { label: "Louvor", emoji: "🎵", color: "bg-primary" },
  PRAYER: { label: "Oracao", emoji: "🙏", color: "bg-purple-500" },
  READING: { label: "Leitura Biblica", emoji: "📖", color: "bg-amber-500" },
  ANNOUNCEMENTS: { label: "Avisos", emoji: "📢", color: "bg-cyan-500" },
  OFFERING: { label: "Dizimos e Ofertas", emoji: "💰", color: "bg-emerald-500" },
  PREACHING: { label: "Pregacao", emoji: "🎤", color: "bg-red-500" },
  COMMUNION: { label: "Santa Ceia", emoji: "🍞", color: "bg-orange-500" },
  VIDEO: { label: "Video", emoji: "🎬", color: "bg-pink-500" },
  SPECIAL: { label: "Participacao Especial", emoji: "⭐", color: "bg-yellow-500" },
  TRANSITION: { label: "Transicao", emoji: "⏸️", color: "bg-gray-500" },
  OTHER: { label: "Outros", emoji: "📋", color: "bg-slate-500" },
}

// Query keys
export const eventItemKeys = {
  all: ["eventItems"] as const,
  lists: () => [...eventItemKeys.all, "list"] as const,
  list: (eventId: string) => [...eventItemKeys.lists(), eventId] as const,
  detail: (eventId: string, itemId: string) =>
    [...eventItemKeys.list(eventId), itemId] as const,
}

// API functions
async function fetchEventItems(eventId: string): Promise<EventItem[]> {
  const response = await fetch(`/api/events/${eventId}/items`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao carregar itens")
  }

  const result = await response.json()
  return result.data || []
}

async function createEventItem(
  eventId: string,
  data: CreateEventItemInput
): Promise<EventItem> {
  const response = await fetch(`/api/events/${eventId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao criar item")
  }

  const result = await response.json()
  return result.data
}

async function updateEventItem(
  eventId: string,
  itemId: string,
  data: UpdateEventItemInput
): Promise<EventItem> {
  const response = await fetch(`/api/events/${eventId}/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao atualizar item")
  }

  const result = await response.json()
  return result.data
}

async function deleteEventItem(
  eventId: string,
  itemId: string
): Promise<void> {
  const response = await fetch(`/api/events/${eventId}/items/${itemId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao deletar item")
  }
}

async function reorderEventItems(
  eventId: string,
  itemIds: string[]
): Promise<EventItem[]> {
  const response = await fetch(`/api/events/${eventId}/items`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemIds }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao reordenar itens")
  }

  const result = await response.json()
  return result.data
}

// Hooks
export function useEventItems(eventId: string) {
  return useQuery({
    queryKey: eventItemKeys.list(eventId),
    queryFn: () => fetchEventItems(eventId),
    enabled: !!eventId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useCreateEventItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      eventId,
      data,
    }: {
      eventId: string
      data: CreateEventItemInput
    }) => createEventItem(eventId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: eventItemKeys.list(variables.eventId),
      })
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(variables.eventId),
      })
    },
  })
}

export function useUpdateEventItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      eventId,
      itemId,
      data,
    }: {
      eventId: string
      itemId: string
      data: UpdateEventItemInput
    }) => updateEventItem(eventId, itemId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: eventItemKeys.list(variables.eventId),
      })
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(variables.eventId),
      })
    },
  })
}

export function useDeleteEventItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, itemId }: { eventId: string; itemId: string }) =>
      deleteEventItem(eventId, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: eventItemKeys.list(variables.eventId),
      })
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(variables.eventId),
      })
    },
  })
}

export function useReorderEventItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, itemIds }: { eventId: string; itemIds: string[] }) =>
      reorderEventItems(eventId, itemIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: eventItemKeys.list(variables.eventId),
      })
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(variables.eventId),
      })
    },
  })
}

// ========================================
// Item Songs Management
// ========================================

async function addSongsToItem(
  eventId: string,
  itemId: string,
  songIds: string[]
): Promise<SetlistItem[]> {
  const response = await fetch(`/api/events/${eventId}/items/${itemId}/songs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ songIds }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao adicionar musicas")
  }

  const result = await response.json()
  return result.data
}

async function removeSongFromItem(
  eventId: string,
  itemId: string,
  songId: string
): Promise<void> {
  const response = await fetch(
    `/api/events/${eventId}/items/${itemId}/songs?songId=${songId}`,
    { method: "DELETE" }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Erro ao remover musica")
  }
}

export function useAddSongsToItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      eventId,
      itemId,
      songIds,
    }: {
      eventId: string
      itemId: string
      songIds: string[]
    }) => addSongsToItem(eventId, itemId, songIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: eventItemKeys.list(variables.eventId),
      })
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(variables.eventId),
      })
    },
  })
}

export function useRemoveSongFromItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      eventId,
      itemId,
      songId,
    }: {
      eventId: string
      itemId: string
      songId: string
    }) => removeSongFromItem(eventId, itemId, songId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: eventItemKeys.list(variables.eventId),
      })
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(variables.eventId),
      })
    },
  })
}

// ========================================
// Helper functions
// ========================================

export function calculateStartTimes(
  items: EventItem[],
  eventStartTime: string
): Map<string, string> {
  const startTimes = new Map<string, string>()

  // Parse event start time (HH:MM format)
  const [hours, minutes] = eventStartTime.split(":").map(Number)
  let currentMinutes = hours * 60 + minutes

  for (const item of items) {
    const itemHours = Math.floor(currentMinutes / 60)
    const itemMins = currentMinutes % 60
    const timeStr = `${String(itemHours).padStart(2, "0")}:${String(itemMins).padStart(2, "0")}`
    startTimes.set(item.id, timeStr)

    // Add duration for next item
    if (item.durationMinutes) {
      currentMinutes += item.durationMinutes
    }
  }

  return startTimes
}

export function calculateTotalDuration(items: EventItem[]): number {
  return items.reduce((total, item) => total + (item.durationMinutes || 0), 0)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours}h`
  }
  return `${hours}h${mins}min`
}
