import { type NextRequest } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createBlockedDateSchema } from "@/lib/validations/schedule";

// GET /api/blocked-dates - Get current user's blocked dates
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const blockedDates = await prisma.blockedDate.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { startDate: "asc" },
    });

    return Response.json(blockedDates);
  } catch (error) {
    console.error("Error fetching blocked dates:", error);
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// POST /api/blocked-dates - Add blocked date for current user
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = createBlockedDateSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { startDate, endDate, reason } = parseResult.data;

    // Check for overlapping blocked dates
    const overlapping = await prisma.blockedDate.findFirst({
      where: {
        userId: session.user.id,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (overlapping) {
      return Response.json(
        {
          error: "Ja existe uma data bloqueada que sobrepoe este periodo",
        },
        { status: 409 }
      );
    }

    const blockedDate = await prisma.blockedDate.create({
      data: {
        userId: session.user.id,
        startDate,
        endDate,
        reason,
      },
    });

    return Response.json(blockedDate, { status: 201 });
  } catch (error) {
    console.error("Error creating blocked date:", error);
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
