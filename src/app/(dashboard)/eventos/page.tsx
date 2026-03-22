"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  CalendarDays,
  List,
  Filter,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EventCard } from "@/components/events/event-card";
import { EventCalendar } from "@/components/events/event-calendar";
import {
  useEvents,
  useDeleteEvent,
  Event,
  EventType,
  EventStatus,
  EventFilters,
  getEventTypeLabel,
  getEventStatusLabel,
} from "@/hooks/use-events";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type ViewMode = "calendar" | "list";

const eventTypes: EventType[] = [
  "SUNDAY_MORNING",
  "SUNDAY_EVENING",
  "SPECIAL",
];

const eventStatuses: EventStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "COMPLETED",
];

export default function EventosPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const [filters, setFilters] = React.useState<EventFilters>({});
  const [showFilters, setShowFilters] = React.useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = React.useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = React.useState(false);

  const { data: events, isLoading, error } = useEvents(filters);
  const deleteEvent = useDeleteEvent();

  const typeDropdownRef = React.useRef<HTMLDivElement>(null);
  const statusDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(e.target as Node)
      ) {
        setShowTypeDropdown(false);
      }
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target as Node)
      ) {
        setShowStatusDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEdit = (event: Event) => {
    router.push(`/eventos/${event.id}`);
  };

  const handleDelete = async (event: Event) => {
    if (confirm(`Tem certeza que deseja excluir "${event.name}"?`)) {
      try {
        await deleteEvent.mutateAsync(event.id);
        toast({
          title: "Sucesso",
          description: "Evento excluido com sucesso!",
        });
      } catch (error) {
        toast({
          title: "Erro ao excluir evento",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive",
        });
      }
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = filters.type || filters.status;

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Eventos</h1>
          <p className="text-muted-foreground">
            Gerencie os eventos e cultos da igreja
          </p>
        </div>

        <Link href="/eventos/novo">
          <Button className="bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        </Link>
      </div>

      {/* View Toggle and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* View Toggle */}
        <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              viewMode === "list"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-4 w-4" />
            Lista
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              viewMode === "calendar"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Calendario
          </button>
        </div>

        {/* Filter Button */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(hasActiveFilters && "border-primary")}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {hasActiveFilters && (
            <Badge className="ml-2 bg-primary text-white">
              {(filters.type ? 1 : 0) + (filters.status ? 1 : 0)}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Type Filter */}
            <div className="relative" ref={typeDropdownRef}>
              <button
                onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <span className="text-sm">
                  {filters.type
                    ? getEventTypeLabel(filters.type)
                    : "Tipo de Evento"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {showTypeDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-border bg-card shadow-lg z-10">
                  <div className="py-1">
                    <button
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                      onClick={() => {
                        setFilters({ ...filters, type: undefined });
                        setShowTypeDropdown(false);
                      }}
                    >
                      Todos os tipos
                    </button>
                    {eventTypes.map((type) => (
                      <button
                        key={type}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors",
                          filters.type === type && "bg-muted text-primary"
                        )}
                        onClick={() => {
                          setFilters({ ...filters, type });
                          setShowTypeDropdown(false);
                        }}
                      >
                        {getEventTypeLabel(type)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative" ref={statusDropdownRef}>
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <span className="text-sm">
                  {filters.status
                    ? getEventStatusLabel(filters.status)
                    : "Status"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {showStatusDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-border bg-card shadow-lg z-10">
                  <div className="py-1">
                    <button
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                      onClick={() => {
                        setFilters({ ...filters, status: undefined });
                        setShowStatusDropdown(false);
                      }}
                    >
                      Todos os status
                    </button>
                    {eventStatuses.map((status) => (
                      <button
                        key={status}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors",
                          filters.status === status &&
                            "bg-muted text-primary"
                        )}
                        onClick={() => {
                          setFilters({ ...filters, status });
                          setShowStatusDropdown(false);
                        }}
                      >
                        {getEventStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-destructive">Erro ao carregar eventos</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </Button>
        </Card>
      ) : viewMode === "list" ? (
        <div className="space-y-4">
          {events && events.length > 0 ? (
            events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters
                  ? "Nenhum evento encontrado com os filtros aplicados"
                  : "Nenhum evento cadastrado"}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : (
                <Link href="/eventos/novo">
                  <Button className="bg-primary hover:bg-primary-hover">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeiro evento
                  </Button>
                </Link>
              )}
            </Card>
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          {/* Event List for selected date */}
          <div className="space-y-4 order-2 lg:order-1">
            <h2 className="font-semibold">Todos os Eventos</h2>
            {events && events.length > 0 ? (
              events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Nenhum evento cadastrado</p>
              </Card>
            )}
          </div>

          {/* Calendar */}
          <div className="order-1 lg:order-2">
            <EventCalendar
              events={events || []}
              onDateSelect={(date) => {
                // Could filter events by date here
                console.log("Selected date:", date);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
