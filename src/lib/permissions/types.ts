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

// Níveis de acesso (ordem crescente de permissão)
export type PermissionLevel = "none" | "view" | "edit";

// Mapa de permissões: feature → level
export type PermissionMap = Record<PermissionFeature, PermissionLevel>;

// Matriz completa de permissões de um ministério
export interface MinistryPermissions {
  leader: PermissionMap;
  member: PermissionMap;
}

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

// Valor numérico para comparação (edit > view > none)
export const PERMISSION_LEVEL_VALUE: Record<PermissionLevel, number> = {
  none: 0,
  view: 1,
  edit: 2,
};
