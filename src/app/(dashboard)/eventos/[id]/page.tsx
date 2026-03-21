"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  Copy,
  Trash2,
  MoreHorizontal,
  Users,
  Music,
  Monitor,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useEvent,
  useDeleteEvent,
  useDuplicateEvent,
  EventStatus,
  EventType,
  getEventTypeLabel,
  getEventStatusLabel,
} from "@/hooks/use-events";
import { cn } from "@/lib/utils";

type TabType = "ordem" | "escalas" | "midia" | "setlist";

function getStatusVariant(
  status: EventStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "confirmado":
    case "concluido":
      return "default";
    case "agendado":
    case "em_andamento":
      return "secondary";
    case "cancelado":
      return "destructive";
    case "rascunho":
    default:
      return "outline";
  }
}

function getTypeColor(type: EventType): string {
  switch (type) {
    case "culto":
      return "bg-beta-terracotta/10 text-beta-terracotta border-beta-terracotta/20";
    case "ensaio":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "reuniao":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "evento_especial":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "conferencia":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(time: string): string {
  return time.substring(0, 5);
}

export default function EventoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const { data: event, isLoading, error } = useEvent(eventId);
  const deleteEvent = useDeleteEvent();
  const duplicateEvent = useDuplicateEvent();

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
      await deleteEvent.mutateAsync(event.id);
      router.push("/eventos");
    }
  };

  const handleDuplicate = async () => {
    if (!event) return;
    const duplicated = await duplicateEvent.mutateAsync(event.id);
    if (duplicated) {
      router.push(`/eventos/${duplicated.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-beta-terracotta" />
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
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleDuplicate}>
              <Copy className="h-4 w-4" />
            </Button>

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

            <Button className="bg-beta-terracotta hover:bg-beta-terracotta/90">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
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
                  ? "border-beta-terracotta text-beta-terracotta"
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
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">Nenhuma ordem do culto definida</p>
                <Button variant="outline">Criar Ordem do Culto</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "escalas" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Escalas do Evento</h2>
              <Link href={`/eventos/${event.id}/escalas`}>
                <Button className="bg-beta-terracotta hover:bg-beta-terracotta/90">
                  <Users className="h-4 w-4 mr-2" />
                  Gerenciar Escalas
                </Button>
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Sample ministry cards */}
              {["Louvor", "Som e Midia", "Recepcao"].map((ministry) => (
                <Card key={ministry}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{ministry}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">3 membros</Badge>
                      <Badge variant="outline" className="text-emerald-500">
                        2 confirmados
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
              <div className="text-center py-12 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">Nenhuma musica adicionada ao setlist</p>
                <Button variant="outline">Criar Setlist</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
