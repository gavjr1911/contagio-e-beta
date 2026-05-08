"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
  RefreshCw,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { ScheduleCard } from "@/components/schedules/schedule-card";
import { ConfirmDialog } from "@/components/schedules/confirm-dialog";
import { DeclineDialog } from "@/components/schedules/decline-dialog";
import {
  useMySchedules,
  useConfirmSchedule,
  useDeclineSchedule,
  type Schedule,
  type ScheduleFilter,
} from "@/hooks/use-schedules";
import { useToast } from "@/hooks/use-toast";
import { ScheduleStatus } from "@/generated/prisma/enums";

export default function MinhasEscalasPage() {
  const [filter, setFilter] = useState<ScheduleFilter>("pending");
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: schedules, isLoading, error, refetch } = useMySchedules(filter);
  const confirmMutation = useConfirmSchedule();
  const declineMutation = useDeclineSchedule();

  const handleConfirm = () => {
    if (!selectedSchedule) return;

    confirmMutation.mutate(selectedSchedule.id, {
      onSuccess: () => {
        setConfirmDialogOpen(false);
        setSelectedSchedule(null);
        toast({
          title: "Presença confirmada!",
          description: "Sua participação foi confirmada com sucesso.",
        });
      },
      onError: (error) => {
        toast({
          title: "Erro ao confirmar",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive",
        });
      },
    });
  };

  const handleDecline = (reason?: string) => {
    if (!selectedSchedule) return;

    declineMutation.mutate(
      { scheduleId: selectedSchedule.id, reason },
      {
        onSuccess: () => {
          setDeclineDialogOpen(false);
          setSelectedSchedule(null);
          toast({
            title: "Escala recusada",
            description: "Sua recusa foi registrada.",
          });
        },
        onError: (error) => {
          toast({
            title: "Erro ao recusar",
            description: error instanceof Error ? error.message : "Erro desconhecido",
            variant: "destructive",
          });
        },
      }
    );
  };

  const openConfirmDialog = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setConfirmDialogOpen(true);
  };

  const openDeclineDialog = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setDeclineDialogOpen(true);
  };

  // Count pending schedules
  const pendingCount = schedules?.filter(
    (s) => s.status === ScheduleStatus.PENDING
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <PageHeader
          title="Minhas Escalas"
          description="Gerencie suas participações nos eventos"
          actions={
            <>
              <Button
                size="icon"
                variant="outline"
                onClick={() => refetch()}
                aria-label="Atualizar escalas"
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
              <Link href="/escalas/calendario">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Ver calendário de escalas"
                >
                  <CalendarDays className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/escalas/disponibilidade">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Configurar disponibilidade"
                >
                  <Clock className="h-5 w-5" />
                </Button>
              </Link>
            </>
          }
        />

        {/* Quick stats */}
        {pendingCount !== undefined && pendingCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-amber-600 dark:text-amber-400 font-medium text-sm">
                {pendingCount} escala{pendingCount > 1 ? "s" : ""} pendente
                {pendingCount > 1 ? "s" : ""}
              </p>
              <p className="text-amber-600/70 dark:text-amber-400/70 text-xs">
                Confirme ou recuse sua participação
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div>
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as ScheduleFilter)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 w-full bg-secondary p-1 h-auto">
            <TabsTrigger
              value="pending"
              className="text-xs sm:text-sm py-2.5 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
            >
              <AlertCircle className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Pendentes</span>
              <span className="sm:hidden ml-1">Pend.</span>
            </TabsTrigger>
            <TabsTrigger
              value="confirmed"
              className="text-xs sm:text-sm py-2.5 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400"
            >
              <CheckCircle2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Confirmadas</span>
              <span className="sm:hidden ml-1">Conf.</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-xs sm:text-sm py-2.5 data-[state=active]:bg-muted data-[state=active]:text-foreground"
            >
              <History className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Histórico</span>
              <span className="sm:hidden ml-1">Hist.</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              // Loading skeleton
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-32 rounded-lg bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              // Error state
              <div className="text-center py-12">
                <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
                <p className="text-red-400 font-medium">
                  Erro ao carregar escalas
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  Tente novamente mais tarde
                </p>
              </div>
            ) : schedules && schedules.length > 0 ? (
              // Schedule list
              schedules.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  onConfirm={
                    schedule.status === ScheduleStatus.PENDING
                      ? () => openConfirmDialog(schedule)
                      : undefined
                  }
                  onDecline={
                    schedule.status === ScheduleStatus.PENDING
                      ? () => openDeclineDialog(schedule)
                      : undefined
                  }
                  isConfirming={
                    confirmMutation.isPending &&
                    selectedSchedule?.id === schedule.id
                  }
                  isDeclining={
                    declineMutation.isPending &&
                    selectedSchedule?.id === schedule.id
                  }
                />
              ))
            ) : (
              // Empty state
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-foreground font-medium text-lg">
                  {filter === "pending"
                    ? "Nenhuma escala pendente"
                    : filter === "confirmed"
                    ? "Nenhuma escala confirmada"
                    : filter === "history"
                    ? "Nenhum histórico ainda"
                    : "Nenhuma escala encontrada"}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  {filter === "pending"
                    ? "Você está em dia com suas confirmações!"
                    : filter === "confirmed"
                    ? "Suas escalas confirmadas aparecerão aqui"
                    : filter === "history"
                    ? "Eventos passados aparecerão aqui"
                    : "Você ainda não foi escalado para nenhum evento"}
                </p>
              </div>
            )}
          </div>
        </Tabs>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handleConfirm}
        isLoading={confirmMutation.isPending}
        eventName={selectedSchedule?.event.title}
      />

      {/* Decline Dialog */}
      <DeclineDialog
        open={declineDialogOpen}
        onOpenChange={setDeclineDialogOpen}
        onDecline={handleDecline}
        isLoading={declineMutation.isPending}
        eventName={selectedSchedule?.event.title}
      />
    </div>
  );
}
