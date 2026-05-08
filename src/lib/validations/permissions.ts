import { z } from "zod";
import { PERMISSION_FEATURES } from "@/lib/permissions/types";

const permissionLevelSchema = z.enum(["none", "view", "edit"]);

// Schema para um mapa de permissões (uma coluna da matriz)
const permissionMapSchema = z.object(
  Object.fromEntries(
    PERMISSION_FEATURES.map((feature) => [feature, permissionLevelSchema])
  ) as Record<(typeof PERMISSION_FEATURES)[number], typeof permissionLevelSchema>
);

// Schema completo da matriz de permissões do ministério
export const ministryPermissionsSchema = z.object({
  leader: permissionMapSchema,
  member: permissionMapSchema,
});

export type MinistryPermissionsInput = z.infer<typeof ministryPermissionsSchema>;
