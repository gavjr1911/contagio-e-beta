"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  Users,
  Music,
  Monitor,
  FileText,
  Loader2,
  CheckCircle,
  Briefcase,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { VacancySlot } from "@/components/events/vacancy-slot";
import { ScheduleMemberDialog } from "@/components/events/schedule-member-dialog";
import { OrderItemCard } from "@/components/events/order-item-card";
import { SetlistBlocks } from "@/components/events/setlist-blocks";
import { EventMediaTab } from "@/components/events/event-media-tab";
import {
  calculateStartTimes,
  calculateTotalDuration,
  formatDuration,
  type EventItem as EventItemType,
} from "@/hooks/use-event-items";
import {
  useEvent,
  useUpdateEvent,
  EventStatus,
  EventType,
  getEventTypeLabel,
  getEventStatusLabel,
  formatTimeFromDate,
} from "@/hooks/use-events";
import {
  useEventSchedules,
  useCreateSchedule,
  useDeleteSchedule,
  type EventScheduleItem,
} from "@/hooks/use-schedules";
import { useEventVacancies, type EventVacancy } from "@/hooks/use-vacancies";
import { ScheduleStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type TabType = "ordem" | "escalas" | "midia" | "setlist";

function getStatusVariant(
  status: EventStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PUBLISHED":
      return "default";
    case "COMPLETED":
      return "secondary";
    default:
      return "outline";
  }
}

