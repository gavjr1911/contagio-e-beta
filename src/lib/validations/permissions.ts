import { z } from "zod";
import { PERMISSION_FEATURES } from "@/lib/permissions/types";

// Uma feature aceita AS DUAS formas (compat Fase 0a):
//  - legada: string "none" | "view" | "edit"
//  - nova:   objeto { view, create, edit, delete } (booleans)
const permissionLevelSchema = z.enum(["none", "view", "edit"]);
const permissionActionsSchema = z.object({
  view: z.boolean(),
  create: z.boolean(),
  edit: z.boolean(),
  delete: z.boolean(),
});
const permissionValueSchema = z.union([
  permissionLevelSchema,
  permissionActionsSchema,
]);

// Schema para um mapa de permissões (uma coluna da matriz)
const permissionMapSchema = z.object(
  Object.fromEntries(
    PERMISSION_FEATURES.map((feature) => [feature, permissionValueSchema])
  ) as Record<(typeof PERMISSION_FEATURES)[number], typeof permissionValueSchema>
);

// Schema completo da matriz de permissões do ministério
export const ministryPermissionsSchema = z.object({
  leader: permissionMapSchema,
  member: permissionMapSchema,
});

export type MinistryPermissionsInput = z.infer<typeof ministryPermissionsSchema>;
