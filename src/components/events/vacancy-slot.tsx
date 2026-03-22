"use client";

import * as React from "react";
import {
  Loader2,
  Plus,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScheduleStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface ScheduleInfo {
  id: string;
  user: User;
  status: ScheduleStatus;
}

interface VacancySlotProps {
  positionName: string;
  schedule: ScheduleInfo | null;
  onAssign: () => void;
  onRemove: (scheduleId: string) => void;
  isRemoving: boolean;
  canEdit: boolean;
}

function getStatusColor(status: ScheduleStatus): string {
  switch (status) {
    case ScheduleStatus.CONFIRMED:
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case ScheduleStatus.PENDING:
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case ScheduleStatus.DECLINED:
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getStatusLabel(status: ScheduleStatus): string {
  const labels: Record<ScheduleStatus, string> = {
    [ScheduleStatus.PENDING]: "Pendente",
    [ScheduleStatus.CONFIRMED]: "Confirmado",
    [ScheduleStatus.DECLINED]: "Recusado",
  };
  return labels[status] || status;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function VacancySlot({
  positionName,
  schedule,
  onAssign,
  onRemove,
  isRemoving,
  canEdit,
}: VacancySlotProps) {
  if (schedule) {
    // Slot preenchido - mostrar o membro escalado
    return (
      <div className="group relative flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50 transition-all hover:border-primary/30 hover:shadow-sm">
        <Avatar className="h-10 w-10">
          {schedule.user.image && (
            <AvatarImage src={schedule.user.image} alt={schedule.user.name || ""} />
          )}
          <AvatarFallback className="bg-secondary text-white text-sm">
            {getInitials(schedule.user.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {schedule.user.name || schedule.user.email}
          </p>
          <p className="text-xs text-muted-foreground">{positionName}</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-xs", getStatusColor(schedule.status))}>
            {getStatusLabel(schedule.status)}
          </Badge>

          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(schedule.id)}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserMinus className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Slot vazio - mostrar botao para adicionar
  return (
    <button
      onClick={onAssign}
      disabled={!canEdit}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-border/60 transition-all",
        canEdit
          ? "hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
          : "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
        <Plus className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="font-medium text-sm text-muted-foreground">{positionName}</p>
        <p className="text-xs text-muted-foreground/70">Clique para escalar</p>
      </div>
    </button>
  );
}
