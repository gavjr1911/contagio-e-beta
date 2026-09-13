/**
 * Busca no banco as escalas do usuário num evento, já com a matriz de
 * permissões do ministério — insumo para `canCompleteEventWith` e
 * `canRegisterAttendanceWith` (que são puras e ficam em `event-access.ts`).
 */
import { prisma } from "@/lib/prisma";
import type { EventAssignment, EventScheduleStatus } from "./event-access";

export async function loadEventAssignments(
  eventId: string,
  userId: string
): Promise<EventAssignment[]> {
  const schedules = await prisma.schedule.findMany({
    where: { eventId, userId },
    select: {
      ministryId: true,
      status: true,
      ministry: { select: { leaderId: true, permissions: true } },
    },
  });

  return schedules.map((schedule) => ({
    ministryId: schedule.ministryId,
    status: schedule.status as EventScheduleStatus,
    isMinistryLeader: schedule.ministry.leaderId === userId,
    ministryPermissions: schedule.ministry.permissions,
  }));
}
