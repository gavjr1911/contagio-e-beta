import { type NextRequest } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/schedules/my - Get current user's schedules
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get("filter");

    const now = new Date();

    // Build where clause based on filter
    let where: Record<string, unknown> = {
      userId: session.user.id,
    };

    switch (filter) {
      case "pending":
        where = {
          ...where,
          status: "PENDING",
          event: {
            date: { gte: now },
            status: { not: "COMPLETED" },
          },
        };
        break;
      case "confirmed":
        where = {
          ...where,
          status: "CONFIRMED",
          event: {
            date: { gte: now },
            status: { not: "COMPLETED" },
          },
        };
        break;
      case "history":
        where = {
          ...where,
          OR: [
            { event: { date: { lt: now } } },
            { event: { status: "COMPLETED" } },
            { status: "DECLINED" },
          ],
        };
        break;
      default:
        // all - show only upcoming events
        where = {
          ...where,
          event: {
            date: { gte: now },
            status: { not: "COMPLETED" },
          },
        };
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            name: true,
            type: true,
            date: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        },
        ministry: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: [
        { event: { date: "asc" } },
        { event: { startTime: "asc" } },
        { createdAt: "asc" },
      ],
    });

    // Transform to match expected interface
    const transformedSchedules = schedules.map((schedule) => ({
      id: schedule.id,
      eventId: schedule.eventId,
      ministryId: schedule.ministryId,
      userId: schedule.userId,
      position: schedule.position,
      status: schedule.status,
      confirmedAt: schedule.confirmedAt,
      declinedReason: schedule.declinedReason,
      createdAt: schedule.createdAt,
      event: {
        id: schedule.event.id,
        title: schedule.event.name,
        date: schedule.event.date,
        startTime: schedule.event.startTime,
        endTime: schedule.event.endTime,
        type: schedule.event.type,
        status: schedule.event.status,
      },
      ministry: {
        id: schedule.ministry.id,
        name: schedule.ministry.name,
        type: schedule.ministry.type,
      },
    }));

    return Response.json(transformedSchedules);
  } catch (error) {
    console.error("Error fetching user schedules:", error);
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
