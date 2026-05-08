import type { PermissionFeature, PermissionLevel, PermissionMap } from "./types";
import { PERMISSION_LEVEL_VALUE } from "./types";

/**
 * Verifica se o nível real atende ao nível requerido.
 * edit >= view >= none
 */
export function meetsLevel(
  actual: PermissionLevel | undefined,
  required: PermissionLevel
): boolean {
  if (!actual) return required === "none";
  return PERMISSION_LEVEL_VALUE[actual] >= PERMISSION_LEVEL_VALUE[required];
}

/**
 * Verifica se o mapa de permissões atende ao requisito para uma feature.
 */
export function hasPermission(
  permissions: PermissionMap,
  feature: PermissionFeature,
  requiredLevel: PermissionLevel
): boolean {
  return meetsLevel(permissions[feature], requiredLevel);
}

/**
 * Retorna o maior nível entre dois.
 */
export function maxLevel(
  a: PermissionLevel,
  b: PermissionLevel
): PermissionLevel {
  return PERMISSION_LEVEL_VALUE[a] >= PERMISSION_LEVEL_VALUE[b] ? a : b;
}

/**
 * Verifica se o usuário tem pelo menos uma permissão acima de 'none'.
 * Usado para detectar usuário sem nenhum acesso (sem ministério).
 */
export function hasAnyPermission(permissions: PermissionMap): boolean {
  return Object.values(permissions).some(
    (level) => PERMISSION_LEVEL_VALUE[level] > 0
  );
}
