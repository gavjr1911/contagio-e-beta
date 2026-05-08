import type { MinistryPermissions, PermissionMap } from "./types";

export const DEFAULT_LEADER_PERMISSIONS: PermissionMap = {
  events: "edit",
  schedules: "edit",
  songs: "view",
  orderOfService: "edit",
  media: "view",
  reports: "view",
  ministries: "view",
  checklists: "none",
  templates: "view",
};

export const DEFAULT_MEMBER_PERMISSIONS: PermissionMap = {
  events: "view",
  schedules: "view",
  songs: "none",
  orderOfService: "none",
  media: "none",
  reports: "none",
  ministries: "none",
  checklists: "none",
  templates: "none",
};

export const DEFAULT_MINISTRY_PERMISSIONS: MinistryPermissions = {
  leader: DEFAULT_LEADER_PERMISSIONS,
  member: DEFAULT_MEMBER_PERMISSIONS,
};

// Permissões totais (usadas para ADMIN)
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

// Permissões zeradas (usuário sem ministério)
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
