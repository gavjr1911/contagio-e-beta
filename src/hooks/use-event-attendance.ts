"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export interface EventAttendance {
  eventId: string
  attendees: number
  visitors: number
  conversions: number
  notes: string | null
  updatedAt: string | null
  updatedBy: { id: string; name: string | null } | null
}

export interface UpdateAttendanceInput {
  attendees?: number
  visitors?: number
  conversions?: number
  notes?: string | null
}

const attendanceKey = (eventId: string) =>
  ["events", eventId, "attendance"] as const

async function fetchAttendance(eventId: string): Promise<EventAttendance> {
  const response = await fetch(`/api/events/${eventId}/attendance`)
  if (!response.ok) {
    throw new Error("Erro ao carregar presença")
  }
  const json = await response.json()
  return json.data
}

async function updateAttendance(
  eventId: string,
  input: UpdateAttendanceInput
): Promise<EventAttendance> {
  const response = await fetch(`/api/events/${eventId}/attendance`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || "Erro ao salvar presença")
  }
  const json = await response.json()
  return json.data
}

export function useEventAttendance(eventId: string) {
  return useQuery({
    queryKey: attendanceKey(eventId),
    queryFn: () => fetchAttendance(eventId),
    enabled: !!eventId,
  })
}

export function useUpdateEventAttendance(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAttendanceInput) =>
      updateAttendance(eventId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(attendanceKey(eventId), data)
    },
  })
}
