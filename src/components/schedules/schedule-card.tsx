"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  Clock,
  MapPin,
  Check,
  X,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScheduleStatus } from "@/generated/prisma/enums";
import type { Schedule } from "@/hooks/use-schedules";

import { parseLocalDate } from "@/lib/date-utils";

interface ScheduleCardProps {
  schedule: Schedule;
  onConfirm?: () => void;
  onDecline?: () => void;
  onClick?: () => void;
  isConfirming?: boolean;
  isDeclining?: boolean;
}

const statusConfig: Record<
  ScheduleStatus,
  { label: string; className: string }
> = {
  [ScheduleStatus.PENDING]: {
    label: "Pendente",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  [ScheduleStatus.CONFIRMED]: {
    label: "Confirmado",
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  [ScheduleStatus.DECLINED]: {
    label: "Recusado",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

export function ScheduleCard({
  schedule,
  onConfirm,
  onDecline,
  onClick,
  isConfirming = false,
  isDeclining = false,
}: ScheduleCardProps) {
  // Parse date string to local Date (avoids UTC interpretation issues)
  const eventDate = parseLocalDate(schedule.event.date);
  const isPending = schedule.status === ScheduleStatus.PENDING;
  const statusInfo = statusConfig[schedule.status];

  return (
    <Card
      className={cn(
        "bg-secondary border-border transition-all duration-200",
        onClick && "cursor-pointer hover:bg-secondary/70 active:scale-[0.98]",
        isPending && "border-l-4 border-l-amber-500"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header - Event name and status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate text-base">
              {schedule.event.title}
            </h3>
            <p className="text-muted-foreground text-sm mt-0.5">
              {schedule.ministry.name}
              {(schedule.vacancy?.position?.name ?? schedule.position) && (
                <span className="text-primary ml-1">
                  - {schedule.vacancy?.position?.name ?? schedule.position}
                </span>
              )}
            </p>
          </div>
          <Badge className={cn("shrink-0", statusInfo.className)}>
            {statusInfo.label}
          </Badge>
        </div>

        {/* Date and time info */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="capitalize">
              {format(eventDate, "EEE, dd 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary" />
            <span>
              {schedule.event.startTime}
              {schedule.event.endTime && ` - ${schedule.event.endTime}`}
            </span>
          </div>
        </div>

        {/* Action buttons for pending schedules */}
        {isPending && (onConfirm || onDecline) && (
          <div className="flex gap-2 mt-2">
            {onConfirm && (
              <Button
                size="sm"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirm();
                }}
                disabled={isConfirming || isDeclining}
              >
                {isConfirming ? (
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Confirmando...
                  </span>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Confirmar
                  </>
                )}
              </Button>
            )}
            {onDecline && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onDecline();
                }}
                disabled={isConfirming || isDeclining}
              >
                {isDeclining ? (
                  <span className="flex items-center gap-2">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                    Recusando...
                  </span>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-1" />
                    Recusar
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Arrow indicator for clickable cards */}
        {onClick && !isPending && (
          <div className="flex justify-end mt-2">
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
