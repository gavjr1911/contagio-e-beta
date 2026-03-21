import { type NextRequest } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/blocked-dates/[id] - Remove blocked date
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Verify blocked date exists and belongs to current user
    const blockedDate = await prisma.blockedDate.findUnique({
      where: { id },
    });

    if (!blockedDate) {
      return Response.json(
        { error: "Data bloqueada nao encontrada" },
        { status: 404 }
      );
    }

    // Only owner or admin can delete
    const userRole = session.user.role;
    const isOwner = blockedDate.userId === session.user.id;
    const isAdmin = userRole && ["ADMIN", "COORDINATOR"].includes(userRole);

    if (!isOwner && !isAdmin) {
      return Response.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    await prisma.blockedDate.delete({ where: { id } });

    return Response.json({ message: "Data bloqueada removida com sucesso" });
  } catch (error) {
    console.error("Error deleting blocked date:", error);
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
