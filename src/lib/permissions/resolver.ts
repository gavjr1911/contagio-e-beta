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
import { normalizeMinistryPermissions, flattenToLevelMap } from "./normalize";

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
 * Resolve a matriz de um ministério para a forma por ação, aceitando as duas
 * formas (legada por nível / nova por ação). `null` cai nos defaults.
 */
function ministryToActions(raw: unknown): MinistryPermissions {
  if (raw == null) return DEFAULT_MINISTRY_PERMISSIONS;
  return normalizeMinistryPermissions(raw);
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
    const perms = ministryToActions(membership.ministry.permissions);
    const isLeaderOfThis =
      membership.ministry.leaderId === userId ||
      leaderMinistryIds.has(membership.ministry.id);

    // Achata a matriz por ação para o nível efetivo (Fase 0a).
    const roleLevels = flattenToLevelMap(isLeaderOfThis ? perms.leader : perms.member);

    for (const feature of PERMISSION_FEATURES) {
      result[feature] = maxLevel(result[feature], roleLevels[feature]);
    }
  }

  // Processar ministérios liderados onde não é membro (edge case)
  for (const ministry of ledMinistries) {
    const alreadyProcessed = memberships.some(
      (m) => m.ministry.id === ministry.id
    );
    if (alreadyProcessed) continue;

    const perms = ministryToActions(ministry.permissions);
    const roleLevels = flattenToLevelMap(perms.leader);
    for (const feature of PERMISSION_FEATURES) {
      result[feature] = maxLevel(result[feature], roleLevels[feature]);
    }
  }

  setCache(userId, result);
  return result;
}
