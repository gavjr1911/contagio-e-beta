"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Event, EventType, formatTimeFromDate } from "@/hooks/use-events";
import Link from "next/link";

interface EventCalendarProps {
  events: Event[];
  onMonthChange?: (month: Date) => void;
  onDateSelect?: (date: Date) => void;
  className?: string;
}

function getTypeColor(type: EventType): string {
  switch (type) {
    case "SUNDAY_MORNING":
      return "bg-primary";
    case "SUNDAY_EVENING":
      return "bg-blue-500";
    case "SPECIAL":
      return "bg-purple-500";
    default:
      return "bg-muted";
  }
}

// Parse date string (YYYY-MM-DD) to Date object in local timezone
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function getDateKey(dateOrString: string | Date): string {
  // If already a string in YYYY-MM-DD format, return as-is
  if (typeof dateOrString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateOrString)) {
    return dateOrString;
  }
  const date = typeof dateOrString === "string" ? parseLocalDate(dateOrString) : dateOrString;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function EventCalendar({
  events,
  onMonthChange,
  onDateSelect,
  className,
}: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  // Group events by date
  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach((event) => {
      const dateKey = getDateKey(event.date);
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [events]);

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
    onMonthChange?.(month);
  };

  // Get dates with events for modifiers
  const datesWithEvents = React.useMemo(() => {
    return events.map(e => {
      const dateStr = typeof e.date === "string" ? e.date : getDateKey(e.date);
      return parseLocalDate(dateStr);
    });
  }, [events]);

  return (
    <div className={cn("p-4 bg-card rounded-[16px] border border-border", className)}>
      <DayPicker
        mode="single"
        locale={ptBR}
        month={currentMonth}
        onMonthChange={handleMonthChange}
        onSelect={(date) => date && onDateSelect?.(date)}
        showOutsideDays
        className="w-full"
        modifiers={{
          hasEvent: datesWithEvents,
        }}
        modifiersClassNames={{
          hasEvent: "font-bold text-primary",
        }}
        classNames={{
          months: "flex flex-col",
          month: "space-y-4",
          month_caption: "flex justify-between items-center px-2 py-2",
          caption_label: "text-lg font-semibold capitalize",
          nav: "flex items-center gap-2",
          button_previous: cn(
            "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 inline-flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
          ),
          button_next: cn(
            "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 inline-flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
          ),
          month_grid: "w-full border-collapse",
          weekdays: "flex w-full",
          weekday:
            "text-muted-foreground flex-1 font-medium text-center text-sm py-2",
          week: "flex w-full mt-1",
          day: cn(
            "flex-1 text-center p-0.5",
            "focus-within:relative focus-within:z-20"
          ),
          day_button: cn(
            "h-12 w-full p-1 font-normal aria-selected:opacity-100",
            "rounded-lg hover:bg-muted transition-colors cursor-pointer",
            "flex flex-col items-center justify-start pt-1"
          ),
          selected:
            "bg-primary text-white hover:bg-primary-hover",
          today: "bg-muted/50 font-semibold",
          outside: "text-muted-foreground/50",
          disabled: "text-muted-foreground/30",
          hidden: "invisible",
        }}
        components={{
          Chevron: ({ orientation }) => {
            const Icon = orientation === "left" ? ChevronLeft : ChevronRight
            return <Icon className="h-4 w-4" />
          },
        }}
      />

      {/* Events list for selected date or today */}
      <div className="mt-6 pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          Proximos Eventos
        </h3>
        <div className="space-y-2">
          {events.slice(0, 5).map((event) => {
            const dateStr = typeof event.date === "string" ? event.date : getDateKey(event.date);
            const eventDate = parseLocalDate(dateStr);

            return (
              <Link
                key={event.id}
                href={`/eventos/${event.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group"
              >
                <div
                  className={cn(
                    "w-1 h-8 rounded-full",
                    getTypeColor(event.type)
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {event.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {eventDate.toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    - {formatTimeFromDate(event.startTime)}
                  </p>
                </div>
              </Link>
            );
          })}
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum evento programado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
