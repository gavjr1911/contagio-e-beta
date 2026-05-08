"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  X,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useMySchedules, type Schedule } from "@/hooks/use-schedules";
import { ScheduleStatus } from "@/generated/prisma/enums";

import { parseLocalDate, getTodayLocal } from "@/lib/date-utils";

const statusColors: Record<ScheduleStatus, string> = {
  [ScheduleStatus.PENDING]: "bg-amber-500",
  [ScheduleStatus.CONFIRMED]: "bg-emerald-500",
  [ScheduleStatus.DECLINED]: "bg-red-500",
};

const statusLabels: Record<ScheduleStatus, string> = {
  [ScheduleStatus.PENDING]: "Pendente",
  [ScheduleStatus.CONFIRMED]: "Confirmado",
  [ScheduleStatus.DECLINED]: "Recusado",
};

export default function CalendarioEscalasPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: schedules, isLoading } = useMySchedules("all");

  // Group schedules by date
  const schedulesByDate = useMemo(() => {
    if (!schedules) return new Map<string, Schedule[]>();

    const map = new Map<string, Schedule[]>();
    schedules.forEach((schedule) => {
      // schedule.event.date is already in YYYY-MM-DD format
      const dateKey = schedule.event.date;
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, schedule]);
    });
    return map;
  }, [schedules]);

  // Get schedules for selected date
  const selectedDateSchedules = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return schedulesByDate.get(dateKey) || [];
  }, [selectedDate, schedulesByDate]);

  // Get dates with schedules for calendar highlighting
  const datesWithSchedules = useMemo(() => {
    if (!schedules) return [];
    return schedules.map((s) => parseLocalDate(s.event.date));
  }, [schedules]);

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const dateKey = format(date, "yyyy-MM-dd");
      if (schedulesByDate.has(dateKey)) {
        setDetailsOpen(true);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        backHref="/escalas"
        backLabel="Voltar para escalas"
        title="Calendário de Escalas"
        description="Visualize suas escalas no calendário"
      />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-xs text-muted-foreground">Legenda:</span>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-xs text-muted-foreground">Pendente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Confirmado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-xs text-muted-foreground">Recusado</span>
        </div>
      </div>

      {/* Calendar */}
      <div>
        <Card className="bg-secondary border-border">
          <CardContent className="p-2">
            {isLoading ? (
              <div className="h-[350px] flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                className="w-full"
                modifiers={{
                  hasSchedule: datesWithSchedules,
                  hasPending: schedules?.filter(s => s.status === ScheduleStatus.PENDING).map(s => parseLocalDate(s.event.date)) || [],
                  hasConfirmed: schedules?.filter(s => s.status === ScheduleStatus.CONFIRMED).map(s => parseLocalDate(s.event.date)) || [],
                }}
                modifiersClassNames={{
                  hasSchedule: "font-bold",
                  hasPending: "bg-amber-500/20 text-amber-400",
                  hasConfirmed: "bg-emerald-500/20 text-emerald-400",
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming schedules list */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Próximas escalas
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-card/30 animate-pulse"
              />
            ))}
          </div>
        ) : schedules && schedules.length > 0 ? (
          <div className="space-y-2">
            {schedules
              .filter((s) => parseLocalDate(s.event.date) >= getTodayLocal())
              .slice(0, 5)
              .map((schedule) => (
                <Card
                  key={schedule.id}
                  className="bg-secondary border-border cursor-pointer hover:bg-card/70 transition-colors"
                  onClick={() => {
                    setSelectedDate(parseLocalDate(schedule.event.date));
                    setDetailsOpen(true);
                  }}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                        schedule.status === ScheduleStatus.PENDING
                          ? "bg-amber-500/20"
                          : schedule.status === ScheduleStatus.CONFIRMED
                          ? "bg-emerald-500/20"
                          : "bg-red-500/20"
                      )}
                    >
                      <CalendarIcon
                        className={cn(
                          "h-5 w-5",
                          schedule.status === ScheduleStatus.PENDING
                            ? "text-amber-400"
                            : schedule.status === ScheduleStatus.CONFIRMED
                            ? "text-emerald-400"
                            : "text-red-400"
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">
                        {schedule.event.title}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {format(
                          parseLocalDate(schedule.event.date),
                          "EEE, dd 'de' MMM",
                          { locale: ptBR }
                        )}{" "}
                        - {schedule.event.startTime}
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        "shrink-0 text-xs",
                        schedule.status === ScheduleStatus.PENDING
                          ? "bg-amber-500/20 text-amber-400"
                          : schedule.status === ScheduleStatus.CONFIRMED
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      )}
                    >
                      {statusLabels[schedule.status]}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Nenhuma escala futura encontrada
            </p>
          </div>
        )}
      </div>

      {/* Day details dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-card border-border max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {selectedDate &&
                format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
            <DialogDescription>
              Veja as escalas em que você está envolvido neste dia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {selectedDateSchedules.length > 0 ? (
              selectedDateSchedules.map((schedule) => (
                <Card
                  key={schedule.id}
                  className={cn(
                    "bg-card border-l-4",
                    schedule.status === ScheduleStatus.PENDING
                      ? "border-l-amber-500"
                      : schedule.status === ScheduleStatus.CONFIRMED
                      ? "border-l-emerald-500"
                      : "border-l-red-500"
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-foreground text-sm">
                        {schedule.event.title}
                      </h4>
                      <Badge
                        className={cn(
                          "text-xs shrink-0",
                          schedule.status === ScheduleStatus.PENDING
                            ? "bg-amber-500/20 text-amber-400"
                            : schedule.status === ScheduleStatus.CONFIRMED
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        )}
                      >
                        {statusLabels[schedule.status]}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {schedule.event.startTime}
                          {schedule.event.endTime &&
                            ` - ${schedule.event.endTime}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="h-3.5 w-3.5 flex items-center justify-center text-[10px]">
                          M
                        </span>
                        <span>{schedule.ministry.name}</span>
                        {(schedule.vacancy?.position?.name ?? schedule.position) && (
                          <span className="text-primary">
                            ({schedule.vacancy?.position?.name ?? schedule.position})
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-6">
                <CalendarIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  Nenhuma escala neste dia
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Link href="/escalas">
              <Button
                variant="outline"
                className="border-border text-muted-foreground hover:bg-muted"
              >
                Ver todas as escalas
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
