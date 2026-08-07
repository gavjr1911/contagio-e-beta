import type { MinistryPermissions, PermissionActionMap, PermissionMap } from "./types";
import { levelToActions } from "./normalize";

// Defaults da MATRIZ de um ministério (forma nova, por ação). Derivados dos
// níveis padrão anteriores (edit ⇒ criar+editar+excluir; view ⇒ ver).
export const DEFAULT_LEADER_PERMISSIONS: PermissionActionMap = {
  events: levelToActions("edit"),
  schedules: levelToActions("edit"),
  songs: levelToActions("view"),
  orderOfService: levelToActions("edit"),
  media: levelToActions("view"),
  reports: levelToActions("view"),
  ministries: levelToActions("view"),
  checklists: levelToActions("none"),
  templates: levelToActions("view"),
};

export const DEFAULT_MEMBER_PERMISSIONS: PermissionActionMap = {
  events: levelToActions("view"),
  schedules: levelToActions("view"),
  songs: levelToActions("none"),
  orderOfService: levelToActions("none"),
  media: levelToActions("none"),
  reports: levelToActions("none"),
  ministries: levelToActions("none"),
  checklists: levelToActions("none"),
  templates: levelToActions("none"),
};

export const DEFAULT_MINISTRY_PERMISSIONS: MinistryPermissions = {
  leader: DEFAULT_LEADER_PERMISSIONS,
  member: DEFAULT_MEMBER_PERMISSIONS,
};

// Permissões EFETIVAS (nível) — usadas pelo resolver.
// Totais (ADMIN):
export const FULL_PERMISSIONS: PermissionMap = {
  events: "edit",
  schedules: "edit",
  songs: "edit",
  orderOfService: "edit",
  media: "edit",
  reports: "edit",
  ministries: "edit",
  checklists: "edit",
  templates: "edit",
};

// Zeradas (usuário sem ministério):
export const EMPTY_PERMISSIONS: PermissionMap = {
  events: "none",
  schedules: "none",
  songs: "none",
  orderOfService: "none",
  media: "none",
  reports: "none",
  ministries: "none",
  checklists: "none",
  templates: "none",
};
