import { prisma } from "@/lib/prisma";
import type {
  PermissionFeature,
  PermissionLevel,
  PermissionMap,
  MinistryPermissions,
} from "./types";
import { PERMISSION_FEATURES } from "./types";
import { DEFAULT_MINISTRY_PERMISSIONS, FULL_PERMISSIONS, EMPTY_PERMISSIONS } from "./defaults";
import { maxLevel } from "./check";

// Cache em memória com TTL
const CACHE_TTL_MS = 60_000; // 60 segundos
const cache = new Map<string, { permissions: PermissionMap; expiresAt: number }>();

function getCached(userId: string): PermissionMap | null {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(userId);
    return null;
  }
  return entry.permissions;
}

function setCache(userId: string, permissions: PermissionMap): void {
  cache.set(userId, {
    permissions,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function invalidatePermissionCache(userId: string): void {
  cache.delete(userId);
}

export function invalidateAllPermissionCaches(): void {
  cache.clear();
}

/**
 * Faz o parse seguro do JSON de permissions de um ministério.
 * Retorna os defaults se o JSON for inválido ou null.
 */
function parseMinistryPermissions(raw: unknown): MinistryPermissions {
  if (!raw || typeof raw !== "object") return DEFAULT_MINISTRY_PERMISSIONS;

  const obj = raw as Record<string, unknown>;
  if (!obj.leader || !obj.member) return DEFAULT_MINISTRY_PERMISSIONS;

  // Validar que cada feature existe e tem um nível válido
  const validLevels = new Set(["none", "view", "edit"]);

  const parseMap = (
    map: unknown,
    fallback: PermissionMap
  ): PermissionMap => {
    if (!map || typeof map !== "object") return fallback;
    const result = { ...fallback };
    const m = map as Record<string, unknown>;
    for (const feature of PERMISSION_FEATURES) {
      if (m[feature] && validLevels.has(m[feature] as string)) {
        result[feature] = m[feature] as PermissionLevel;
      }
    }
    return result;
  };

  return {
    leader: parseMap(obj.leader, DEFAULT_MINISTRY_PERMISSIONS.leader),
    member: parseMap(obj.member, DEFAULT_MINISTRY_PERMISSIONS.member),
  };
}

/**
 * Resolve as permissões efetivas de um usuário.
 * Combina permissões de todos os ministérios (pega o máximo para cada feature).
 */
export async function resolveUserPermissions(
  userId: string,
  userRole?: string
): Promise<PermissionMap> {
  // ADMIN sempre tem acesso total
  if (userRole === "ADMIN") return { ...FULL_PERMISSIONS };

  // Verificar cache
  const cached = getCached(userId);
  if (cached) return cached;

  // Buscar todos os ministérios onde o usuário é membro ativo
  const memberships = await prisma.ministryMember.findMany({
    where: { userId, active: true },
    include: {
      ministry: {
        select: {
          id: true,
          leaderId: true,
          permissions: true,
        },
      },
    },
  });

  // Buscar ministérios onde o usuário é líder (pode ser líder sem ser membro)
  const ledMinistries = await prisma.ministry.findMany({
    where: { leaderId: userId },
    select: {
      id: true,
      permissions: true,
    },
  });

  // Se não tem nenhum ministério, retornar vazio
  if (memberships.length === 0 && ledMinistries.length === 0) {
    const empty = { ...EMPTY_PERMISSIONS };
    setCache(userId, empty);
    return empty;
  }

  // Inicializar resultado com tudo 'none'
  const result: PermissionMap = { ...EMPTY_PERMISSIONS };

  // IDs dos ministérios onde é líder
  const leaderMinistryIds = new Set(ledMinistries.map((m) => m.id));

  // Processar memberships
  for (const membership of memberships) {
    const perms = parseMinistryPermissions(membership.ministry.permissions);
    const isLeaderOfThis =
      membership.ministry.leaderId === userId ||
      leaderMinistryIds.has(membership.ministry.id);

    const rolePerms = isLeaderOfThis ? perms.leader : perms.member;

    for (const feature of PERMISSION_FEATURES) {
      result[feature] = maxLevel(result[feature], rolePerms[feature]);
    }
  }

  // Processar ministérios liderados onde não é membro (edge case)
  for (const ministry of ledMinistries) {
    const alreadyProcessed = memberships.some(
      (m) => m.ministry.id === ministry.id
    );
    if (alreadyProcessed) continue;

    const perms = parseMinistryPermissions(ministry.permissions);
    for (const feature of PERMISSION_FEATURES) {
      result[feature] = maxLevel(result[feature], perms.leader[feature]);
    }
  }

  setCache(userId, result);
  return result;
}
