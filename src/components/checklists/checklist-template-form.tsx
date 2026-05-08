"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  createChecklistTemplateSchema,
  type CreateChecklistTemplateInput,
} from "@/lib/validations/checklist"
import {
  useCreateChecklistTemplate,
  useUpdateChecklistTemplate,
  type ChecklistTemplate,
} from "@/hooks/use-checklist-templates"

interface ChecklistTemplateFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: ChecklistTemplate | null
}

export function ChecklistTemplateForm({
  open,
  onOpenChange,
  template,
}: ChecklistTemplateFormProps) {
  const isEditing = !!template
  const createMutation = useCreateChecklistTemplate()
  const updateMutation = useUpdateChecklistTemplate()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateChecklistTemplateInput>({
    resolver: zodResolver(createChecklistTemplateSchema),
    defaultValues: {
      name: template?.name ?? "",
      description: template?.description ?? "",
    },
  })

  React.useEffect(() => {
    if (open) {
      reset({
        name: template?.name ?? "",
        description: template?.description ?? "",
      })
    }
  }, [open, template, reset])

  const onSubmit = async (data: CreateChecklistTemplateInput) => {
    if (isEditing && template) {
      await updateMutation.mutateAsync({
        id: template.id,
        data,
      })
    } else {
      await createMutation.mutateAsync(data)
    }
    onOpenChange(false)
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Template" : "Novo Template de Checklist"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize o nome e a descrição deste template de checklist."
              : "Crie um template reutilizável de checklist para seus eventos."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: Checklist Culto Domingo"
              {...register("name")}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Descreva o propósito deste checklist..."
              rows={3}
              {...register("description")}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
