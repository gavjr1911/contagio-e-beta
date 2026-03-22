"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Plus,
  AlertTriangle,
  Loader2,
  RefreshCw,
  UserMinus,
  Users,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScheduleMemberDialog } from "@/components/events/schedule-member-dialog";
import {
  useEventSchedules,
  useCreateSchedule,
  useDeleteSchedule,
  type EventScheduleGroup,
  type EventScheduleItem,
} from "@/hooks/use-schedules";
import { ScheduleStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Types for event data
interface Event {
  id: string;
  name: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

// Fetch event hook
function useEvent(eventId: string) {
  const [event, setEvent] = React.useState<Event | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!eventId) return;

    setIsLoading(true);
    fetch(`/api/events/${eventId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar evento");
        return res.json();
      })
      .then((data) => {
        setEvent(data.data);
        setError(null);
      })
      .catch((err) => {
        setError(err);
        setEvent(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [eventId]);

  return { data: event, isLoading, error };
}

function getTypeColor(type: string): string {
  switch (type) {
    case "CULTO":
      return "bg-primary/10 text-primary border-primary/20";
    case "ENSAIO":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "REUNIAO":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "EVENTO_ESPECIAL":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "CONFERENCIA":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    CULTO: "Culto",
    REUNIAO: "Reuniao",
    ENSAIO: "Ensaio",
    EVENTO_ESPECIAL: "Evento Especial",
    CONFERENCIA: "Conferencia",
  };
  return labels[type] || type;
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

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface MemberCardProps {
  schedule: EventScheduleItem;
  ministryId: string;
  eventId: string;
  onRemove: (scheduleId: string) => void;
  isRemoving: boolean;
}

function MemberCard({ schedule, ministryId, eventId, onRemove, isRemoving }: MemberCardProps) {
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
        {schedule.position && (
          <p className="text-xs text-muted-foreground">{schedule.position}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn("text-xs", getStatusColor(schedule.status))}>
          {getStatusLabel(schedule.status)}
        </Badge>

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
      </div>
    </div>
  );
}

export default function EventoEscalasPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { toast } = useToast();

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const {
    data: schedules,
    isLoading: schedulesLoading,
    refetch: refetchSchedules,
  } = useEventSchedules(eventId);

  const createSchedule = useCreateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedMinistryId, setSelectedMinistryId] = React.useState<string>();
  const [removingScheduleId, setRemovingScheduleId] = React.useState<string | null>(null);

  const handleAddMember = (ministryId: string) => {
    setSelectedMinistryId(ministryId);
    setDialogOpen(true);
  };

  const handleScheduleMember = async (
    userId: string,
    ministryId: string,
    position: string | null
  ) => {
    try {
      await createSchedule.mutateAsync({
        eventId,
        userId,
        ministryId,
        position: position || undefined,
      });
      setDialogOpen(false);
      toast({
        title: "Membro escalado",
        description: "O membro foi adicionado a escala com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao escalar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (scheduleId: string) => {
    if (!confirm("Tem certeza que deseja remover este membro da escala?")) {
      return;
    }

    setRemovingScheduleId(scheduleId);
    try {
      await deleteSchedule.mutateAsync({ eventId, scheduleId });
      toast({
        title: "Membro removido",
        description: "O membro foi removido da escala com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao remover",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setRemovingScheduleId(null);
    }
  };

  // Compute stats
  const stats = React.useMemo(() => {
    if (!schedules) return { total: 0, confirmed: 0, pending: 0, declined: 0 };

    let total = 0;
    let confirmed = 0;
    let pending = 0;
    let declined = 0;

    schedules.forEach((group) => {
      group.schedules.forEach((schedule) => {
        total++;
        if (schedule.status === ScheduleStatus.CONFIRMED) confirmed++;
        if (schedule.status === ScheduleStatus.PENDING) pending++;
        if (schedule.status === ScheduleStatus.DECLINED) declined++;
      });
    });

    return { total, confirmed, pending, declined };
  }, [schedules]);

  // Get existing user IDs for conflict checking
  const existingUserIds = React.useMemo(() => {
    if (!schedules) return [];
    const ids: string[] = [];
    schedules.forEach((group) => {
      group.schedules.forEach((schedule) => {
        ids.push(schedule.user.id);
      });
    });
    return ids;
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
                {getTypeLabel(event.type)}
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
                  {formatTime(event.startTime)}
                  {event.endTime && ` - ${formatTime(event.endTime)}`}
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Confirmados</p>
              <p className="text-2xl font-bold text-emerald-500">{stats.confirmed}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <UserMinus className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Recusados</p>
              <p className="text-2xl font-bold text-red-500">{stats.declined}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Ministry boards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {schedules?.map((group) => (
          <Card key={group.ministry.id} className="overflow-hidden">
            <CardHeader className="pb-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  {group.ministry.name}
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {group.schedules.length} membro
                  {group.schedules.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {group.schedules.map((schedule) => (
                <MemberCard
                  key={schedule.id}
                  schedule={schedule}
                  ministryId={group.ministry.id}
                  eventId={eventId}
                  onRemove={handleRemoveMember}
                  isRemoving={removingScheduleId === schedule.id}
                />
              ))}

              {group.schedules.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum membro escalado
                </p>
              )}

              <Button
                variant="outline"
                className="w-full mt-2 border-dashed"
                onClick={() => handleAddMember(group.ministry.id)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Escalar Membro
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!schedules || schedules.length === 0) && (
        <Card className="p-8">
          <div className="text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-foreground font-medium text-lg mb-2">
              Nenhuma escala criada
            </p>
            <p className="text-muted-foreground mb-4">
              Comece escalando membros para este evento
            </p>
            <Button
              className="bg-primary hover:bg-primary-hover"
              onClick={() => {
                setSelectedMinistryId(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Escalar Primeiro Membro
            </Button>
          </div>
        </Card>
      )}

      {/* Schedule Member Dialog */}
      <ScheduleMemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSchedule={handleScheduleMember}
        eventId={eventId}
        selectedMinistryId={selectedMinistryId}
        isLoading={createSchedule.isPending}
        existingUserIds={existingUserIds}
      />
    </div>
  );
}
