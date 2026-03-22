"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  RefreshCw,
  Users,
  CheckCircle2,
  AlertTriangle,
  UserMinus,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VacancySlot } from "@/components/events/vacancy-slot";
import { ScheduleMemberDialog } from "@/components/events/schedule-member-dialog";
import {
  useEventSchedules,
  useCreateSchedule,
  useDeleteSchedule,
  type EventScheduleItem,
} from "@/hooks/use-schedules";
import { useEventVacancies, type EventVacancy } from "@/hooks/use-vacancies";
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
    case "SUNDAY_MORNING":
      return "bg-primary/10 text-primary border-primary/20";
    case "SUNDAY_EVENING":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "SPECIAL":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    SUNDAY_MORNING: "Culto Manha",
    SUNDAY_EVENING: "Culto Noite",
    SPECIAL: "Evento Especial",
  };
  return labels[type] || type;
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

// Agrupar vagas por ministerio
interface VacancyGroup {
  ministry: { id: string; name: string };
  vacancies: EventVacancy[];
}

function groupVacanciesByMinistry(vacancies: EventVacancy[]): VacancyGroup[] {
  const groups: Record<string, VacancyGroup> = {};

  vacancies.forEach((vacancy) => {
    const ministryId = vacancy.ministryId;
    if (!groups[ministryId]) {
      groups[ministryId] = {
        ministry: vacancy.ministry,
        vacancies: [],
      };
    }
    groups[ministryId].vacancies.push(vacancy);
  });

  // Ordenar por nome do ministerio
  return Object.values(groups).sort((a, b) =>
    a.ministry.name.localeCompare(b.ministry.name)
  );
}

// Encontrar o schedule associado a uma vacancy
function findScheduleForVacancy(
  vacancyId: string,
  schedules: EventScheduleItem[]
): EventScheduleItem | null {
  return schedules.find((s) => s.vacancyId === vacancyId) || null;
}

export default function EventoEscalasPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { toast } = useToast();
  const { data: session } = useSession();

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const {
    data: vacancies,
    isLoading: vacanciesLoading,
    refetch: refetchVacancies,
  } = useEventVacancies(eventId);
  const {
    data: scheduleGroups,
    isLoading: schedulesLoading,
    refetch: refetchSchedules,
  } = useEventSchedules(eventId);

  const createSchedule = useCreateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedVacancy, setSelectedVacancy] = React.useState<EventVacancy | null>(null);
  const [removingScheduleId, setRemovingScheduleId] = React.useState<string | null>(null);

  // Verificar permissao
  const isAdmin = session?.user?.role === "ADMIN";
  const isCoordinator = session?.user?.role === "COORDINATOR";
  const isLeader = session?.user?.role === "LEADER";
  const canEdit = isAdmin || isCoordinator || isLeader;

  // Flatten schedules from groups
  const allSchedules = React.useMemo(() => {
    if (!scheduleGroups) return [];
    return scheduleGroups.flatMap((group) => group.schedules);
  }, [scheduleGroups]);

  // Agrupar vagas por ministerio
  const vacancyGroups = React.useMemo(() => {
    if (!vacancies) return [];
    return groupVacanciesByMinistry(vacancies);
  }, [vacancies]);

  const handleAssignClick = (vacancy: EventVacancy) => {
    setSelectedVacancy(vacancy);
    setDialogOpen(true);
  };

  const handleScheduleMember = async (
    userId: string,
    ministryId: string,
    position: string | null
  ) => {
    if (!selectedVacancy) return;

    try {
      await createSchedule.mutateAsync({
        eventId,
        userId,
        ministryId: selectedVacancy.ministryId,
        vacancyId: selectedVacancy.id,
        position: selectedVacancy.position.name,
      });
      setDialogOpen(false);
      setSelectedVacancy(null);
      refetchVacancies();
      refetchSchedules();
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
      refetchVacancies();
      refetchSchedules();
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

  const handleRefresh = () => {
    refetchVacancies();
    refetchSchedules();
  };

  // Compute stats
  const stats = React.useMemo(() => {
    if (!vacancies || !allSchedules) {
      return { total: 0, filled: 0, pending: 0, confirmed: 0, declined: 0 };
    }

    const total = vacancies.length;
    let filled = 0;
    let pending = 0;
    let confirmed = 0;
    let declined = 0;

    vacancies.forEach((vacancy) => {
      const schedule = findScheduleForVacancy(vacancy.id, allSchedules);
      if (schedule) {
        filled++;
        if (schedule.status === ScheduleStatus.CONFIRMED) confirmed++;
        if (schedule.status === ScheduleStatus.PENDING) pending++;
        if (schedule.status === ScheduleStatus.DECLINED) declined++;
      }
    });

    return { total, filled, pending, confirmed, declined };
  }, [vacancies, allSchedules]);

  // Get existing user IDs for conflict checking
  const existingUserIds = React.useMemo(() => {
    return allSchedules.map((s) => s.user.id);
  }, [allSchedules]);

  const isLoading = eventLoading || vacanciesLoading || schedulesLoading;

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
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Funcoes</p>
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
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Preenchidas</p>
              <p className="text-2xl font-bold">
                {stats.filled}/{stats.total}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Vacancy boards by ministry */}
      {vacancyGroups.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {vacancyGroups.map((group) => (
            <Card key={group.ministry.id} className="overflow-hidden">
              <CardHeader className="pb-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    {group.ministry.name}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {group.vacancies.filter((v) =>
                      findScheduleForVacancy(v.id, allSchedules)
                    ).length}
                    /{group.vacancies.length} preenchidas
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {group.vacancies.map((vacancy) => {
                  const schedule = findScheduleForVacancy(vacancy.id, allSchedules);
                  return (
                    <VacancySlot
                      key={vacancy.id}
                      positionName={vacancy.position.name}
                      schedule={schedule ? {
                        id: schedule.id,
                        user: schedule.user,
                        status: schedule.status,
                      } : null}
                      onAssign={() => handleAssignClick(vacancy)}
                      onRemove={handleRemoveMember}
                      isRemoving={removingScheduleId === schedule?.id}
                      canEdit={canEdit}
                    />
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8">
          <div className="text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-foreground font-medium text-lg mb-2">
              Nenhuma funcao definida
            </p>
            <p className="text-muted-foreground mb-4">
              Este evento ainda nao possui funcoes definidas. Adicione funcoes ao criar ou editar o evento.
            </p>
            <Link href={`/eventos/${eventId}`}>
              <Button variant="outline">Ver detalhes do evento</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Schedule Member Dialog */}
      <ScheduleMemberDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedVacancy(null);
        }}
        onSchedule={handleScheduleMember}
        eventId={eventId}
        selectedMinistryId={selectedVacancy?.ministryId}
        isLoading={createSchedule.isPending}
        existingUserIds={existingUserIds}
      />
    </div>
  );
}
