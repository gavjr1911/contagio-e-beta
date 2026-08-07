/**
 * Normalização e achatamento de permissões — módulo PURO (sem prisma/IO),
 * usado tanto no servidor (resolver) quanto no cliente (editor da matriz).
 *
 * Aceita as DUAS formas de Ministry.permissions:
 *  - legada: por feature, string "none" | "view" | "edit"
 *  - nova:   por feature, objeto { view, create, edit, delete } (booleans)
 *
 * A normalização legada→nova é PERMISSIVA (edit ⇒ criar+editar+excluir), mas
 * na Fase 0a isso só afeta a exibição na matriz; o achatamento de volta para
 * nível preserva o comportamento atual (edit⇒edit, view⇒view).
 */
import {
  PERMISSION_FEATURES,
  PERMISSION_ACTIONS,
  type PermissionActions,
  type PermissionActionMap,
  type MinistryPermissions,
  type PermissionLevel,
  type PermissionMap,
  type PermissionFeature,
} from "./types";

const NO_ACTIONS: PermissionActions = {
  view: false,
  create: false,
  edit: false,
  delete: false,
};

const ALL_ACTIONS: PermissionActions = {
  view: true,
  create: true,
  edit: true,
  delete: true,
};

/** Converte um nível legado para o conjunto de ações equivalente (permissivo). */
export function levelToActions(level: unknown): PermissionActions {
  switch (level) {
    case "edit":
      return { ...ALL_ACTIONS };
    case "view":
      return { ...NO_ACTIONS, view: true };
    default:
      return { ...NO_ACTIONS };
  }
}

/** Achata um conjunto de ações para o nível legado (edit ≥ view ≥ none). */
export function actionsToLevel(actions: PermissionActions | undefined): PermissionLevel {
  if (!actions) return "none";
  if (actions.create || actions.edit || actions.delete) return "edit";
  if (actions.view) return "view";
  return "none";
}

/** Normaliza um valor arbitrário (legado string OU objeto) para PermissionActions. */
export function normalizeActions(raw: unknown): PermissionActions {
  if (typeof raw === "string") return levelToActions(raw);
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const result = { ...NO_ACTIONS };
    for (const action of PERMISSION_ACTIONS) {
      result[action] = o[action] === true;
    }
    // "criar/editar/excluir" implica "ver" (não faz sentido escrever sem ver)
    if (result.create || result.edit || result.delete) result.view = true;
    return result;
  }
  return { ...NO_ACTIONS };
}

/** Normaliza um mapa de permissões (uma role) para a forma por ação. */
export function normalizeActionMap(raw: unknown): PermissionActionMap {
  const map = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const result = {} as PermissionActionMap;
  for (const feature of PERMISSION_FEATURES) {
    result[feature] = normalizeActions(map[feature]);
  }
  return result;
}

/**
 * Normaliza o JSON de Ministry.permissions (qualquer forma) para MinistryPermissions.
 * Retorna defaults vazios se inválido.
 */
export function normalizeMinistryPermissions(raw: unknown): MinistryPermissions {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    leader: normalizeActionMap(obj.leader),
    member: normalizeActionMap(obj.member),
  };
}

/** Achata um PermissionActionMap para o PermissionMap (nível) legado. */
export function flattenToLevelMap(actionMap: PermissionActionMap): PermissionMap {
  const result = {} as PermissionMap;
  for (const feature of PERMISSION_FEATURES) {
    result[feature] = actionsToLevel(actionMap[feature]);
  }
  return result;
}

/** OR de duas PermissionActions (merge multi-ministério). */
export function mergeActions(a: PermissionActions, b: PermissionActions): PermissionActions {
  return {
    view: a.view || b.view,
    create: a.create || b.create,
    edit: a.edit || b.edit,
    delete: a.delete || b.delete,
  };
}

/** Verifica se um action map concede uma ação numa feature. */
export function hasAction(
  actionMap: PermissionActionMap,
  feature: PermissionFeature,
  action: (typeof PERMISSION_ACTIONS)[number]
): boolean {
  return actionMap[feature]?.[action] === true;
}
