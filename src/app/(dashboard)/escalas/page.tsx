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
  Filter,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
import { ScheduleStatus } from "@/generated/prisma/enums";

export default function MinhasEscalasPage() {
  const [filter, setFilter] = useState<ScheduleFilter>("pending");
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);

  const { data: schedules, isLoading, error } = useMySchedules(filter);
  const confirmMutation = useConfirmSchedule();
  const declineMutation = useDeclineSchedule();

  const handleConfirm = () => {
    if (!selectedSchedule) return;

    confirmMutation.mutate(selectedSchedule.id, {
      onSuccess: () => {
        setConfirmDialogOpen(false);
        setSelectedSchedule(null);
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-beta-gray-blue/10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-beta-cream font-display">
                Minhas Escalas
              </h1>
              <p className="text-beta-gray-blue text-sm mt-0.5">
                Gerencie suas participacoes nos eventos
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/escalas/calendario">
                <Button
                  size="icon"
                  variant="outline"
                  className="border-beta-gray-blue/30 text-beta-gray-blue hover:bg-beta-gray-blue/10"
                >
                  <CalendarDays className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/escalas/disponibilidade">
                <Button
                  size="icon"
                  variant="outline"
                  className="border-beta-gray-blue/30 text-beta-gray-blue hover:bg-beta-gray-blue/10"
                >
                  <Clock className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick stats */}
          {pendingCount !== undefined && pendingCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-amber-400 font-medium text-sm">
                  {pendingCount} escala{pendingCount > 1 ? "s" : ""} pendente
                  {pendingCount > 1 ? "s" : ""}
                </p>
                <p className="text-amber-400/70 text-xs">
                  Confirme ou recuse sua participacao
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as ScheduleFilter)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-4 w-full bg-beta-navy/50 p-1 h-auto">
            <TabsTrigger
              value="pending"
              className="text-xs py-2.5 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
            >
              <AlertCircle className="h-4 w-4 mr-1.5" />
              Pendentes
            </TabsTrigger>
            <TabsTrigger
              value="confirmed"
              className="text-xs py-2.5 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Confirmadas
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="text-xs py-2.5 data-[state=active]:bg-beta-terracotta/20 data-[state=active]:text-beta-terracotta"
            >
              <Filter className="h-4 w-4 mr-1.5" />
              Todas
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-xs py-2.5 data-[state=active]:bg-beta-gray-blue/20 data-[state=active]:text-beta-gray-blue"
            >
              <History className="h-4 w-4 mr-1.5" />
              Historico
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              // Loading skeleton
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-32 rounded-lg bg-beta-navy/30 animate-pulse"
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
                <p className="text-beta-gray-blue text-sm mt-1">
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
                <Calendar className="h-16 w-16 text-beta-gray-blue/30 mx-auto mb-4" />
                <p className="text-beta-cream font-medium text-lg">
                  {filter === "pending"
                    ? "Nenhuma escala pendente"
                    : filter === "confirmed"
                    ? "Nenhuma escala confirmada"
                    : filter === "history"
                    ? "Nenhum historico ainda"
                    : "Nenhuma escala encontrada"}
                </p>
                <p className="text-beta-gray-blue text-sm mt-1">
                  {filter === "pending"
                    ? "Voce esta em dia com suas confirmacoes!"
                    : filter === "confirmed"
                    ? "Suas escalas confirmadas aparecerao aqui"
                    : filter === "history"
                    ? "Eventos passados aparecerao aqui"
                    : "Voce ainda nao foi escalado para nenhum evento"}
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
