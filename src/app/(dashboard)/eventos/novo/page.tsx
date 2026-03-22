"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Loader2,
  Users,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  useCreateEvent,
  CreateEventData,
  getEventTypeLabel,
  getRecurrencePatternLabel,
  EventType,
  RecurrencePattern,
} from "@/hooks/use-events";
import { Switch } from "@/components/ui/switch";
import { useMinistries } from "@/hooks/use-ministries";
import { useCreateBulkVacancies } from "@/hooks/use-vacancies";
import { VacancyManager, VacancyConfig } from "@/components/events/vacancy-manager";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const eventTypes: EventType[] = [
  "SUNDAY_MORNING",
  "SUNDAY_EVENING",
  "SPECIAL",
];

const recurrencePatterns: RecurrencePattern[] = [
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
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

export default function NovoEventoPage() {
  const router = useRouter();
  const createEvent = useCreateEvent();
  const createBulkVacancies = useCreateBulkVacancies();
  const { data: ministries, isLoading: ministriesLoading } = useMinistries();

  const [formData, setFormData] = React.useState<CreateEventData>({
    name: "",
    type: "SUNDAY_MORNING",
    date: "",
    startTime: "",
    endTime: "",
  });

  const [vacancies, setVacancies] = React.useState<VacancyConfig[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

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

    // Recurrence validation
    if (formData.isRecurring) {
      if (!formData.recurrencePattern) {
        newErrors.recurrencePattern = "Padrao de recorrencia e obrigatorio";
      }
      if (!formData.recurrenceEndDate) {
        newErrors.recurrenceEndDate = "Data final e obrigatoria";
      } else if (formData.date && formData.recurrenceEndDate <= formData.date) {
        newErrors.recurrenceEndDate = "Data final deve ser depois da data inicial";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      // 1. Criar o evento
      const newEvent = await createEvent.mutateAsync(formData);

      // 2. Criar as vagas se houver
      if (vacancies.length > 0) {
        await createBulkVacancies.mutateAsync({
          eventId: newEvent.id,
          vacancies: vacancies.map((v) => ({
            ministryId: v.ministryId,
            positionId: v.positionId,
            quantity: v.quantity,
          })),
        });
      }

      // Build success message
      const parts: string[] = [];
      if (vacancies.length > 0) {
        parts.push(`${vacancies.reduce((sum, v) => sum + v.quantity, 0)} vagas`);
      }
      const childEventsCount = (newEvent as { childEventsCreated?: number }).childEventsCreated;
      if (childEventsCount && childEventsCount > 0) {
        parts.push(`${childEventsCount} eventos recorrentes`);
      }

      toast({
        title: "Sucesso",
        description: parts.length > 0
          ? `Evento criado com ${parts.join(" e ")}!`
          : "Evento criado!",
      });
      router.push(`/eventos/${newEvent.id}`);
    } catch (error) {
      console.error("Erro ao criar evento:", error);
      toast({
        title: "Erro ao criar evento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleVacanciesChange = React.useCallback((newVacancies: VacancyConfig[]) => {
    setVacancies(newVacancies);
  }, []);

  const isSubmitting = createEvent.isPending || createBulkVacancies.isPending;

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
                  value={formData.endTime || ""}
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
          </CardContent>
        </Card>

        {/* Recurrence Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Evento Recorrente
            </CardTitle>
            <CardDescription>
              Configure se este evento se repete automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle Recurrence */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isRecurring">Ativar recorrencia</Label>
                <p className="text-sm text-muted-foreground">
                  O evento sera criado automaticamente nas datas seguintes
                </p>
              </div>
              <Switch
                id="isRecurring"
                checked={formData.isRecurring || false}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    isRecurring: checked,
                    recurrencePattern: checked ? "WEEKLY" : undefined,
                    recurrenceEndDate: checked ? "" : undefined,
                  })
                }
              />
            </div>

            {/* Recurrence Options (shown when enabled) */}
            {formData.isRecurring && (
              <div className="space-y-4 pt-4 border-t border-border">
                {/* Pattern Selection */}
                <div className="space-y-2">
                  <Label>Padrao de Repeticao</Label>
                  <div className="flex flex-wrap gap-2">
                    {recurrencePatterns.map((pattern) => (
                      <button
                        key={pattern}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, recurrencePattern: pattern })
                        }
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                          formData.recurrencePattern === pattern
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-background border-border hover:bg-muted"
                        )}
                      >
                        {getRecurrencePatternLabel(pattern)}
                      </button>
                    ))}
                  </div>
                  {errors.recurrencePattern && (
                    <p className="text-xs text-destructive">
                      {errors.recurrencePattern}
                    </p>
                  )}
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label htmlFor="recurrenceEndDate">
                    <CalendarDays className="h-4 w-4 inline mr-1" />
                    Repetir ate
                  </Label>
                  <Input
                    id="recurrenceEndDate"
                    type="date"
                    value={formData.recurrenceEndDate || ""}
                    min={formData.date || undefined}
                    onChange={(e) =>
                      setFormData({ ...formData, recurrenceEndDate: e.target.value })
                    }
                    className={cn(
                      "max-w-xs",
                      errors.recurrenceEndDate && "border-destructive"
                    )}
                  />
                  {errors.recurrenceEndDate && (
                    <p className="text-xs text-destructive">
                      {errors.recurrenceEndDate}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Os eventos serao criados ate esta data, de acordo com o padrao selecionado
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vacancies Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Vagas por Ministerio
            </CardTitle>
            <CardDescription>
              Defina quantas pessoas de cada funcao serao necessarias para este evento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ministriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <VacancyManager
                ministries={ministries || []}
                onChange={handleVacanciesChange}
              />
            )}
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
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary-hover"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              "Criar Evento"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
