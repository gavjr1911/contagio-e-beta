"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  X,
} from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useMySchedules, type Schedule } from "@/hooks/use-schedules";
import { ScheduleStatus } from "@/generated/prisma/enums";

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
      const dateKey = format(new Date(schedule.event.date), "yyyy-MM-dd");
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
    return schedules.map((s) => new Date(s.event.date));
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-beta-gray-blue/10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/escalas">
              <Button
                size="icon"
                variant="ghost"
                className="text-beta-gray-blue hover:text-beta-cream"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-beta-cream font-display">
                Calendario de Escalas
              </h1>
              <p className="text-beta-gray-blue text-sm">
                Visualize suas escalas no calendario
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 flex items-center gap-4 border-b border-beta-gray-blue/10">
        <span className="text-xs text-beta-gray-blue">Legenda:</span>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-xs text-beta-gray-blue">Pendente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-beta-gray-blue">Confirmado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-xs text-beta-gray-blue">Recusado</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="px-4 pt-4">
        <Card className="bg-beta-navy/50 border-beta-gray-blue/20">
          <CardContent className="p-2">
            {isLoading ? (
              <div className="h-[350px] flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-beta-terracotta border-t-transparent" />
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
                  hasPending: schedules?.filter(s => s.status === ScheduleStatus.PENDING).map(s => new Date(s.event.date)) || [],
                  hasConfirmed: schedules?.filter(s => s.status === ScheduleStatus.CONFIRMED).map(s => new Date(s.event.date)) || [],
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
      <div className="px-4 pt-6">
        <h2 className="text-lg font-semibold text-beta-cream mb-3">
          Proximas escalas
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-beta-navy/30 animate-pulse"
              />
            ))}
          </div>
        ) : schedules && schedules.length > 0 ? (
          <div className="space-y-2">
            {schedules
              .filter((s) => new Date(s.event.date) >= new Date())
              .slice(0, 5)
              .map((schedule) => (
                <Card
                  key={schedule.id}
                  className="bg-beta-navy/50 border-beta-gray-blue/20 cursor-pointer hover:bg-beta-navy/70 transition-colors"
                  onClick={() => {
                    setSelectedDate(new Date(schedule.event.date));
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
                      <p className="text-beta-cream text-sm font-medium truncate">
                        {schedule.event.title}
                      </p>
                      <p className="text-beta-gray-blue text-xs">
                        {format(
                          new Date(schedule.event.date),
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
            <CalendarIcon className="h-12 w-12 text-beta-gray-blue/30 mx-auto mb-3" />
            <p className="text-beta-gray-blue text-sm">
              Nenhuma escala futura encontrada
            </p>
          </div>
        )}
      </div>

      {/* Day details dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-beta-navy border-beta-gray-blue/20 max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-beta-cream flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-beta-terracotta" />
              {selectedDate &&
                format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {selectedDateSchedules.length > 0 ? (
              selectedDateSchedules.map((schedule) => (
                <Card
                  key={schedule.id}
                  className={cn(
                    "bg-beta-black/30 border-l-4",
                    schedule.status === ScheduleStatus.PENDING
                      ? "border-l-amber-500"
                      : schedule.status === ScheduleStatus.CONFIRMED
                      ? "border-l-emerald-500"
                      : "border-l-red-500"
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-beta-cream text-sm">
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
                    <div className="space-y-1 text-xs text-beta-gray-blue">
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
                        {schedule.position && (
                          <span className="text-beta-terracotta">
                            ({schedule.position})
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-6">
                <CalendarIcon className="h-10 w-10 text-beta-gray-blue/30 mx-auto mb-2" />
                <p className="text-beta-gray-blue text-sm">
                  Nenhuma escala neste dia
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Link href="/escalas">
              <Button
                variant="outline"
                className="border-beta-gray-blue/30 text-beta-gray-blue hover:bg-beta-gray-blue/10"
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
