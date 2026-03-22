"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  useEvent,
  useUpdateEvent,
  getEventTypeLabel,
  EventType,
  EventStatus,
  formatDateFromDate,
  formatTimeFromDate,
} from "@/hooks/use-events";
import {
  useEventVacancies,
  useCreateBulkVacancies,
  useDeleteVacancy,
} from "@/hooks/use-vacancies";
import { VacancyManager, VacancyConfig } from "@/components/events/vacancy-manager";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const eventTypes: EventType[] = [
  "SUNDAY_MORNING",
  "SUNDAY_EVENING",
  "SPECIAL",
];

const eventStatuses: { value: EventStatus; label: string }[] = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "PUBLISHED", label: "Publicado" },
  { value: "COMPLETED", label: "Concluido" },
];

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

export default function EditarEventoPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: existingVacancies, isLoading: vacanciesLoading } = useEventVacancies(eventId);
  const updateEvent = useUpdateEvent();
  const createBulkVacancies = useCreateBulkVacancies();
  const deleteVacancy = useDeleteVacancy();

  const [formData, setFormData] = React.useState({
    name: "",
    type: "SUNDAY_MORNING" as EventType,
    date: "",
    startTime: "",
    endTime: "",
    status: "DRAFT" as EventStatus,
  });

  const [vacancies, setVacancies] = React.useState<VacancyConfig[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [initialized, setInitialized] = React.useState(false);

  // Initialize form with event data
  React.useEffect(() => {
    if (event && !initialized) {
      setFormData({
        name: event.name,
        type: event.type,
        date: formatDateFromDate(event.date),
        startTime: formatTimeFromDate(event.startTime),
        endTime: event.endTime ? formatTimeFromDate(event.endTime) : "",
        status: event.status,
      });
      setInitialized(true);
    }
  }, [event, initialized]);

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
      // 1. Update event basic data
      await updateEvent.mutateAsync({
        id: eventId,
        name: formData.name,
        type: formData.type,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime || undefined,
        status: formData.status,
      });

      // 2. Handle vacancies changes
      // Get IDs of existing vacancies
      const existingIds = existingVacancies?.map((v) => v.id) || [];
      const currentIds = vacancies.filter((v) => v.id).map((v) => v.id!);

      // Delete removed vacancies
      const toDelete = existingIds.filter((id) => !currentIds.includes(id));
      for (const vacancyId of toDelete) {
        await deleteVacancy.mutateAsync({ eventId, vacancyId });
      }

      // Add new vacancies
      const newVacancies = vacancies.filter((v) => !v.id);
      if (newVacancies.length > 0) {
        await createBulkVacancies.mutateAsync({
          eventId,
          vacancies: newVacancies.map((v) => ({
            ministryId: v.ministryId,
            positionId: v.positionId,
            quantity: v.quantity,
          })),
        });
      }

      toast({
        title: "Sucesso",
        description: "Evento atualizado com sucesso!",
      });
      router.push(`/eventos/${eventId}`);
    } catch (error) {
      console.error("Erro ao atualizar evento:", error);
      toast({
        title: "Erro ao atualizar evento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleVacanciesChange = React.useCallback((newVacancies: VacancyConfig[]) => {
    setVacancies(newVacancies);
  }, []);

  const isSubmitting = updateEvent.isPending || createBulkVacancies.isPending || deleteVacancy.isPending;
  const isLoading = eventLoading || vacanciesLoading;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
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

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/eventos/${eventId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-display">Editar Evento</h1>
          <p className="text-muted-foreground">
            Atualize as informacoes do evento
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
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
                  Termino (opcional)
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

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-2">
                {eventStatuses.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: status.value })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                      formData.status === status.value
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-background border-border hover:bg-muted"
                    )}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vacancies Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Funcoes Necessarias
            </CardTitle>
            <CardDescription>
              Selecione as funcoes que serao necessarias para este evento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VacancyManager
              eventId={eventId}
              onChange={handleVacanciesChange}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href={`/eventos/${eventId}`}>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary-hover"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alteracoes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
