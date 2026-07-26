"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import {
  ClipboardCheck,
  Plus,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Pencil,
  Trash2,
  MoreHorizontal,
  Calendar,
} from "lucide-react"
import { useCanView, useCanEdit, usePermissions } from "@/hooks/use-permissions"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/layout/page-header"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ChecklistTemplateForm } from "@/components/checklists/checklist-template-form"
import { TemplateItemsEditor } from "@/components/checklists/template-items-editor"
import {
  useChecklistTemplates,
  useDeleteChecklistTemplate,
  type ChecklistTemplate,
} from "@/hooks/use-checklist-templates"

export default function ChecklistsPage() {
  const { status } = useSession()
  const { isLoading: permsLoading } = usePermissions()
  const canView = useCanView("checklists")
  const canManage = useCanEdit("checklists")

  const { data, isLoading, error } = useChecklistTemplates()
  const deleteMutation = useDeleteChecklistTemplate()

  const [formOpen, setFormOpen] = React.useState(false)
  const [editingTemplate, setEditingTemplate] = React.useState<ChecklistTemplate | null>(null)
  const [expandedTemplateId, setExpandedTemplateId] = React.useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [templateToDelete, setTemplateToDelete] = React.useState<ChecklistTemplate | null>(null)

  const handleEdit = (template: ChecklistTemplate) => {
    setEditingTemplate(template)
    setFormOpen(true)
  }

  const handleDelete = (template: ChecklistTemplate) => {
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!templateToDelete) return
    await deleteMutation.mutateAsync(templateToDelete.id)
    setDeleteDialogOpen(false)
    setTemplateToDelete(null)
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditingTemplate(null)
    }
  }

  const toggleExpand = (templateId: string) => {
    setExpandedTemplateId((prev) => (prev === templateId ? null : templateId))
  }

  if (status === "loading" || permsLoading || isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md text-center space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-amber-500/10">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Acesso negado</h2>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar os templates de checklist.
            Fale com um administrador se precisar de acesso.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-destructive">Erro ao carregar templates</p>
        </div>
      </div>
    )
  }

  const templates = data?.items || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={ClipboardCheck}
        iconClassName="bg-primary/10 rounded-lg"
        title="Templates de Checklist"
        description="Gerencie os templates de checklist para eventos"
        actions={
          canManage ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          ) : undefined
        }
      />

      {/* Lista de Templates */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground mb-2">
                Nenhum template criado
              </p>
              <p className="mb-4">
                {canManage
                  ? "Crie templates de checklist para usar nos eventos."
                  : "Nenhum template disponível no momento."}
              </p>
              {canManage && (
                <Button onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Template
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={
                canManage
                  ? "cursor-pointer hover:border-primary/50 transition-colors"
                  : "transition-colors"
              }
              onClick={canManage ? () => toggleExpand(template.id) : undefined}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">
                      {template.name}
                    </CardTitle>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Ações do template"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(template)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(template)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <ClipboardCheck className="h-4 w-4" />
                    <span>{template.items.length} itens</span>
                  </div>
                  {template._count?.events !== undefined && template._count.events > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>{template._count.events} eventos</span>
                    </div>
                  )}
                </div>

                {/* Lista de itens preview */}
                {template.items.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <ul className="space-y-1">
                      {template.items.slice(0, 3).map((item) => (
                        <li
                          key={item.id}
                          className="text-sm text-muted-foreground truncate"
                        >
                          • {item.title}
                        </li>
                      ))}
                      {template.items.length > 3 && (
                        <li className="text-sm text-muted-foreground">
                          +{template.items.length - 3} mais...
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor expandido */}
      {expandedTemplateId && (
        <div className="mt-6">
          {(() => {
            const template = templates.find((t) => t.id === expandedTemplateId)
            if (!template) return null
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    Editando: {template.name}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedTemplateId(null)}
                  >
                    Fechar
                  </Button>
                </div>
                <TemplateItemsEditor
                  templateId={template.id}
                  items={template.items}
                />
              </div>
            )
          })()}
        </div>
      )}

      {/* Form Dialog */}
      <ChecklistTemplateForm
        open={formOpen}
        onOpenChange={handleFormClose}
        template={editingTemplate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template{" "}
              <strong>"{templateToDelete?.name}"</strong>?
              {templateToDelete?._count?.events !== undefined &&
                templateToDelete._count.events > 0 && (
                  <span className="block mt-2 text-amber-600">
                    Este template está associado a {templateToDelete._count.events}{" "}
                    evento(s). A associação será removida, mas os checklists já
                    iniciados não serão afetados.
                  </span>
                )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
