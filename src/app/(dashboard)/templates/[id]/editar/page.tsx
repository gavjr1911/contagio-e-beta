"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  FileText,
  Users,
  Clock,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { VacancyManager, VacancyConfig } from "@/components/events/vacancy-manager";
import {
  useTemplate,
  useUpdateTemplate,
  UpdateTemplateInput,
  TemplateItem,
  TemplateSchedule,
  getEventTypeLabel,
} from "@/hooks/use-templates";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const EVENT_TYPES = ["CULTO", "SPECIAL"] as const;

const ITEM_TYPES = [
  { value: "WELCOME", label: "Boas-vindas" },
  { value: "WORSHIP", label: "Louvor" },
  { value: "PRAYER", label: "Oração" },
  { value: "READING", label: "Leitura Bíblica" },
  { value: "ANNOUNCEMENTS", label: "Avisos" },
  { value: "OFFERING", label: "Dízimos e Ofertas" },
  { value: "PREACHING", label: "Pregação" },
  { value: "COMMUNION", label: "Santa Ceia" },
  { value: "VIDEO", label: "Vídeo/Mídia" },
  { value: "SPECIAL", label: "Participação Especial" },
  { value: "TRANSITION", label: "Transição" },
  { value: "OTHER", label: "Outros" },
] as const;

interface FormItem extends TemplateItem {
  id: string;
}

export default function EditarTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const { data: template, isLoading: templateLoading } = useTemplate(templateId);
  const updateTemplate = useUpdateTemplate();

  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    eventType: "CULTO" as "CULTO" | "SPECIAL",
    duration: "",
  });

  const [items, setItems] = React.useState<FormItem[]>([]);
  const [vacancies, setVacancies] = React.useState<VacancyConfig[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [initialized, setInitialized] = React.useState(false);

  // Initialize form with template data
  React.useEffect(() => {
    if (template && !initialized) {
      setFormData({
        name: template.name,
        description: template.description || "",
        eventType: template.eventType as "CULTO" | "SPECIAL",
        duration: template.duration?.toString() || "",
      });

      // Initialize items
      const templateItems = (template.defaultItems as TemplateItem[] | null) || [];
      setItems(
        templateItems.map((item) => ({
          ...item,
          id: Math.random().toString(36).substring(2, 9),
        }))
      );

      // Initialize vacancies
      const templateSchedules = (template.defaultSchedules as TemplateSchedule[] | null) || [];
      setVacancies(
        templateSchedules.map((s) => ({
          ministryId: s.ministryId,
          positionId: s.positionId,
          quantity: s.quantity,
        }))
      );

      setInitialized(true);
    }
  }, [template, initialized]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: generateId(),
        type: "OTHER",
        title: "",
        durationMinutes: undefined,
        requiresMedia: false,
        isPublic: true,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<FormItem>) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    // Validate items
    items.forEach((item, index) => {
      if (!item.title.trim()) {
        newErrors[`item_${index}_title`] = "Título é obrigatório";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      // Prepare items without the local id
      const templateItems: TemplateItem[] = items.map(({ id, ...item }) => ({
        ...item,
        type: item.type as TemplateItem["type"],
      }));

      const data: UpdateTemplateInput & { id: string } = {
        id: templateId,
        name: formData.name,
        description: formData.description || null,
        eventType: formData.eventType,
        duration: formData.duration ? parseInt(formData.duration) : null,
        defaultItems: templateItems.length > 0 ? templateItems : null,
        defaultSchedules: vacancies.length > 0 ? vacancies.map((v) => ({
          ministryId: v.ministryId,
          positionId: v.positionId,
          quantity: v.quantity,
        })) : null,
      };

      await updateTemplate.mutateAsync(data);

      toast({
        title: "Sucesso",
        description: "Template atualizado com sucesso!",
      });

      router.push("/templates");
    } catch (error) {
      toast({
        title: "Erro ao atualizar template",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleVacanciesChange = React.useCallback((newVacancies: VacancyConfig[]) => {
    setVacancies(newVacancies);
  }, []);

  const isSubmitting = updateTemplate.isPending;

  if (templateLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <p className="text-destructive mb-4">Template não encontrado</p>
          <Link href="/templates">
            <Button variant="outline">Voltar para templates</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        backHref="/templates"
        backLabel="Voltar"
        title="Editar Template"
        description="Modifique o modelo de evento"
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template</Label>
              <Input
                id="name"
                placeholder="Ex: Culto de Domingo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={cn(errors.name && "border-destructive")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descreva o template..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Event Type and Duration */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de Evento</Label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, eventType: type })}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
                        formData.eventType === type
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-background border-border hover:bg-muted"
                      )}
                    >
                      {getEventTypeLabel(type)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Duração (minutos)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="Ex: 90"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  min={1}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Ordem do Culto
                </CardTitle>
                <CardDescription>
                  Defina os itens padrão da ordem do culto
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Nenhum item adicionado</p>
                <p className="text-sm">Clique em &quot;Adicionar Item&quot; para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-center gap-2 pt-2 text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                      <span className="text-sm font-medium w-5">{index + 1}</span>
                    </div>

                    <div className="flex-1 grid gap-3 sm:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select
                          value={item.type}
                          onValueChange={(value) => updateItem(item.id, { type: value as TemplateItem["type"] })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ITEM_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Título</Label>
                        <Input
                          value={item.title}
                          onChange={(e) => updateItem(item.id, { title: e.target.value })}
                          placeholder="Ex: Louvor de Abertura"
                          className={cn(
                            "h-9",
                            errors[`item_${index}_title`] && "border-destructive"
                          )}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Duração (min)</Label>
                        <Input
                          type="number"
                          value={item.durationMinutes || ""}
                          onChange={(e) =>
                            updateItem(item.id, {
                              durationMinutes: e.target.value ? parseInt(e.target.value) : undefined,
                            })
                          }
                          placeholder="10"
                          className="h-9"
                          min={1}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          id={`media-${item.id}`}
                          checked={item.requiresMedia || false}
                          onCheckedChange={(checked) =>
                            updateItem(item.id, { requiresMedia: checked })
                          }
                        />
                        <Label htmlFor={`media-${item.id}`} className="text-xs text-muted-foreground">
                          Mídia
                        </Label>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                        aria-label="Remover item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vacancies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Funções Necessárias
            </CardTitle>
            <CardDescription>
              Selecione as funções que serão criadas automaticamente nos eventos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VacancyManager onChange={handleVacanciesChange} />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Link href="/templates" className="w-full sm:w-auto">
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
      </form>
    </div>
  );
}
