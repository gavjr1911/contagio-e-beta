"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateTemplate, CreateTemplateInput, TemplateItem } from "@/hooks/use-templates";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EventItemData {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  durationMinutes?: number | null;
  requiresMedia?: boolean;
  bibleReference?: string | null;
  notes?: string | null;
  isPublic?: boolean;
  expectedSongCount?: number | null;
}

interface VacancyData {
  ministryId: string;
  positionId: string;
  quantity: number;
}

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  eventType: string;
  items?: EventItemData[];
  vacancies?: VacancyData[];
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  eventName,
  eventType,
  items = [],
  vacancies = [],
}: SaveAsTemplateDialogProps) {
  const router = useRouter();
  const createTemplate = useCreateTemplate();

  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    includeItems: true,
    includeVacancies: true,
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData({
        name: `Template - ${eventName}`,
        description: "",
        includeItems: true,
        includeVacancies: true,
      });
      setErrors({});
    }
  }, [open, eventName]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      // Prepare template items
      const templateItems: TemplateItem[] = formData.includeItems
        ? items.map((item) => ({
            type: item.type as TemplateItem["type"],
            title: item.title,
            description: item.description || undefined,
            durationMinutes: item.durationMinutes || undefined,
            requiresMedia: item.requiresMedia || false,
            bibleReference: item.bibleReference || undefined,
            notes: item.notes || undefined,
            isPublic: item.isPublic ?? true,
            expectedSongCount: item.expectedSongCount || undefined,
          }))
        : [];

      // Prepare template schedules
      const templateSchedules = formData.includeVacancies
        ? vacancies.map((v) => ({
            ministryId: v.ministryId,
            positionId: v.positionId,
            quantity: v.quantity,
          }))
        : [];

      const data: CreateTemplateInput = {
        name: formData.name,
        description: formData.description || undefined,
        eventType: eventType as "CULTO" | "SPECIAL",
        defaultItems: templateItems.length > 0 ? templateItems : undefined,
        defaultSchedules: templateSchedules.length > 0 ? templateSchedules : undefined,
      };

      const template = await createTemplate.mutateAsync(data);

      toast({
        title: "Sucesso",
        description: `Template "${template.name}" criado com sucesso!`,
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro ao criar template",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const isSubmitting = createTemplate.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Salvar como Template</DialogTitle>
          <DialogDescription>
            Crie um template reutilizável a partir deste evento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Nome do Template</Label>
            <Input
              id="template-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Culto de Domingo"
              className={cn(errors.name && "border-destructive")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="template-description">Descrição (opcional)</Label>
            <Textarea
              id="template-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o template..."
              rows={2}
            />
          </div>

          {/* Include Options */}
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium">Incluir no template:</p>

            {items.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-items" className="cursor-pointer">
                    Ordem do culto
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {items.length} {items.length === 1 ? "item" : "itens"}
                  </p>
                </div>
                <Switch
                  id="include-items"
                  checked={formData.includeItems}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, includeItems: checked })
                  }
                />
              </div>
            )}

            {vacancies.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-vacancies" className="cursor-pointer">
                    Funções/Vagas
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {vacancies.length} {vacancies.length === 1 ? "função" : "funções"}
                  </p>
                </div>
                <Switch
                  id="include-vacancies"
                  checked={formData.includeVacancies}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, includeVacancies: checked })
                  }
                />
              </div>
            )}

            {items.length === 0 && vacancies.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Este evento não possui itens ou funções para incluir no template.
              </p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Criar Template"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
