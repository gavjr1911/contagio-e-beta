"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Plus,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScheduleBoard } from "@/components/events/schedule-board";
import { ScheduleMemberDialog } from "@/components/events/schedule-member-dialog";
import {
  useEvent,
  useEventSchedules,
  useScheduleMember,
  useUpdateMemberStatus,
  useRemoveMemberFromSchedule,
  EventType,
  getEventTypeLabel,
  getEventStatusLabel,
  ConfirmationStatus,
} from "@/hooks/use-events";
import { cn } from "@/lib/utils";

function getTypeColor(type: EventType): string {
  switch (type) {
    case "culto":
      return "bg-primary/10 text-primary border-primary/20";
    case "ensaio":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "reuniao":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "evento_especial":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "conferencia":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(time: string): string {
  return time.substring(0, 5);
}

export default function EventoEscalasPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const {
    data: schedules,
    isLoading: schedulesLoading,
    refetch: refetchSchedules,
  } = useEventSchedules(eventId);

  const scheduleMember = useScheduleMember();
  const updateMemberStatus = useUpdateMemberStatus();
  const removeMember = useRemoveMemberFromSchedule();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedMinistryId, setSelectedMinistryId] = React.useState<string>();

  const handleAddMember = (ministryId: string) => {
    setSelectedMinistryId(ministryId);
    setDialogOpen(true);
  };

  const handleScheduleMember = async (
    memberId: string,
    ministryId: string,
    position: string
  ) => {
    await scheduleMember.mutateAsync({
      eventId,
      ministryId,
      memberId,
      position,
    });
  };

  const handleRemoveMember = async (scheduleId: string, memberId: string) => {
    if (confirm("Tem certeza que deseja remover este membro da escala?")) {
      await removeMember.mutateAsync({ scheduleId, memberId });
    }
  };

  const handleUpdateStatus = async (
    scheduleId: string,
    memberId: string,
    status: ConfirmationStatus
  ) => {
    await updateMemberStatus.mutateAsync({ scheduleId, memberId, status });
  };

  // Count conflicts
  const conflictCount = React.useMemo(() => {
    if (!schedules) return 0;
    return schedules.reduce((count, schedule) => {
      return (
        count + schedule.members.filter((m) => m.hasConflict).length
      );
    }, 0);
  }, [schedules]);

  const isLoading = eventLoading || schedulesLoading;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex-1 p-6">
        <Card className="p-8 text-center">
          <p className="text-destructive mb-4">Evento nao encontrado</p>
          <Link href="/eventos">
            <Button variant="outline">Voltar para eventos</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/eventos/${eventId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold font-display">
                Escalas - {event.name}
              </h1>
              <Badge
                variant="outline"
                className={cn("text-xs", getTypeColor(event.type))}
              >
                {getEventTypeLabel(event.type)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span className="capitalize">{formatDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetchSchedules()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              className="bg-primary hover:bg-primary-hover"
              onClick={() => {
                setSelectedMinistryId(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Escalar Membro
            </Button>
          </div>
        </div>
      </div>

      {/* Conflict Warning */}
      {conflictCount > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-500">
                {conflictCount} conflito{conflictCount !== 1 ? "s" : ""}{" "}
                detectado{conflictCount !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                Alguns membros estao escalados em outros eventos no mesmo
                horario
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Board */}
      <ScheduleBoard
        schedules={schedules || []}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Schedule Member Dialog */}
      <ScheduleMemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSchedule={handleScheduleMember}
        ministries={[]}
        members={[]}
        selectedMinistryId={selectedMinistryId}
        isLoading={scheduleMember.isPending}
      />
    </div>
  );
}
