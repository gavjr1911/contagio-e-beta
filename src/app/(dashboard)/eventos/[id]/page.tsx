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
  Save,
  ClipboardCheck,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { ScheduleMemberDialog } from "@/components/events/schedule-member-dialog";
import { SetlistBlocks } from "@/components/events/setlist-blocks";
import { EventMediaTab } from "@/components/events/event-media-tab";
import { SaveAsTemplateDialog } from "@/components/events/save-as-template-dialog";
import { EventChecklistTab } from "@/components/events/event-checklist-tab";
import { EventAttendanceTab } from "@/components/events/event-attendance-tab";
import { EventOrderTab } from "@/components/events/event-order-tab";
import { EventSchedulesTab } from "@/components/events/event-schedules-tab";
import { ExportPDFButton } from "@/components/events/export-pdf-button";
import { type EventItem as EventItemType } from "@/hooks/use-event-items";
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
} from "@/hooks/use-schedules";
import { useEventVacancies, type EventVacancy } from "@/hooks/use-vacancies";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { meetsLevel } from "@/lib/permissions/check";
import { toLocalDate } from "@/lib/date-utils";

type TabType = "ordem" | "escalas" | "midia" | "setlist" | "checklist" | "presenca";

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
    case "CULTO":
      return "bg-primary/10 text-primary border-primary/20";
    case "SPECIAL":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatDate(dateOrString: string | Date): string {
  const date = toLocalDate(dateOrString);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

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

export default function EventoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { data: session } = useSession();

  const { data: event, isLoading, error } = useEvent(eventId);
  const updateEvent = useUpdateEvent();

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
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = React.useState(false);

  const { permissions, isAdmin } = usePermissions();
  const isCompleted = event?.status === "COMPLETED";

  const allSchedules = React.useMemo(() => {
    if (!scheduleGroups) return [];
    return scheduleGroups.flatMap((group) => group.schedules);
  }, [scheduleGroups]);

  const isScheduledForEvent = React.useMemo(() => {
    if (!session?.user?.id || !allSchedules) return false;
    return allSchedules.some((s) => s.user.id === session.user.id);
  }, [allSchedules, session?.user?.id]);

  const canEditEvent = (isAdmin || meetsLevel(permissions.events, "edit")) && !isCompleted;
  const canEditOrder = (isAdmin || meetsLevel(permissions.orderOfService, "edit")) && !isCompleted;
  const canViewOrder = isAdmin || meetsLevel(permissions.orderOfService, "view") || isScheduledForEvent;
  const canEditSchedules = (isAdmin || meetsLevel(permissions.schedules, "edit")) && !isCompleted;
  const canViewSchedules = isAdmin || meetsLevel(permissions.schedules, "view") || isScheduledForEvent;
  const canEditMedia = (isAdmin || meetsLevel(permissions.media, "edit")) && !isCompleted;
  const canViewMedia = isAdmin || meetsLevel(permissions.media, "view") || isScheduledForEvent;
  const canViewSongs = isAdmin || meetsLevel(permissions.songs, "view") || isScheduledForEvent;
  const canEditSongs = (isAdmin || meetsLevel(permissions.songs, "edit")) && !isCompleted;
  const canViewChecklist = isAdmin || meetsLevel(permissions.checklists, "view") || isScheduledForEvent;

  const vacancyGroups = React.useMemo(() => {
    if (!vacancies) return [];
    return groupVacanciesByMinistry(vacancies);
  }, [vacancies]);

  const totalVacancies = vacancies?.length ?? 0;
  const filledVacancies = React.useMemo(() => {
    if (!vacancies) return 0;
    return vacancies.filter((v) =>
      allSchedules.some((s) => s.vacancyId === v.id)
    ).length;
  }, [vacancies, allSchedules]);

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
    _ministryId: string,
    _position: string | null
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

  const allTabs: { id: TabType; label: string; icon: typeof FileText; visible: boolean }[] = [
    { id: "ordem", label: "Ordem do Culto", icon: FileText, visible: canViewOrder },
    { id: "escalas", label: "Escalas", icon: Users, visible: canViewSchedules },
    { id: "midia", label: "Mídia", icon: Monitor, visible: canViewMedia },
    { id: "setlist", label: "Setlist", icon: Music, visible: canViewSongs },
    { id: "checklist", label: "Checklist", icon: ClipboardCheck, visible: canViewChecklist },
    { id: "presenca", label: "Presença", icon: ClipboardList, visible: canEditEvent || isAdmin },
  ];
  const tabs = allTabs.filter((t) => t.visible);

  const startTimeFormatted = formatTimeFromDate(event.startTime);
  const endTimeFormatted = event.endTime ? formatTimeFromDate(event.endTime) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {/* Back + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/eventos"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Eventos</span>
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            {canViewOrder && event.items && event.items.length > 0 && (
              <ExportPDFButton
                event={event}
                items={event.items as EventItemType[]}
                schedules={scheduleGroups || []}
                size="sm"
                variant="outline"
              />
            )}

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveAsTemplateOpen(true)}
              >
                <Save className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Salvar como Template</span>
                <span className="sm:hidden">Template</span>
              </Button>
            )}

            {canEditEvent && event.status === "PUBLISHED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleComplete}
                disabled={updateEvent.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Concluir
              </Button>
            )}

            {canEditEvent && (
              <Button
                size="sm"
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4 mr-1.5" />
                Editar
              </Button>
            )}
          </div>
        </div>

        {/* Title + Info */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold font-display tracking-tight">{event.name}</h1>
            <div className="flex items-center gap-1.5">
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
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="capitalize">{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>
                {startTimeFormatted}
                {endTimeFormatted && ` - ${endTimeFormatted}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto">
        <nav className="flex gap-1 sm:gap-4 -mb-px min-w-max" aria-label="Seções do evento">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.id === "escalas" && totalVacancies > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {filledVacancies}/{totalVacancies}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "ordem" && (
          <EventOrderTab
            event={event}
            eventId={eventId}
            canEditOrder={canEditOrder}
            startTimeFormatted={startTimeFormatted}
          />
        )}

        {activeTab === "escalas" && (
          <EventSchedulesTab
            event={event}
            eventId={eventId}
            canEditSchedules={canEditSchedules}
            isAdmin={isAdmin}
            vacancyGroups={vacancyGroups}
            allSchedules={allSchedules}
            vacanciesLoading={vacanciesLoading}
            schedulesLoading={schedulesLoading}
            removingScheduleId={removingScheduleId}
            onAssignClick={handleAssignClick}
            onRemoveSchedule={handleRemoveMember}
            onRefresh={handleRefreshSchedules}
          />
        )}

        {activeTab === "midia" && (
          <EventMediaTab eventId={event.id} readOnly={!canEditMedia} />
        )}

        {activeTab === "setlist" && (
          <SetlistBlocks eventId={eventId} readOnly={!canEditSongs} />
        )}

        {activeTab === "checklist" && (
          <EventChecklistTab eventId={eventId} />
        )}

        {activeTab === "presenca" && (
          <EventAttendanceTab eventId={eventId} canEdit={canEditEvent || isAdmin} />
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

      {/* Save as Template Dialog */}
      <SaveAsTemplateDialog
        open={saveAsTemplateOpen}
        onOpenChange={setSaveAsTemplateOpen}
        eventName={event.name}
        eventType={event.type}
        items={event.items as Array<{
          id: string;
          type: string;
          title: string;
          description?: string | null;
          durationMinutes?: number | null;
          requiresMedia?: boolean;
          bibleReference?: string | null;
          notes?: string | null;
          isPublic?: boolean;
          expectedSongCount?: number | null;
        }>}
        vacancies={vacancies?.map((v) => ({
          ministryId: v.ministryId,
          positionId: v.positionId,
          quantity: v.quantity,
        })) || []}
      />
    </div>
  );
}
