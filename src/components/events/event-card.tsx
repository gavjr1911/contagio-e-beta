"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Clock, MoreHorizontal, Users, UserPlus, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Event,
  EventStatus,
  EventType,
  getEventTypeLabel,
  getEventStatusLabel,
  formatTimeFromDate,
  formatDateFromDate,
} from "@/hooks/use-events";
import { toLocalDate } from "@/lib/date-utils";

interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: (event: Event) => void;
  className?: string;
}

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
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Sao_Paulo",
  });
}

export function EventCard({
  event,
  onEdit,
  onDelete,
  className,
}: EventCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const startTimeFormatted = formatTimeFromDate(event.startTime);
  const endTimeFormatted = event.endTime ? formatTimeFromDate(event.endTime) : null;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="outline"
                className={cn("text-xs font-medium", getTypeColor(event.type))}
              >
                {getEventTypeLabel(event.type)}
              </Badge>
              <Badge variant={getStatusVariant(event.status)} className="text-xs">
                {getEventStatusLabel(event.status)}
              </Badge>
            </div>

            <Link
              href={`/eventos/${event.slug ?? event.id}`}
              className="block group-hover:text-primary transition-colors duration-150"
            >
              <h3 className="font-semibold text-base truncate">{event.name}</h3>
            </Link>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(event.date)}</span>
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

          {event.attendance && (event.attendance.attendees > 0 || event.attendance.visitors > 0 || event.attendance.conversions > 0) && (
            <div className="flex flex-col items-end gap-1 text-xs tabular-nums shrink-0 self-center pr-1">
              <span className="flex items-center gap-1.5 text-foreground" title="Presentes">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold w-6 text-right">{event.attendance.attendees}</span>
              </span>
              <span className="flex items-center gap-1.5 text-foreground" title="Visitantes">
                <UserPlus className="h-3.5 w-3.5 text-sky-500" />
                <span className="font-semibold w-6 text-right">{event.attendance.visitors}</span>
              </span>
              <span className="flex items-center gap-1.5 text-foreground" title="Conversões">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                <span className="font-semibold w-6 text-right">{event.attendance.conversions}</span>
              </span>
            </div>
          )}

          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-border bg-card shadow-lg z-10">
                <div className="py-1">
                  {onEdit && (
                    <button
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                      onClick={() => {
                        onEdit(event);
                        setShowMenu(false);
                      }}
                    >
                      Editar
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={() => {
                        onDelete(event);
                        setShowMenu(false);
                      }}
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
