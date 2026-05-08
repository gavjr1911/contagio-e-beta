"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { PermissionFeature, PermissionLevel, PermissionMap } from "@/lib/permissions/types";
import { FULL_PERMISSIONS, EMPTY_PERMISSIONS } from "@/lib/permissions/defaults";
import { meetsLevel, hasAnyPermission } from "@/lib/permissions/check";

interface PermissionsResponse {
  data: {
    permissions: PermissionMap;
    role: string;
  };
}

async function fetchPermissions(): Promise<PermissionMap> {
  const res = await fetch("/api/users/me/permissions");
  if (!res.ok) throw new Error("Erro ao carregar permissões");
  const json: PermissionsResponse = await res.json();
  return json.data.permissions;
}

/**
 * Hook principal de permissões.
 * Retorna o mapa de permissões resolvido do usuário logado.
 */
export function usePermissions() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: fetchPermissions,
    enabled: status === "authenticated",
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });

  // Admin sempre tem tudo
  const resolved = isAdmin
    ? FULL_PERMISSIONS
    : permissions ?? EMPTY_PERMISSIONS;

  return {
    permissions: resolved,
    isAdmin,
    isLoading: status === "loading" || (!isAdmin && isLoading),
    hasMinistry: isAdmin || hasAnyPermission(resolved),
  };
}

/**
 * Hook para verificar uma permissão específica.
 */
export function useHasPermission(
  feature: PermissionFeature,
  level: PermissionLevel
): boolean {
  const { permissions, isAdmin } = usePermissions();
  if (isAdmin) return true;
  return meetsLevel(permissions[feature], level);
}

/**
 * Hook para verificar se pode ver um item no sidebar.
 */
export function useCanView(feature: PermissionFeature): boolean {
  return useHasPermission(feature, "view");
}

/**
 * Hook para verificar se pode editar/criar.
 */
export function useCanEdit(feature: PermissionFeature): boolean {
  return useHasPermission(feature, "edit");
}
