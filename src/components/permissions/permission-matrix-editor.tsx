"use client";

import {
  PERMISSION_FEATURES,
  PERMISSION_FEATURE_LABELS,
  PERMISSION_LEVEL_LABELS,
  type MinistryPermissions,
  type PermissionFeature,
  type PermissionLevel,
} from "@/lib/permissions/types";
import { DEFAULT_MINISTRY_PERMISSIONS } from "@/lib/permissions/defaults";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Shield, ShieldCheck, ShieldX } from "lucide-react";

interface PermissionMatrixEditorProps {
  value: MinistryPermissions;
  onChange: (value: MinistryPermissions) => void;
  disabled?: boolean;
}

const levelIcons: Record<PermissionLevel, typeof Shield> = {
  none: ShieldX,
  view: Shield,
  edit: ShieldCheck,
};

const levelColors: Record<PermissionLevel, string> = {
  none: "text-muted-foreground",
  view: "text-blue-500",
  edit: "text-emerald-500",
};

function PermissionSelect({
  value,
  onChange,
  disabled,
}: {
  value: PermissionLevel;
  onChange: (value: PermissionLevel) => void;
  disabled?: boolean;
}) {
  const Icon = levelIcons[value];

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[140px] h-9">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5", levelColors[value])} />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {(["none", "view", "edit"] as PermissionLevel[]).map((level) => {
          const LevelIcon = levelIcons[level];
          return (
            <SelectItem key={level} value={level}>
              <div className="flex items-center gap-1.5">
                <LevelIcon className={cn("h-3.5 w-3.5", levelColors[level])} />
                <span>{PERMISSION_LEVEL_LABELS[level]}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export function PermissionMatrixEditor({
  value,
  onChange,
  disabled,
}: PermissionMatrixEditorProps) {
  const handleChange = (
    role: "leader" | "member",
    feature: PermissionFeature,
    level: PermissionLevel
  ) => {
    onChange({
      ...value,
      [role]: {
        ...value[role],
        [feature]: level,
      },
    });
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_140px_140px] gap-2 px-4 py-3 bg-muted/50 border-b border-border">
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
            "grid grid-cols-[1fr_140px_140px] gap-2 px-4 py-2.5 items-center",
            index < PERMISSION_FEATURES.length - 1 && "border-b border-border/50"
          )}
        >
          <div className="text-sm font-medium">
            {PERMISSION_FEATURE_LABELS[feature]}
          </div>
          <div className="flex justify-center">
            <PermissionSelect
              value={value.leader[feature]}
              onChange={(level) => handleChange("leader", feature, level)}
              disabled={disabled}
            />
          </div>
          <div className="flex justify-center">
            <PermissionSelect
              value={value.member[feature]}
              onChange={(level) => handleChange("member", feature, level)}
              disabled={disabled}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export { DEFAULT_MINISTRY_PERMISSIONS };
