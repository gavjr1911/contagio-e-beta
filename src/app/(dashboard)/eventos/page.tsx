"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCanEdit } from "@/hooks/use-permissions";
import {
  Plus,
  CalendarDays,
  List,
  Filter,
  ChevronDown,
  Loader2,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { PageHeader } from "@/components/layout/page-header";
import { EventCard } from "@/components/events/event-card";
import { EventCalendar } from "@/components/events/event-calendar";
import {
  useEvents,
  useDeleteEvent,
  Event,
  EventType,
  EventFilters,
  getEventTypeLabel,
} from "@/hooks/use-events";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type TabMode = "lista" | "calendario" | "historico";

const eventTypes: EventType[] = [
  "CULTO",
  "SPECIAL",
];

export default function EventosPage() {
  const router = useRouter();
  const canCreateEvent = useCanEdit("events");
  const [activeTab, setActiveTab] = React.useState<TabMode>("lista");
  const [filters, setFilters] = React.useState<EventFilters>({});
  const [showFilters, setShowFilters] = React.useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = React.useState(false);
  const [eventToDelete, setEventToDelete] = React.useState<Event | null>(null);

  // Aplica filtro de status baseado na aba ativa
  const effectiveFilters = React.useMemo(() => {
    if (activeTab === "historico") {
      return { ...filters, status: "COMPLETED" as const };
    }
    // Lista e Calendário mostram apenas eventos ativos (não concluídos)
    return { ...filters, status: "PUBLISHED" as const };
  }, [filters, activeTab]);

  const { data: events, isLoading, error } = useEvents(effectiveFilters);
  const deleteEvent = useDeleteEvent();

  const typeDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(e.target as Node)
      ) {
        setShowTypeDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEdit = (event: Event) => {
    router.push(`/eventos/${event.slug ?? event.id}`);
  };

  const handleDelete = (event: Event) => {
    setEventToDelete(event);
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      await deleteEvent.mutateAsync(eventToDelete.id);
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
    } finally {
      setEventToDelete(null);
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = !!filters.type;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Eventos"
        description="Gerencie os eventos e cultos da igreja"
        actions={
          canCreateEvent && (
            <Link href="/eventos/novo">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </Link>
          )
        }
      />

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tab Toggle */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg overflow-x-auto no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-1">
          <button
            onClick={() => setActiveTab("lista")}
            className={cn(
              "flex items-center gap-2 px-3 h-9 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0",
              activeTab === "lista"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <List className="h-4 w-4" />
            Lista
          </button>
          <button
            onClick={() => setActiveTab("calendario")}
            className={cn(
              "flex items-center gap-2 px-3 h-9 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0",
              activeTab === "calendario"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Calendário
          </button>
          <button
            onClick={() => setActiveTab("historico")}
            className={cn(
              "flex items-center gap-2 px-3 h-9 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0",
              activeTab === "historico"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="h-4 w-4" />
            Histórico
          </button>
        </div>

        {/* Filter Button */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn("w-full sm:w-auto", hasActiveFilters && "border-primary")}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {hasActiveFilters && (
            <Badge className="ml-2 bg-primary text-primary-foreground">1</Badge>
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
      ) : activeTab === "lista" || activeTab === "historico" ? (
        <div className="space-y-4">
          {activeTab === "historico" && (
            <p className="text-sm text-muted-foreground">
              Mostrando eventos concluídos
            </p>
          )}
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
                  : activeTab === "historico"
                  ? "Nenhum evento concluído"
                  : "Nenhum evento ativo"}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : activeTab === "lista" && canCreateEvent ? (
                <Link href="/eventos/novo">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeiro evento
                  </Button>
                </Link>
              ) : null}
            </Card>
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          {/* Event List for selected date */}
          <div className="space-y-4 order-2 lg:order-1">
            <h2 className="font-semibold">Eventos Ativos</h2>
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
                <p className="text-muted-foreground">Nenhum evento ativo</p>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={eventToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setEventToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir &quot;{eventToDelete?.name}&quot;? Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
