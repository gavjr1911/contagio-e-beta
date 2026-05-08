"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDateToISO } from "@/lib/date-utils";

// Types
export interface DashboardEvent {
  id: string;
  slug?: string | null;
  name: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string | null;
  status: string;
  template?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    schedules: number;
    items: number;
  };
}

export interface DashboardSchedule {
  id: string;
  eventId: string;
  ministryId: string;
  userId: string;
  /** @deprecated — usar `vacancy.position.name`. */
  position: string | null;
  vacancy?: {
    id: string;
    positionId: string;
    position: { id: string; name: string };
  } | null;
  status: string;
  confirmedAt: Date | null;
  declinedReason: string | null;
  createdAt: Date;
  event: {
    id: string;
    title: string;
    date: Date;
    startTime: string;
    endTime: string | null;
    type: string;
    status: string;
  };
  ministry: {
    id: string;
    name: string;
    type: string;
  };
}

export interface DashboardMinistry {
  id: string;
  name: string;
  description: string | null;
  leaderId: string | null;
  leader?: {
    id: string;
    name: string;
    email: string;
  } | null;
  members?: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export interface DashboardStats {
  upcomingEventsCount: number;
  pendingSchedulesCount: number;
  myMinistriesCount: number;
}

// Fetch upcoming events (next 30 days)
async function fetchUpcomingEvents(): Promise<DashboardEvent[]> {
  const now = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

  const params = new URLSearchParams();
  params.set("startDate", formatDateToISO(now));
  params.set("endDate", formatDateToISO(thirtyDaysLater));
  params.set("limit", "10");

  const response = await fetch(`/api/events?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Erro ao carregar eventos");
  }
  const result = await response.json();
  return result.data || [];
}

// Fetch pending schedules
async function fetchPendingSchedules(): Promise<DashboardSchedule[]> {
  const response = await fetch("/api/schedules/my?filter=pending");
  if (!response.ok) {
    throw new Error("Erro ao carregar escalas pendentes");
  }
  return response.json();
}

// Fetch user ministries
async function fetchUserMinistries(userId: string): Promise<DashboardMinistry[]> {
  const params = new URLSearchParams();
  params.set("includeMembers", "true");
  params.set("includeLeader", "true");
  params.set("limit", "100");

  const response = await fetch(`/api/ministries?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Erro ao carregar ministerios");
  }
  const result = await response.json();
  const allMinistries: DashboardMinistry[] = result.data || [];

  // Filter ministries where user is a member
  return allMinistries.filter(
    (ministry) =>
      ministry.members?.some((member) => member.userId === userId) ||
      ministry.leaderId === userId
  );
}

// Hook: useUpcomingEvents
export function useUpcomingEvents() {
  return useQuery({
    queryKey: ["dashboard", "upcoming-events"],
    queryFn: fetchUpcomingEvents,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });
}

// Hook: usePendingSchedules
export function usePendingSchedules() {
  return useQuery({
    queryKey: ["dashboard", "pending-schedules"],
    queryFn: fetchPendingSchedules,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });
}

// Hook: useUserMinistries
export function useUserMinistries(userId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard", "user-ministries", userId],
    queryFn: () => fetchUserMinistries(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook: useDashboardStats - Combines all stats
export function useDashboardStats(userId: string | undefined) {
  const eventsQuery = useUpcomingEvents();
  const schedulesQuery = usePendingSchedules();
  const ministriesQuery = useUserMinistries(userId);

  const isLoading =
    eventsQuery.isLoading || schedulesQuery.isLoading || ministriesQuery.isLoading;
  const isError =
    eventsQuery.isError || schedulesQuery.isError || ministriesQuery.isError;

  const stats: DashboardStats = {
    upcomingEventsCount: eventsQuery.data?.length ?? 0,
    pendingSchedulesCount: schedulesQuery.data?.length ?? 0,
    myMinistriesCount: ministriesQuery.data?.length ?? 0,
  };

  return {
    stats,
    events: eventsQuery.data ?? [],
    pendingSchedules: schedulesQuery.data ?? [],
    ministries: ministriesQuery.data ?? [],
    isLoading,
    isError,
    refetch: () => {
      eventsQuery.refetch();
      schedulesQuery.refetch();
      ministriesQuery.refetch();
    },
  };
}
