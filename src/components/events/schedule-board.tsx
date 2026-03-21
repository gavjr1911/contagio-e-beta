"use client";

import * as React from "react";
import { AlertTriangle, Plus, UserMinus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  EventSchedule,
  ScheduledMember,
  ConfirmationStatus,
  getConfirmationStatusLabel,
} from "@/hooks/use-events";

interface ScheduleBoardProps {
  schedules: EventSchedule[];
  onAddMember?: (ministryId: string) => void;
  onRemoveMember?: (scheduleId: string, memberId: string) => void;
  onUpdateStatus?: (
    scheduleId: string,
    memberId: string,
    status: ConfirmationStatus
  ) => void;
  className?: string;
}

function getStatusColor(status: ConfirmationStatus): string {
  switch (status) {
    case "confirmado":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "pendente":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "recusado":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "substituido":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface MemberCardProps {
  member: ScheduledMember;
  scheduleId: string;
  onRemove?: (scheduleId: string, memberId: string) => void;
  onUpdateStatus?: (
    scheduleId: string,
    memberId: string,
    status: ConfirmationStatus
  ) => void;
}

function MemberCard({
  member,
  scheduleId,
  onRemove,
  onUpdateStatus,
}: MemberCardProps) {
  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50 transition-all hover:border-beta-terracotta/30 hover:shadow-sm",
        member.hasConflict && "border-amber-500/50 bg-amber-500/5"
      )}
    >
      <Avatar className="h-10 w-10">
        {member.memberAvatar && (
          <AvatarImage src={member.memberAvatar} alt={member.memberName} />
        )}
        <AvatarFallback className="bg-beta-navy text-white text-sm">
          {getInitials(member.memberName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{member.memberName}</p>
          {member.hasConflict && (
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">{member.position}</p>
        {member.hasConflict && member.conflictWith && (
          <p className="text-xs text-amber-500 mt-0.5">
            Conflito: {member.conflictWith}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn("text-xs cursor-pointer", getStatusColor(member.status))}
          onClick={() => {
            if (onUpdateStatus && member.status !== "confirmado") {
              onUpdateStatus(scheduleId, member.memberId, "confirmado");
            }
          }}
        >
          {getConfirmationStatusLabel(member.status)}
        </Badge>

        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(scheduleId, member.memberId)}
          >
            <UserMinus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ScheduleBoard({
  schedules,
  onAddMember,
  onRemoveMember,
  onUpdateStatus,
  className,
}: ScheduleBoardProps) {
  // Count total members and confirmations
  const stats = React.useMemo(() => {
    let total = 0;
    let confirmed = 0;
    let pending = 0;
    let conflicts = 0;

    schedules.forEach((schedule) => {
      schedule.members.forEach((member) => {
        total++;
        if (member.status === "confirmado") confirmed++;
        if (member.status === "pendente") pending++;
        if (member.hasConflict) conflicts++;
      });
    });

    return { total, confirmed, pending, conflicts };
  }, [schedules]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Escalados</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Confirmados</p>
          <p className="text-2xl font-bold text-emerald-500">{stats.confirmed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Conflitos</p>
          <p className="text-2xl font-bold text-red-500">{stats.conflicts}</p>
        </Card>
      </div>

      {/* Ministry boards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {schedules.map((schedule) => (
          <Card key={schedule.id} className="overflow-hidden">
            <CardHeader className="pb-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  {schedule.ministryName}
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {schedule.members.length} membro
                  {schedule.members.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {schedule.members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  scheduleId={schedule.id}
                  onRemove={onRemoveMember}
                  onUpdateStatus={onUpdateStatus}
                />
              ))}

              {schedule.members.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum membro escalado
                </p>
              )}

              {onAddMember && (
                <Button
                  variant="outline"
                  className="w-full mt-2 border-dashed"
                  onClick={() => onAddMember(schedule.ministryId)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Escalar Membro
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {schedules.length === 0 && (
        <Card className="p-8">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum ministerio configurado para este evento
            </p>
            <Button>Configurar Ministerios</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
