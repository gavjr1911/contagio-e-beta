"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Clock,
  Loader2,
  RefreshCw,
  Users,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { PageHeader } from "@/components/layout/page-header";
import { parseLocalDate } from "@/lib/date-utils";
import { VacancySlot } from "@/components/events/vacancy-slot";
import { ScheduleMemberDialog } from "@/components/events/schedule-member-dialog";
import { BulkMemberSelector } from "@/components/events/bulk-member-selector";
import { BulkScheduleDialog, type SelectedMember } from "@/components/events/bulk-schedule-dialog";
import {
  useEventSchedules,
  useCreateSchedule,
  useDeleteSchedule,
  type EventScheduleItem,
} from "@/hooks/use-schedules";
import { useEventVacancies, type EventVacancy } from "@/hooks/use-vacancies";
import { useMinistries } from "@/hooks/use-ministries";
import { useEvent } from "@/hooks/use-events";
import { ScheduleStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function getTypeColor(type: string): string {
  switch (type) {
    case "CULTO":
      return "bg-primary/10 text-primary border-primary/20";
    case "SPECIAL":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    CULTO: "Culto",
    SPECIAL: "Evento Especial",
  };
  return labels[type] || type;
}

function formatDate(dateString: string): string {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
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
  const { data: ministries } = useMinistries();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedVacancy, setSelectedVacancy] = React.useState<EventVacancy | null>(null);
  const [removingScheduleId, setRemovingScheduleId] = React.useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = React.useState<string | null>(null);

  // Bulk scheduling state
  const [bulkDialogOpen, setBulkDialogOpen] = React.useState(false);
  const [selectedMembers, setSelectedMembers] = React.useState<SelectedMember[]>([]);
  const [showBulkSelector, setShowBulkSelector] = React.useState(false);

  // Verificar permissao
  const isAdmin = session?.user?.role === "ADMIN";
  const isLeader = session?.user?.role === "LEADER";
  const canEdit = isAdmin || isLeader;

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
      const result = await createSchedule.mutateAsync({
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

      // Show warnings if any
      if (result.warnings && result.warnings.length > 0) {
        toast({
          title: "Membro escalado com avisos",
          description: result.warnings.join(". "),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Membro escalado",
          description: "O membro foi adicionado a escala com sucesso.",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao escalar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = (scheduleId: string) => {
    setConfirmRemoveId(scheduleId);
  };

  const handleConfirmRemove = async () => {
    if (!confirmRemoveId) return;
    const scheduleId = confirmRemoveId;
    setConfirmRemoveId(null);

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

  // Bulk scheduling handlers
  const handleBulkComplete = () => {
    setSelectedMembers([]);
    setBulkDialogOpen(false);
    setShowBulkSelector(false);
    refetchVacancies();
    refetchSchedules();
  };

  // Get all positions from all ministries for the bulk dialog
  const allPositions = React.useMemo(() => {
    if (!ministries) return [];
    return ministries.flatMap((m) => m.positions || []);
  }, [ministries]);

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
      <div>
        <Card className="p-8 text-center">
          <p className="text-destructive mb-4">Evento não encontrado</p>
          <Link href="/eventos">
            <Button variant="outline">Voltar para eventos</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        backHref={`/eventos/${eventId}`}
        backLabel="Voltar para o evento"
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate">Escalas - {event.name}</span>
            <Badge
              variant="outline"
              className={cn("text-xs shrink-0", getTypeColor(event.type))}
            >
              {getTypeLabel(event.type)}
            </Badge>
          </span>
        }
        meta={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span className="capitalize">{formatDate(event.date as string)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>
                {formatTime(event.startTime as string)}
                {event.endTime && ` - ${formatTime(event.endTime as string)}`}
              </span>
            </div>
          </div>
        }
        actions={
          <>
            {canEdit && (
              <Button
                variant={showBulkSelector ? "secondary" : "outline"}
                onClick={() => setShowBulkSelector(!showBulkSelector)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {showBulkSelector ? "Fechar Lote" : "Escalar em Lote"}
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              aria-label="Atualizar escalas"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </>
        }
      />

      {/* Bulk Member Selector */}
      {showBulkSelector && canEdit && (
        <BulkMemberSelector
          selectedMembers={selectedMembers}
          onSelectionChange={setSelectedMembers}
          existingUserIds={existingUserIds}
          onOpenBulkDialog={() => setBulkDialogOpen(true)}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Funções</p>
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
                      eventId={eventId}
                      ministryId={group.ministry.id}
                      vacancyId={vacancy.id}
                      positionId={vacancy.position.id}
                      positionName={vacancy.position.name}
                      schedule={schedule ? {
                        id: schedule.id,
                        user: schedule.user,
                        status: schedule.status,
                      } : null}
                      onAssign={() => handleAssignClick(vacancy)}
                      onRemove={handleRemoveMember}
                      onScheduleSuccess={() => {
                        refetchVacancies();
                        refetchSchedules();
                      }}
                      isRemoving={removingScheduleId === schedule?.id}
                      canEdit={canEdit}
                      showSuggestions={canEdit}
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
              Nenhuma função definida
            </p>
            <p className="text-muted-foreground mb-4">
              Este evento ainda não possui funções definidas. Adicione funções ao criar ou editar o evento.
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

      {/* Bulk Schedule Dialog */}
      <BulkScheduleDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        eventId={eventId}
        selectedMembers={selectedMembers}
        positions={allPositions}
        onComplete={handleBulkComplete}
        existingUserIds={existingUserIds}
      />

      {/* Confirmacao de remocao de membro */}
      <AlertDialog
        open={!!confirmRemoveId}
        onOpenChange={(open) => {
          if (!open) setConfirmRemoveId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro da escala</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este membro da escala? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
