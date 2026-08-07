"use client";

import {
  PERMISSION_FEATURES,
  PERMISSION_FEATURE_LABELS,
  PERMISSION_ACTIONS,
  PERMISSION_ACTION_LABELS,
  type MinistryPermissions,
  type PermissionFeature,
  type PermissionAction,
  type PermissionActions,
} from "@/lib/permissions/types";
import { DEFAULT_MINISTRY_PERMISSIONS } from "@/lib/permissions/defaults";
import { cn } from "@/lib/utils";
import { Eye, Plus, Pencil, Trash2 } from "lucide-react";

interface PermissionMatrixEditorProps {
  value: MinistryPermissions;
  onChange: (value: MinistryPermissions) => void;
  disabled?: boolean;
}

const actionIcons: Record<PermissionAction, typeof Eye> = {
  view: Eye,
  create: Plus,
  edit: Pencil,
  delete: Trash2,
};

/** Aplica as regras: escrita implica ver; desligar ver zera tudo. */
function applyAction(
  current: PermissionActions,
  action: PermissionAction,
  next: boolean
): PermissionActions {
  const result = { ...current, [action]: next };
  if (action === "view" && !next) {
    return { view: false, create: false, edit: false, delete: false };
  }
  if (next && (action === "create" || action === "edit" || action === "delete")) {
    result.view = true;
  }
  return result;
}

function ActionToggles({
  value,
  onToggle,
  disabled,
}: {
  value: PermissionActions;
  onToggle: (action: PermissionAction, next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {PERMISSION_ACTIONS.map((action) => {
        const Icon = actionIcons[action];
        const active = value[action];
        return (
          <button
            key={action}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onToggle(action, !active)}
            title={PERMISSION_ACTION_LABELS[action]}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50",
              active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-transparent text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{PERMISSION_ACTION_LABELS[action]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PermissionMatrixEditor({
  value,
  onChange,
  disabled,
}: PermissionMatrixEditorProps) {
  const handleToggle = (
    role: "leader" | "member",
    feature: PermissionFeature,
    action: PermissionAction,
    next: boolean
  ) => {
    onChange({
      ...value,
      [role]: {
        ...value[role],
        [feature]: applyAction(value[role][feature], action, next),
      },
    });
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_1.6fr_1.6fr] gap-2 px-4 py-3 bg-muted/50 border-b border-border">
        <div className="text-sm font-medium text-muted-foreground">
          Funcionalidade
        </div>
        <div className="text-sm font-medium text-muted-foreground text-center">
          Líder
        </div>
        <div className="text-sm font-medium text-muted-foreground text-center">
          Membro
        </div>
      </div>

      {/* Rows */}
      {PERMISSION_FEATURES.map((feature, index) => (
        <div
          key={feature}
          className={cn(
            "grid grid-cols-[1fr_1.6fr_1.6fr] gap-2 px-4 py-2.5 items-center",
            index < PERMISSION_FEATURES.length - 1 && "border-b border-border/50"
          )}
        >
          <div className="text-sm font-medium">
            {PERMISSION_FEATURE_LABELS[feature]}
          </div>
          <ActionToggles
            value={value.leader[feature]}
            onToggle={(action, next) => handleToggle("leader", feature, action, next)}
            disabled={disabled}
          />
          <ActionToggles
            value={value.member[feature]}
            onToggle={(action, next) => handleToggle("member", feature, action, next)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}

export { DEFAULT_MINISTRY_PERMISSIONS };
