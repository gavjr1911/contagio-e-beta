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
  ConfirmationStatus,
  getConfirmationStatusLabel,
} from "@/hooks/use-events";

// Group schedules by ministry for display
interface GroupedSchedule {
  ministryId: string;
  ministryName: string;
  members: {
    id: string;
    userId: string;
    userName: string;
    userImage?: string | null;
    position: string | null;
    status: ConfirmationStatus;
  }[];
}

interface ScheduleBoardProps {
  schedules: EventSchedule[];
  onAddMember?: (ministryId: string) => void;
  onRemoveMember?: (scheduleId: string, userId: string) => void;
  onUpdateStatus?: (
    scheduleId: string,
    userId: string,
    status: ConfirmationStatus
  ) => void;
  className?: string;
}

function getStatusColor(status: ConfirmationStatus): string {
  switch (status) {
    case "CONFIRMED":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "PENDING":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "DECLINED":
      return "bg-red-500/10 text-red-400 border-red-500/20";
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
  member: {
    id: string;
    userId: string;
    userName: string;
    userImage?: string | null;
    position: string | null;
    status: ConfirmationStatus;
  };
  scheduleId: string;
  onRemove?: (scheduleId: string, userId: string) => void;
  onUpdateStatus?: (
    scheduleId: string,
    userId: string,
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
        "group relative flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50 transition-all hover:border-primary/30 hover:shadow-sm"
      )}
    >
      <Avatar className="h-10 w-10">
        {member.userImage && (
          <AvatarImage src={member.userImage} alt={member.userName} />
        )}
        <AvatarFallback className="bg-secondary text-white text-sm">
          {getInitials(member.userName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{member.userName}</p>
        </div>
        {member.position && (
          <p className="text-xs text-muted-foreground">{member.position}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn("text-xs cursor-pointer", getStatusColor(member.status))}
          onClick={() => {
            if (onUpdateStatus && member.status !== "CONFIRMED") {
              onUpdateStatus(scheduleId, member.userId, "CONFIRMED");
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
            onClick={() => onRemove(scheduleId, member.userId)}
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
  // Group schedules by ministry
  const groupedSchedules = React.useMemo(() => {
    const groups = new Map<string, GroupedSchedule>();

    schedules.forEach((schedule) => {
      const ministryId = schedule.ministryId;
      const ministryName = schedule.ministry.name;

      if (!groups.has(ministryId)) {
        groups.set(ministryId, {
          ministryId,
          ministryName,
          members: [],
        });
      }

      const group = groups.get(ministryId)!;
      group.members.push({
        id: schedule.id,
        userId: schedule.userId,
        userName: schedule.user.name || schedule.user.email,
        userImage: schedule.user.image,
        position: schedule.position,
        status: schedule.status as ConfirmationStatus,
      });
    });

    return Array.from(groups.values());
  }, [schedules]);

  // Count total members and confirmations
  const stats = React.useMemo(() => {
    let total = 0;
    let confirmed = 0;
    let pending = 0;

    groupedSchedules.forEach((group) => {
      group.members.forEach((member) => {
        total++;
        if (member.status === "CONFIRMED") confirmed++;
        if (member.status === "PENDING") pending++;
      });
    });

    return { total, confirmed, pending };
  }, [groupedSchedules]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
      </div>

      {/* Ministry boards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groupedSchedules.map((group) => (
          <Card key={group.ministryId} className="overflow-hidden">
            <CardHeader className="pb-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  {group.ministryName}
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {group.members.length} membro
                  {group.members.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {group.members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  scheduleId={member.id}
                  onRemove={onRemoveMember}
                  onUpdateStatus={onUpdateStatus}
                />
              ))}

              {group.members.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum membro escalado
                </p>
              )}

              {onAddMember && (
                <Button
                  variant="outline"
                  className="w-full mt-2 border-dashed"
                  onClick={() => onAddMember(group.ministryId)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Escalar Membro
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {groupedSchedules.length === 0 && (
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
