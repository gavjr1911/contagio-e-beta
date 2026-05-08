"use client"

import * as React from "react"
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Loader2,
  PlayCircle,
  Clock,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  useEventChecklist,
  useInitEventChecklist,
  useToggleChecklistItem,
  useAddChecklistItem,
  useDeleteChecklistItem,
  type EventChecklistItem,
} from "@/hooks/use-event-checklist"
import { cn } from "@/lib/utils"

interface EventChecklistTabProps {
  eventId: string
}

export function EventChecklistTab({ eventId }: EventChecklistTabProps) {
  const { data, isLoading, error } = useEventChecklist(eventId)
  const [newItemTitle, setNewItemTitle] = React.useState("")

  const initMutation = useInitEventChecklist()
  const toggleMutation = useToggleChecklistItem()
  const addMutation = useAddChecklistItem()
  const deleteMutation = useDeleteChecklistItem()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive">Erro ao carregar checklist</p>
      </div>
    )
  }

  if (!data) return null

  const { items, template, hasInstantiatedItems, hasTemplate, canEdit, stats } =
    data

  // Se nao tem template associado
  if (!hasTemplate && !hasInstantiatedItems) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum checklist</h3>
        <p className="text-muted-foreground mb-4">
          Este evento não tem um checklist associado.
        </p>
        <p className="text-sm text-muted-foreground">
          Associe um template de checklist ao editar o evento.
        </p>
      </div>
    )
  }

  // Se tem template mas ainda nao iniciou
  if (hasTemplate && !hasInstantiatedItems) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              Iniciar Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Este evento usa o template{" "}
              <span className="font-semibold">{template?.name}</span> com{" "}
              {template?.items.length} itens.
            </p>

            {/* Preview dos itens do template */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-sm font-medium mb-3">Itens do template:</p>
              <ul className="space-y-2">
                {template?.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Circle className="h-4 w-4" />
                    {item.title}
                  </li>
                ))}
              </ul>
            </div>

            {canEdit ? (
              <Button
                onClick={() => initMutation.mutate({ eventId })}
                disabled={initMutation.isPending}
                className="w-full"
              >
                {initMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="mr-2 h-4 w-4" />
                )}
                Iniciar Checklist
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Apenas membros do Cerimonial podem iniciar o checklist.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Checklist em andamento
  const handleToggle = (item: EventChecklistItem) => {
    if (!canEdit) return
    toggleMutation.mutate({
      eventId,
      itemId: item.id,
      completed: !item.completed,
    })
  }

  const handleAddItem = async () => {
    if (!newItemTitle.trim() || !canEdit) return
    await addMutation.mutateAsync({
      eventId,
      data: { title: newItemTitle.trim() },
    })
    setNewItemTitle("")
  }

  const handleDeleteItem = (itemId: string) => {
    deleteMutation.mutate({ eventId, itemId })
  }

  return (
    <div className="space-y-6">
      {/* Progresso */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-2xl font-bold">{stats.percentComplete}%</p>
              <p className="text-sm text-muted-foreground">
                {stats.completed} de {stats.total} concluídos
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{stats.completed} feitos</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-muted-foreground" />
                <span>{stats.pending} pendentes</span>
              </div>
            </div>
          </div>
          <Progress value={stats.percentComplete} className="h-2" />
        </CardContent>
      </Card>

      {/* Lista de itens */}
      <Card>
        <CardHeader>
          <CardTitle>Itens do Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                item.completed
                  ? "bg-green-500/5 border-green-500/20"
                  : "bg-card hover:bg-muted/50",
                canEdit && "cursor-pointer"
              )}
              onClick={() => handleToggle(item)}
            >
              <div className="pt-0.5">
                {toggleMutation.isPending &&
                toggleMutation.variables?.itemId === item.id ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : item.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm",
                    item.completed && "line-through text-muted-foreground"
                  )}
                >
                  {item.title}
                </p>
                {item.completed && item.completedBy && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Concluído por {item.completedBy.name} em{" "}
                    {new Date(item.completedAt!).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/Sao_Paulo",
                    })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!item.fromTemplate && (
                  <Badge variant="outline" className="text-xs">
                    Extra
                  </Badge>
                )}

                {canEdit && !item.fromTemplate && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover item?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}

          {/* Adicionar item extra */}
          {canEdit && (
            <div className="flex items-center gap-2 pt-4 border-t mt-4">
              <Input
                placeholder="Adicionar item extra..."
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddItem()
                }}
                disabled={addMutation.isPending}
              />
              <Button
                onClick={handleAddItem}
                disabled={!newItemTitle.trim() || addMutation.isPending}
              >
                {addMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {!canEdit && (
            <p className="text-sm text-muted-foreground text-center pt-4 border-t mt-4">
              Apenas membros do Cerimonial podem marcar itens.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
