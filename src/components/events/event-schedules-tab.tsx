"use client";

import * as React from "react";
import Link from "next/link";
import {
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Users,
  RefreshCw,
  Loader2,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VacancySlot } from "@/components/events/vacancy-slot";
import { AuditTimeline } from "@/components/events/audit-timeline";
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
import type { EventVacancy } from "@/hooks/use-vacancies";
import type { EventScheduleItem } from "@/hooks/use-schedules";
import { ScheduleStatus } from "@/generated/prisma/enums";

export interface VacancyGroup {
  ministry: { id: string; name: string };
  vacancies: EventVacancy[];
}

interface EventSchedulesTabProps {
  event: { id: string; slug?: string | null; status: string };
  eventId: string;
  canEditSchedules: boolean;
  isAdmin: boolean;
  vacancyGroups: VacancyGroup[];
  allSchedules: EventScheduleItem[];
  vacanciesLoading: boolean;
  schedulesLoading: boolean;
  removingScheduleId: string | null;
  onAssignClick: (vacancy: EventVacancy) => void;
  onRemoveSchedule: (scheduleId: string) => void;
  onRefresh: () => void;
}

function findScheduleForVacancy(
  vacancyId: string,
  schedules: EventScheduleItem[]
): EventScheduleItem | null {
  return schedules.find((s) => s.vacancyId === vacancyId) || null;
}

export function EventSchedulesTab({
  event,
  eventId,
  canEditSchedules,
  isAdmin,
  vacancyGroups,
  allSchedules,
  vacanciesLoading,
  schedulesLoading,
  removingScheduleId,
  onAssignClick,
  onRemoveSchedule,
  onRefresh,
}: EventSchedulesTabProps) {
  const isCompleted = event.status === "COMPLETED";

  const [confirmRemoveId, setConfirmRemoveId] = React.useState<string | null>(null);

  const stats = React.useMemo(() => {
    const total = vacancyGroups.reduce((acc, g) => acc + g.vacancies.length, 0);
    let filled = 0;
    let pending = 0;
    let confirmed = 0;
    vacancyGroups.forEach((g) =>
      g.vacancies.forEach((vacancy) => {
        const schedule = findScheduleForVacancy(vacancy.id, allSchedules);
        if (schedule) {
          filled++;
          if (schedule.status === ScheduleStatus.CONFIRMED) confirmed++;
          if (schedule.status === ScheduleStatus.PENDING) pending++;
        }
      })
    );
    return { total, filled, pending, confirmed };
  }, [vacancyGroups, allSchedules]);

  const handleConfirmRemove = () => {
    if (confirmRemoveId) {
      onRemoveSchedule(confirmRemoveId);
      setConfirmRemoveId(null);
    }
  };

  return (
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
          <Button variant="outline" size="icon" onClick={onRefresh}>
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
                      schedule={
                        schedule
                          ? {
                              id: schedule.id,
                              user: schedule.user,
                              status: schedule.status,
                            }
                          : null
                      }
                      onAssign={() => onAssignClick(vacancy)}
                      onRemove={(id) => setConfirmRemoveId(id)}
                      isRemoving={removingScheduleId === schedule?.id}
                      canEdit={canEditSchedules}
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
              {isCompleted
                ? "Este evento foi concluido sem funcoes definidas."
                : "Este evento ainda não possui funções definidas. Adicione funções ao criar ou editar o evento."}
            </p>
            {!isCompleted && (
              <Link href={`/eventos/${event.slug ?? event.id}/editar`}>
                <Button variant="outline">Editar Evento</Button>
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* Histórico */}
      {isAdmin && (
        <div className="pt-4 border-t border-border">
          <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            Histórico
          </h2>
          <AuditTimeline eventId={eventId} />
        </div>
      )}

      {/* Confirm remove dialog */}
      <AlertDialog
        open={confirmRemoveId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmRemoveId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro da escala</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este membro da escala?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
