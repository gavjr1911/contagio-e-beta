"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  Trash2,
  MoreHorizontal,
  Users,
  Music,
  Monitor,
  FileText,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useEvent,
  useDeleteEvent,
  useUpdateEvent,
  EventStatus,
  EventType,
  getEventTypeLabel,
  getEventStatusLabel,
  formatTimeFromDate,
} from "@/hooks/use-events";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type TabType = "ordem" | "escalas" | "midia" | "setlist";

function getStatusVariant(
  status: EventStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PUBLISHED":
      return "default";
    case "COMPLETED":
      return "secondary";
    case "DRAFT":
    default:
      return "outline";
  }
}

function getTypeColor(type: EventType): string {
  switch (type) {
    case "SUNDAY_MORNING":
      return "bg-primary/10 text-primary border-primary/20";
    case "SUNDAY_EVENING":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "SPECIAL":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatDate(dateOrString: string | Date): string {
  const date = typeof dateOrString === "string" ? new Date(dateOrString) : dateOrString;
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function EventoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const { data: event, isLoading, error } = useEvent(eventId);
  const deleteEvent = useDeleteEvent();
  const updateEvent = useUpdateEvent();

  const [activeTab, setActiveTab] = React.useState<TabType>("ordem");
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

  const handleDelete = async () => {
    if (!event) return;
    if (confirm(`Tem certeza que deseja excluir "${event.name}"?`)) {
      try {
        await deleteEvent.mutateAsync(event.id);
        toast({
          title: "Sucesso",
          description: "Evento excluido com sucesso!",
        });
        router.push("/eventos");
      } catch (error) {
        toast({
          title: "Erro ao excluir evento",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive",
        });
      }
    }
  };

  const handlePublish = async () => {
    if (!event) return;
    try {
      await updateEvent.mutateAsync({
        id: event.id,
        status: "PUBLISHED",
      });
      toast({
        title: "Sucesso",
        description: "Evento publicado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro ao publicar evento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleComplete = async () => {
    if (!event) return;
    try {
      await updateEvent.mutateAsync({
        id: event.id,
        status: "COMPLETED",
      });
      toast({
        title: "Sucesso",
        description: "Evento marcado como concluido!",
      });
    } catch (error) {
      toast({
        title: "Erro ao concluir evento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex-1 p-6">
        <Card className="p-8 text-center">
          <p className="text-destructive mb-4">Evento nao encontrado</p>
          <Link href="/eventos">
            <Button variant="outline">Voltar para eventos</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: "ordem" as TabType, label: "Ordem do Culto", icon: FileText },
    { id: "escalas" as TabType, label: "Escalas", icon: Users },
    { id: "midia" as TabType, label: "Midia", icon: Monitor },
    { id: "setlist" as TabType, label: "Setlist", icon: Music },
  ];

  const startTimeFormatted = formatTimeFromDate(event.startTime);
  const endTimeFormatted = event.endTime ? formatTimeFromDate(event.endTime) : null;

  // Group schedules by ministry
  const schedulesByMinistry = event.schedules?.reduce((acc, schedule) => {
    const ministryName = schedule.ministry.name;
    if (!acc[ministryName]) {
      acc[ministryName] = [];
    }
    acc[ministryName].push(schedule);
    return acc;
  }, {} as Record<string, typeof event.schedules>);

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Link href="/eventos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold font-display">{event.name}</h1>
              <Badge
                variant="outline"
                className={cn("text-xs", getTypeColor(event.type))}
              >
                {getEventTypeLabel(event.type)}
              </Badge>
              <Badge variant={getStatusVariant(event.status)} className="text-xs">
                {getEventStatusLabel(event.status)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span className="capitalize">{formatDate(event.date)}</span>
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

          {/* Actions */}
          <div className="flex items-center gap-2">
            {event.status === "DRAFT" && (
              <Button
                variant="outline"
                onClick={handlePublish}
                disabled={updateEvent.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Publicar
              </Button>
            )}

            {event.status === "PUBLISHED" && (
              <Button
                variant="outline"
                onClick={handleComplete}
                disabled={updateEvent.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Concluir
              </Button>
            )}

            <div className="relative" ref={menuRef}>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-card shadow-lg z-10">
                  <div className="py-1">
                    <Link href={`/eventos/${event.id}/editar`}>
                      <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        Editar Evento
                      </button>
                    </Link>
                    <button
                      className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir Evento
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Link href={`/eventos/${event.id}/editar`}>
              <Button className="bg-primary hover:bg-primary-hover">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-4 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "ordem" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ordem do Culto</CardTitle>
            </CardHeader>
            <CardContent>
              {event.items && event.items.length > 0 ? (
                <div className="space-y-3">
                  {event.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.durationMinutes && (
                        <Badge variant="outline">{item.durationMinutes} min</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">Nenhuma ordem do culto definida</p>
                  <Button variant="outline">Criar Ordem do Culto</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "escalas" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Escalas do Evento</h2>
              <Link href={`/eventos/${event.id}/escalas`}>
                <Button className="bg-primary hover:bg-primary-hover">
                  <Users className="h-4 w-4 mr-2" />
                  Gerenciar Escalas
                </Button>
              </Link>
            </div>

            {schedulesByMinistry && Object.keys(schedulesByMinistry).length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(schedulesByMinistry).map(([ministryName, schedules]) => (
                  <Card key={ministryName}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{ministryName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {schedules?.map((schedule) => (
                          <div
                            key={schedule.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>{schedule.user.name || schedule.user.email}</span>
                            <Badge
                              variant={
                                schedule.status === "CONFIRMED"
                                  ? "default"
                                  : schedule.status === "DECLINED"
                                  ? "destructive"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {schedule.status === "CONFIRMED"
                                ? "Confirmado"
                                : schedule.status === "DECLINED"
                                ? "Recusado"
                                : "Pendente"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge variant="secondary">{schedules?.length || 0} membros</Badge>
                        <Badge variant="outline" className="text-emerald-500">
                          {schedules?.filter((s) => s.status === "CONFIRMED").length || 0}{" "}
                          confirmados
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">
                  Nenhuma escala definida para este evento
                </p>
                <Link href={`/eventos/${event.id}/escalas`}>
                  <Button variant="outline">Criar Escalas</Button>
                </Link>
              </Card>
            )}
          </div>
        )}

        {activeTab === "midia" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Midia e Recursos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">Nenhum recurso de midia adicionado</p>
                <Button variant="outline">Adicionar Midia</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "setlist" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Setlist</CardTitle>
            </CardHeader>
            <CardContent>
              {event.setlists && event.setlists.length > 0 ? (
                <div className="space-y-3">
                  {event.setlists.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.song.name}</p>
                        {item.song.artist && (
                          <p className="text-sm text-muted-foreground">
                            {item.song.artist}
                          </p>
                        )}
                      </div>
                      {(item.key || item.song.defaultKey) && (
                        <Badge variant="outline">
                          Tom: {item.key || item.song.defaultKey}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">Nenhuma musica adicionada ao setlist</p>
                  <Button variant="outline">Criar Setlist</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