function getTypeColor(type: EventType): string {
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

function formatDate(dateOrString: string | Date): string {
  const date = typeof dateOrString === "string" ? new Date(dateOrString) : dateOrString;
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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

export default function EventoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { data: session } = useSession();

  const { data: event, isLoading, error } = useEvent(eventId);
  const updateEvent = useUpdateEvent();

  // Vacancies e Schedules
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

  const [activeTab, setActiveTab] = React.useState<TabType>("ordem");

  // Dialog states
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedVacancy, setSelectedVacancy] = React.useState<EventVacancy | null>(null);
  const [removingScheduleId, setRemovingScheduleId] = React.useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);

  // Verificar permissao e status do evento
  const isAdmin = session?.user?.role === "ADMIN";
  const isCoordinator = session?.user?.role === "COORDINATOR";
  const isLeader = session?.user?.role === "LEADER";
  const isCompleted = event?.status === "COMPLETED";
  const canEdit = (isAdmin || isCoordinator || isLeader) && !isCompleted;

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

  // Stats
  const stats = React.useMemo(() => {
    if (!vacancies || !allSchedules) {
      return { total: 0, filled: 0, pending: 0, confirmed: 0 };
    }

    const total = vacancies.length;
    let filled = 0;
    let pending = 0;
    let confirmed = 0;

    vacancies.forEach((vacancy) => {
      const schedule = findScheduleForVacancy(vacancy.id, allSchedules);
      if (schedule) {
        filled++;
        if (schedule.status === ScheduleStatus.CONFIRMED) confirmed++;
        if (schedule.status === ScheduleStatus.PENDING) pending++;
      }
    });

    return { total, filled, pending, confirmed };
  }, [vacancies, allSchedules]);

  // Get existing user IDs for conflict checking
  const existingUserIds = React.useMemo(() => {
    return allSchedules.map((s) => s.user.id);
  }, [allSchedules]);

  const handleGoToEdit = () => {
    router.push(`/eventos/${eventId}/editar`);
  };

  const handleComplete = async () => {
    if (!event) return;
    try {
      await updateEvent.mutateAsync({
        id: event.id,
        status: "COMPLETED",
      });
      toast({
        title: "Sucesso",
        description: "Evento marcado como concluido!",
      });
    } catch (error) {
      toast({
        title: "Erro ao concluir evento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

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

  const handleRefreshSchedules = () => {
    refetchVacancies();
    refetchSchedules();
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !event) {
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

  const tabs = [
    { id: "ordem" as TabType, label: "Ordem do Culto", icon: FileText },
    { id: "escalas" as TabType, label: "Escalas", icon: Users },
    { id: "midia" as TabType, label: "Midia", icon: Monitor },
    { id: "setlist" as TabType, label: "Setlist", icon: Music },
  ];

  const startTimeFormatted = formatTimeFromDate(event.startTime);
  const endTimeFormatted = event.endTime ? formatTimeFromDate(event.endTime) : null;

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link href="/eventos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold font-display">{event.name}</h1>
              <Badge
                variant="outline"
                className={cn("text-xs", getTypeColor(event.type))}
              >
                {getEventTypeLabel(event.type)}
              </Badge>
              <Badge variant={getStatusVariant(event.status)} className="text-xs">
                {getEventStatusLabel(event.status)}
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
                  {startTimeFormatted}
                  {endTimeFormatted && ` - ${endTimeFormatted}`}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {event.status === "PUBLISHED" && (
              <Button
                variant="outline"
                onClick={handleComplete}
                disabled={updateEvent.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Concluir
              </Button>
            )}

            {!isCompleted && (
              <Button
                className="bg-primary hover:bg-primary-hover"
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar Evento
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-4 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.id === "escalas" && stats.total > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {stats.filled}/{stats.total}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "ordem" && (
          <div className="space-y-4">
            {event.items && event.items.length > 0 ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Atividades</p>
                        <p className="text-2xl font-bold">{event.items.length}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Duracao Total</p>
                        <p className="text-2xl font-bold text-emerald-500">
                          {formatDuration(calculateTotalDuration(event.items as EventItemType[]))}
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Inicio</p>
                        <p className="text-2xl font-bold text-blue-500">{startTimeFormatted}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Termino Previsto</p>
                        <p className="text-2xl font-bold text-amber-500">
                          {(() => {
                            const totalMinutes = calculateTotalDuration(event.items as EventItemType[]);
                            const [h, m] = startTimeFormatted.split(":").map(Number);
                            const endMinutes = h * 60 + m + totalMinutes;
                            const endH = Math.floor(endMinutes / 60) % 24;
                            const endM = endMinutes % 60;
                            return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
                          })()}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-lg">Atividades</h2>
                  {!isCompleted && (
                    <Link href={`/eventos/${eventId}/ordem`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Editar Ordem
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {(() => {
                    const startTimes = calculateStartTimes(
                      event.items as EventItemType[],
                      startTimeFormatted
                    );
                    return event.items.map((item, index) => (
                      <OrderItemCard
                        key={item.id}
                        item={item as EventItemType}
                        startTime={startTimes.get(item.id) || startTimeFormatted}
                        index={index}
                      />
                    ));
                  })()}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium text-foreground mb-2">
                      Nenhuma ordem do culto definida
                    </p>
                    <p className="mb-4">
                      {isCompleted
                        ? "Este evento foi concluido sem ordem do culto."
                        : "Crie a ordem do culto para organizar as atividades do evento."}
                    </p>
                    {!isCompleted && (
                      <Link href={`/eventos/${eventId}/ordem`}>
                        <Button>
                          <FileText className="h-4 w-4 mr-2" />
                          Criar Ordem do Culto
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "escalas" && (
          <div className="space-y-6">
            {/* Stats */}
            {stats.total > 0 && (
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
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Funcoes do Evento</h2>
              {stats.total > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefreshSchedules}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Vacancy boards by ministry */}
            {vacanciesLoading || schedulesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : vacancyGroups.length > 0 ? (
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
                          /{group.vacancies.length}
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
                    {isCompleted
                      ? "Este evento foi concluido sem funcoes definidas."
                      : "Este evento ainda nao possui funcoes definidas. Adicione funcoes ao criar ou editar o evento."}
                  </p>
                  {!isCompleted && (
                    <Link href={`/eventos/${event.id}/editar`}>
                      <Button variant="outline">Editar Evento</Button>
                    </Link>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === "midia" && (
          <EventMediaTab eventId={eventId} readOnly={!canEdit} />
        )}

        {activeTab === "setlist" && (
          <SetlistBlocks eventId={eventId} readOnly={!canEdit} />
        )}
      </div>

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

      {/* Edit Confirmation Dialog */}
      <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar evento</AlertDialogTitle>
            <AlertDialogDescription>
              Voce sera redirecionado para a pagina de edicao do evento.
              Certifique-se de salvar suas alteracoes antes de sair.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleGoToEdit}>
              Continuar para edicao
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
