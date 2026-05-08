"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Loader2,
  Users,
  Trash2,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  useEvent,
  useUpdateEvent,
  useDeleteEvent,
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
import { ChecklistTemplateSelect } from "@/components/events/checklist-template-select";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const eventTypes: EventType[] = [
  "CULTO",
  "SPECIAL",
];

const eventStatuses: { value: EventStatus; label: string }[] = [
  { value: "PUBLISHED", label: "Ativo" },
  { value: "COMPLETED", label: "Concluído" },
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

export default function EditarEventoPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: existingVacancies, isLoading: vacanciesLoading } = useEventVacancies(eventId);
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const createBulkVacancies = useCreateBulkVacancies();
  const deleteVacancy = useDeleteVacancy();

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const [formData, setFormData] = React.useState({
    name: "",
    type: "CULTO" as EventType,
    date: "",
    startTime: "",
    endTime: "",
    status: "PUBLISHED" as EventStatus,
  });

  const [checklistTemplateId, setChecklistTemplateId] = React.useState<string | null>(null);
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
      setChecklistTemplateId(event.checklistTemplateId || null);
      setInitialized(true);
    }
  }, [event, initialized]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    if (!formData.date) {
      newErrors.date = "Data é obrigatória";
    }

    if (!formData.startTime) {
      newErrors.startTime = "Horário de início é obrigatório";
    }

    if (formData.startTime && formData.endTime) {
      if (formData.startTime >= formData.endTime) {
        newErrors.endTime = "Horário de término deve ser depois do início";
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
        checklistTemplateId: checklistTemplateId || undefined,
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

  const handleDelete = async () => {
    if (!event) return;
    try {
      await deleteEvent.mutateAsync(event.id);
      toast({
        title: "Sucesso",
        description: "Evento excluído com sucesso!",
      });
      router.push("/eventos");
    } catch (error) {
      toast({
        title: "Erro ao excluir evento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

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
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <p className="text-destructive mb-4">Evento não encontrado</p>
          <Link href="/eventos">
            <Button variant="outline">Voltar para eventos</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        backHref={`/eventos/${eventId}`}
        backLabel="Voltar"
        title="Editar Evento"
        description="Atualize as informações do evento"
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações Básicas</CardTitle>
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
                  Início
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
                  Término (opcional)
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
              Funções Necessárias
            </CardTitle>
            <CardDescription>
              Selecione as funções que serão necessárias para este evento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VacancyManager
              eventId={eventId}
              onChange={handleVacanciesChange}
            />
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
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Link href={`/eventos/${eventId}`} className="w-full sm:w-auto">
            <Button type="button" variant="outline" className="w-full sm:w-auto">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </div>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Zona de Perigo
            </CardTitle>
            <CardDescription>
              Ações irreversíveis para este evento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <div>
                <p className="font-medium text-foreground">Excluir este evento</p>
                <p className="text-sm text-muted-foreground">
                  Esta ação é permanente e não pode ser desfeita. Todas as escalas e atividades associadas serão removidas.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleteEvent.isPending}
                className="w-full sm:w-auto shrink-0"
              >
                {deleteEvent.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Excluir Evento
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá excluir permanentemente o evento
              <strong className="text-foreground"> &quot;{event?.name}&quot;</strong> e remover todas as escalas
              e atividades associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, excluir evento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
