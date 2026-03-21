"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  FileText,
  Copy,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useCreateEvent,
  useEvents,
  EventType,
  CreateEventData,
  getEventTypeLabel,
} from "@/hooks/use-events";
import { cn } from "@/lib/utils";

const eventTypes: EventType[] = [
  "culto",
  "reuniao",
  "ensaio",
  "evento_especial",
  "conferencia",
];

interface Template {
  id: string;
  name: string;
  type: EventType;
  description: string;
}

const mockTemplates: Template[] = [
  {
    id: "t1",
    name: "Culto de Domingo",
    type: "culto",
    description: "Template padrao para cultos de domingo",
  },
  {
    id: "t2",
    name: "Reuniao de Celula",
    type: "reuniao",
    description: "Template para reunioes de celula",
  },
  {
    id: "t3",
    name: "Ensaio Louvor",
    type: "ensaio",
    description: "Template para ensaios do ministerio de louvor",
  },
];

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

export default function NovoEventoPage() {
  const router = useRouter();
  const createEvent = useCreateEvent();
  const { data: previousEvents } = useEvents();

  const [formData, setFormData] = React.useState<CreateEventData>({
    name: "",
    type: "culto",
    date: "",
    startTime: "",
    endTime: "",
    description: "",
  });

  const [useTemplate, setUseTemplate] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>("");
  const [copyFromEvent, setCopyFromEvent] = React.useState(false);
  const [selectedEventToCopy, setSelectedEventToCopy] =
    React.useState<string>("");

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template.id);
    setFormData({
      ...formData,
      name: template.name,
      type: template.type,
      templateId: template.id,
    });
    setCopyFromEvent(false);
    setSelectedEventToCopy("");
  };

  const handleCopyFromEvent = (eventId: string) => {
    const event = previousEvents?.find((e) => e.id === eventId);
    if (event) {
      setSelectedEventToCopy(eventId);
      setFormData({
        ...formData,
        name: `${event.name} (Copia)`,
        type: event.type,
        startTime: event.startTime,
        endTime: event.endTime,
        copyFromEventId: eventId,
      });
      setUseTemplate(false);
      setSelectedTemplate("");
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome e obrigatorio";
    }

    if (!formData.date) {
      newErrors.date = "Data e obrigatoria";
    }

    if (!formData.startTime) {
      newErrors.startTime = "Horario de inicio e obrigatorio";
    }

    if (!formData.endTime) {
      newErrors.endTime = "Horario de termino e obrigatorio";
    }

    if (formData.startTime && formData.endTime) {
      if (formData.startTime >= formData.endTime) {
        newErrors.endTime = "Horario de termino deve ser depois do inicio";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const newEvent = await createEvent.mutateAsync(formData);
      router.push(`/eventos/${newEvent.id}`);
    } catch (error) {
      console.error("Erro ao criar evento:", error);
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/eventos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-display">Novo Evento</h1>
          <p className="text-muted-foreground">
            Crie um novo evento ou culto
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          {/* Main Form */}
          <div className="space-y-6">
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informacoes Basicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Event Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Evento</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Culto de Domingo"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={cn(errors.name && "border-destructive")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>

                {/* Event Type */}
                <div className="space-y-2">
                  <Label>Tipo de Evento</Label>
                  <div className="flex flex-wrap gap-2">
                    {eventTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, type })}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                          formData.type === type
                            ? getTypeColor(type)
                            : "bg-background border-border hover:bg-muted"
                        )}
                      >
                        {getEventTypeLabel(type)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="date">
                      <CalendarDays className="h-4 w-4 inline mr-1" />
                      Data
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className={cn(errors.date && "border-destructive")}
                    />
                    {errors.date && (
                      <p className="text-xs text-destructive">{errors.date}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startTime">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Inicio
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startTime: e.target.value })
                      }
                      className={cn(errors.startTime && "border-destructive")}
                    />
                    {errors.startTime && (
                      <p className="text-xs text-destructive">
                        {errors.startTime}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Termino
                    </Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData({ ...formData, endTime: e.target.value })
                      }
                      className={cn(errors.endTime && "border-destructive")}
                    />
                    {errors.endTime && (
                      <p className="text-xs text-destructive">
                        {errors.endTime}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Descricao (opcional)
                  </Label>
                  <textarea
                    id="description"
                    placeholder="Adicione uma descricao ou observacoes..."
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4">
              <Link href="/eventos">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={createEvent.isPending}
                className="bg-beta-terracotta hover:bg-beta-terracotta/90"
              >
                {createEvent.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Evento"
                )}
              </Button>
            </div>
          </div>

          {/* Sidebar - Templates and Copy */}
          <div className="space-y-6">
            {/* Templates */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Usar Template</CardTitle>
                  <input
                    type="checkbox"
                    checked={useTemplate}
                    onChange={(e) => {
                      setUseTemplate(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedTemplate("");
                        setFormData({
                          ...formData,
                          templateId: undefined,
                        });
                      }
                      setCopyFromEvent(false);
                    }}
                    className="rounded border-border"
                  />
                </div>
              </CardHeader>
              {useTemplate && (
                <CardContent className="space-y-3 pt-0">
                  {mockTemplates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleTemplateSelect(template)}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all",
                        selectedTemplate === template.id
                          ? "border-beta-terracotta bg-beta-terracotta/10"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {template.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", getTypeColor(template.type))}
                        >
                          {getEventTypeLabel(template.type)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {template.description}
                      </p>
                    </button>
                  ))}
                </CardContent>
              )}
            </Card>

            {/* Copy from Previous */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    Copiar de Evento
                  </CardTitle>
                  <input
                    type="checkbox"
                    checked={copyFromEvent}
                    onChange={(e) => {
                      setCopyFromEvent(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedEventToCopy("");
                        setFormData({
                          ...formData,
                          copyFromEventId: undefined,
                        });
                      }
                      setUseTemplate(false);
                    }}
                    className="rounded border-border"
                  />
                </div>
              </CardHeader>
              {copyFromEvent && (
                <CardContent className="space-y-3 pt-0">
                  {previousEvents && previousEvents.length > 0 ? (
                    previousEvents.slice(0, 5).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleCopyFromEvent(event.id)}
                        className={cn(
                          "w-full p-3 rounded-lg border text-left transition-all",
                          selectedEventToCopy === event.id
                            ? "border-beta-terracotta bg-beta-terracotta/10"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate">
                            {event.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.date + "T00:00:00").toLocaleDateString(
                            "pt-BR",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum evento anterior encontrado
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
