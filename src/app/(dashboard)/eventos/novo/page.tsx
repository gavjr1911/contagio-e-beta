"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Loader2,
  Users,
  Repeat,
  FileText,
  ChevronDown,
  Check,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCreateEvent,
  CreateEventData,
  getEventTypeLabel,
  getRecurrencePatternLabel,
  EventType,
  RecurrencePattern,
} from "@/hooks/use-events";
import { Switch } from "@/components/ui/switch";
import { useCreateBulkVacancies } from "@/hooks/use-vacancies";
import { VacancyManager, VacancyConfig } from "@/components/events/vacancy-manager";
import { ChecklistTemplateSelect } from "@/components/events/checklist-template-select";
import {
  useTemplates,
  useApplyTemplate,
  EventTemplate,
  TemplateItem,
  TemplateSchedule,
} from "@/hooks/use-templates";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const eventTypes: EventType[] = [
  "CULTO",
  "SPECIAL",
];

const recurrencePatterns: RecurrencePattern[] = [
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
];

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

export default function NovoEventoPage() {
  const router = useRouter();
  const createEvent = useCreateEvent();
  const createBulkVacancies = useCreateBulkVacancies();
  const applyTemplate = useApplyTemplate();

  // Templates
  const { data: templates } = useTemplates();
  const [selectedTemplate, setSelectedTemplate] = React.useState<EventTemplate | null>(null);

  const [formData, setFormData] = React.useState<CreateEventData>({
    name: "",
    type: "CULTO",
    date: "",
    startTime: "",
    endTime: "",
  });

  const [checklistTemplateId, setChecklistTemplateId] = React.useState<string | null>(null);
  const [vacancies, setVacancies] = React.useState<VacancyConfig[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [vacancyKey, setVacancyKey] = React.useState(0);

  // Handle template selection
  const handleSelectTemplate = (template: EventTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      ...formData,
      name: template.name,
      type: template.eventType as EventType,
    });

    // Apply default vacancies from template
    const templateSchedules = (template.defaultSchedules as TemplateSchedule[] | null) || [];
    if (templateSchedules.length > 0) {
      setVacancies(
        templateSchedules.map((s) => ({
          ministryId: s.ministryId,
          positionId: s.positionId,
          quantity: s.quantity,
        }))
      );
      // Force VacancyManager to re-render with new vacancies
      setVacancyKey((prev) => prev + 1);
    }
  };

  const handleClearTemplate = () => {
    setSelectedTemplate(null);
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
      // 1. Criar o evento (com templateId se selecionado)
      const eventData = {
        ...formData,
        templateId: selectedTemplate?.id,
        checklistTemplateId: checklistTemplateId || undefined,
      };
      const newEvent = await createEvent.mutateAsync(eventData);

      // 2. Se template selecionado, aplicar items da ordem do culto
      if (selectedTemplate) {
        const templateItems = (selectedTemplate.defaultItems as TemplateItem[] | null) || [];
        if (templateItems.length > 0) {
          await applyTemplate.mutateAsync({
            templateId: selectedTemplate.id,
            eventId: newEvent.id,
            applyItems: true,
            applyVacancies: false, // Vagas ja serao criadas abaixo
          });
        }
      }

      // 3. Criar as vagas se houver
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
      if (selectedTemplate) {
        parts.push(`template "${selectedTemplate.name}"`);
      }
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
      router.push(`/eventos/${newEvent.slug ?? newEvent.id}`);
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

  const isSubmitting = createEvent.isPending || createBulkVacancies.isPending || applyTemplate.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        backHref="/eventos"
        backLabel="Voltar para eventos"
        title="Novo Evento"
        description="Crie um novo evento ou culto"
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Template Selection Card */}
        {templates && templates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Usar Template
              </CardTitle>
              <CardDescription>
                Selecione um template para preencher automaticamente as informações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="justify-between min-w-[200px]">
                      {selectedTemplate ? (
                        <span className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          {selectedTemplate.name}
                        </span>
                      ) : (
                        "Selecionar template..."
                      )}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[250px]">
                    {templates.map((template) => (
                      <DropdownMenuItem
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className={cn(
                          "flex items-center justify-between",
                          selectedTemplate?.id === template.id && "bg-primary/10"
                        )}
                      >
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getEventTypeLabel(template.eventType as EventType)}
                          </p>
                        </div>
                        {selectedTemplate?.id === template.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {selectedTemplate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearTemplate}
                  >
                    Limpar
                  </Button>
                )}
              </div>

              {selectedTemplate && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="text-muted-foreground">
                    Template selecionado irá aplicar:
                  </p>
                  <ul className="mt-1 space-y-1 text-muted-foreground">
                    {((selectedTemplate.defaultItems as TemplateItem[] | null) || []).length > 0 && (
                      <li className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-primary" />
                        {((selectedTemplate.defaultItems as TemplateItem[] | null) || []).length} itens na ordem do culto
                      </li>
                    )}
                    {((selectedTemplate.defaultSchedules as TemplateSchedule[] | null) || []).length > 0 && (
                      <li className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-primary" />
                        {((selectedTemplate.defaultSchedules as TemplateSchedule[] | null) || []).length} funcoes/vagas
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
              Funcoes Necessarias
            </CardTitle>
            <CardDescription>
              Selecione as funcoes que serao necessarias para este evento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VacancyManager key={vacancyKey} onChange={handleVacanciesChange} />
          </CardContent>
        </Card>

        {/* Checklist Template Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Checklist
            </CardTitle>
            <CardDescription>
              Selecione um template de checklist para acompanhamento do evento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChecklistTemplateSelect
              value={checklistTemplateId}
              onChange={setChecklistTemplateId}
              disabled={isSubmitting}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          <Link href="/eventos" className="sm:order-1">
            <Button type="button" variant="outline" className="w-full sm:w-auto">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto sm:order-2"
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
