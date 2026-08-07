// Features do sistema que podem ser controladas por permissão
export const PERMISSION_FEATURES = [
  "events",
  "schedules",
  "songs",
  "orderOfService",
  "media",
  "reports",
  "ministries",
  "checklists",
  "templates",
] as const;

export type PermissionFeature = (typeof PERMISSION_FEATURES)[number];

// ── Modelo por AÇÃO (novo) ──────────────────────────────────────────────
// Cada feature tem 4 ações independentes. É a forma armazenada em
// Ministry.permissions e editada na matriz.
export const PERMISSION_ACTIONS = ["view", "create", "edit", "delete"] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type PermissionActions = Record<PermissionAction, boolean>;
export type PermissionActionMap = Record<PermissionFeature, PermissionActions>;

// Matriz completa de permissões de um ministério (forma nova: por ação)
export interface MinistryPermissions {
  leader: PermissionActionMap;
  member: PermissionActionMap;
}

// ── Modelo por NÍVEL (legado / compat) ──────────────────────────────────
// Ainda é a forma das permissões EFETIVAS resolvidas (consumidas pelo
// enforcement atual e pelo cliente). O resolver achata o modelo por ação
// para este nível durante a transição (Fase 0a).
export type PermissionLevel = "none" | "view" | "edit";
export type PermissionMap = Record<PermissionFeature, PermissionLevel>;

// Labels em pt-BR para exibição na UI
export const PERMISSION_FEATURE_LABELS: Record<PermissionFeature, string> = {
  events: "Eventos",
  schedules: "Escalas",
  songs: "Músicas",
  orderOfService: "Ordem do Culto",
  media: "Mídia",
  reports: "Relatórios",
  ministries: "Ministérios",
  checklists: "Checklists",
  templates: "Templates",
};

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: "Sem acesso",
  view: "Visualizar",
  edit: "Editar",
};

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  view: "Ver",
  create: "Criar",
  edit: "Editar",
  delete: "Excluir",
};

// Valor numérico para comparação (edit > view > none)
export const PERMISSION_LEVEL_VALUE: Record<PermissionLevel, number> = {
  none: 0,
  view: 1,
  edit: 2,
};
