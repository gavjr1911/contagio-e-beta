"use client"

import * as React from "react"
import { GripVertical, Plus, Trash2, Pencil, Check, X, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  useAddTemplateItem,
  useUpdateTemplateItem,
  useDeleteTemplateItem,
  type ChecklistTemplateItem,
} from "@/hooks/use-checklist-templates"
import { cn } from "@/lib/utils"

interface TemplateItemsEditorProps {
  templateId: string
  items: ChecklistTemplateItem[]
}

export function TemplateItemsEditor({
  templateId,
  items,
}: TemplateItemsEditorProps) {
  const [newItemTitle, setNewItemTitle] = React.useState("")
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null)
  const [editingTitle, setEditingTitle] = React.useState("")

  const addMutation = useAddTemplateItem()
  const updateMutation = useUpdateTemplateItem()
  const deleteMutation = useDeleteTemplateItem()

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) return

    await addMutation.mutateAsync({
      templateId,
      data: { title: newItemTitle.trim() },
    })
    setNewItemTitle("")
  }

  const handleStartEdit = (item: ChecklistTemplateItem) => {
    setEditingItemId(item.id)
    setEditingTitle(item.title)
  }

  const handleSaveEdit = async () => {
    if (!editingItemId || !editingTitle.trim()) return

    await updateMutation.mutateAsync({
      templateId,
      itemId: editingItemId,
      data: { title: editingTitle.trim() },
    })
    setEditingItemId(null)
    setEditingTitle("")
  }

  const handleCancelEdit = () => {
    setEditingItemId(null)
    setEditingTitle("")
  }

  const handleDeleteItem = async (itemId: string) => {
    await deleteMutation.mutateAsync({ templateId, itemId })
  }

  const isLoading =
    addMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Itens do Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de itens */}
        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum item adicionado ainda
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border bg-card",
                  editingItemId === item.id && "ring-2 ring-primary"
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

                {editingItemId === item.id ? (
                  <>
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit()
                        if (e.key === "Escape") handleCancelEdit()
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleSaveEdit}
                      disabled={isLoading}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{item.title}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleStartEdit(item)}
                      disabled={isLoading}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteItem(item.id)}
                      disabled={isLoading}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Adicionar novo item */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Input
            placeholder="Adicionar novo item..."
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddItem()
            }}
            disabled={isLoading}
          />
          <Button
            onClick={handleAddItem}
            disabled={!newItemTitle.trim() || isLoading}
          >
            {addMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
