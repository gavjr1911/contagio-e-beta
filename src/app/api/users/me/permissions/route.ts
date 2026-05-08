import { NextResponse } from "next/server";
import { withAuth, type AuthSession } from "@/lib/api-utils";
import { resolveUserPermissions } from "@/lib/permissions/resolver";
import { FULL_PERMISSIONS } from "@/lib/permissions/defaults";

// GET /api/users/me/permissions - Retorna permissões resolvidas do usuário logado
export function GET() {
  return withAuth(async (session: AuthSession) => {
    if (session.user.role === "ADMIN") {
      return NextResponse.json({
        data: { permissions: FULL_PERMISSIONS, role: "ADMIN" },
      });
    }

    const permissions = await resolveUserPermissions(
      session.user.id,
      session.user.role
    );

    return NextResponse.json({
      data: { permissions, role: session.user.role },
    });
  });
}
