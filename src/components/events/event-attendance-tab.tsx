"use client"

import * as React from "react"
import { Minus, Plus, Save, Users, UserPlus, Sparkles, Pencil, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  useEventAttendance,
  useUpdateEventAttendance,
} from "@/hooks/use-event-attendance"
import { cn } from "@/lib/utils"

interface EventAttendanceTabProps {
  eventId: string
  canEdit: boolean
}

type CounterKey = "attendees" | "visitors" | "conversions"

const counterMeta: Record<
  CounterKey,
  {
    label: string
    description: string
    icon: typeof Users
    accent: string
    ring: string
    iconColor: string
  }
> = {
  attendees: {
    label: "Presentes",
    description: "Total de pessoas no evento",
    icon: Users,
    accent: "from-primary/20 to-primary/5",
    ring: "ring-primary/30",
    iconColor: "text-primary",
  },
  visitors: {
    label: "Visitantes",
    description: "Pessoas pela primeira vez",
    icon: UserPlus,
    accent: "from-sky-500/20 to-sky-500/5",
    ring: "ring-sky-500/30",
    iconColor: "text-sky-400",
  },
  conversions: {
    label: "Conversões",
    description: "Decisões registradas",
    icon: Sparkles,
    accent: "from-emerald-500/20 to-emerald-500/5",
    ring: "ring-emerald-500/30",
    iconColor: "text-emerald-400",
  },
}

export function EventAttendanceTab({ eventId, canEdit }: EventAttendanceTabProps) {
  const { toast } = useToast()
  const { data, isLoading } = useEventAttendance(eventId)
  const update = useUpdateEventAttendance(eventId)

  const [values, setValues] = React.useState<Record<CounterKey, number>>({
    attendees: 0,
    visitors: 0,
    conversions: 0,
  })
  const [notes, setNotes] = React.useState<string>("")
  const [dirty, setDirty] = React.useState(false)
  const [editingKey, setEditingKey] = React.useState<CounterKey | null>(null)
  const [editingValue, setEditingValue] = React.useState("")

  React.useEffect(() => {
    if (!data) return
    setValues({
      attendees: data.attendees,
      visitors: data.visitors,
      conversions: data.conversions,
    })
    setNotes(data.notes ?? "")
    setDirty(false)
  }, [data])

  const bump = (key: CounterKey, delta: number) => {
    if (!canEdit) return
    setValues((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }))
    setDirty(true)
  }

  const openEdit = (key: CounterKey) => {
    if (!canEdit) return
    setEditingKey(key)
    setEditingValue(String(values[key]))
  }

  const commitEdit = () => {
    if (editingKey === null) return
    const parsed = Number(editingValue.replace(/\D/g, ""))
    const next = Number.isFinite(parsed) ? Math.max(0, parsed) : 0
    setValues((prev) => ({ ...prev, [editingKey]: next }))
    setDirty(true)
    setEditingKey(null)
  }

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        attendees: values.attendees,
        visitors: values.visitors,
        conversions: values.conversions,
        notes: notes || null,
      })
      setDirty(false)
      toast({ title: "Presença salva", description: "Os números foram atualizados." })
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando presença...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(Object.keys(counterMeta) as CounterKey[]).map((key) => {
          const meta = counterMeta[key]
          const Icon = meta.icon
          const value = values[key]
          return (
            <Card
              key={key}
              className={cn(
                "relative overflow-hidden border-border bg-gradient-to-br",
                meta.accent,
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium text-foreground">
                  <span className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", meta.iconColor)} />
                    {meta.label}
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openEdit(key)}
                      className="p-1 rounded hover:bg-background/50 transition"
                      aria-label={`Editar ${meta.label}`}
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <button
                  type="button"
                  onClick={() => bump(key, 1)}
                  disabled={!canEdit}
                  className={cn(
                    "w-full text-left tabular-nums font-display text-5xl sm:text-6xl font-bold leading-none py-3 select-none transition-transform",
                    canEdit && "active:scale-95 cursor-pointer",
                    !canEdit && "cursor-default",
                  )}
                  aria-label={`Adicionar 1 em ${meta.label}`}
                >
                  {value}
                </button>
                <p className="text-xs text-muted-foreground mb-3">{meta.description}</p>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      onClick={() => bump(key, -1)}
                      aria-label={`Remover 1 de ${meta.label}`}
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      className={cn(
                        "h-11 flex-1 font-semibold ring-1",
                        meta.ring,
                      )}
                      onClick={() => bump(key, 1)}
                      aria-label={`Adicionar 1 em ${meta.label}`}
                    >
                      <Plus className="h-5 w-5 mr-1" /> +1
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full min-h-[88px] rounded-md bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={notes}
            placeholder="Anote algo relevante sobre a presença deste evento"
            disabled={!canEdit}
            onChange={(e) => {
              setNotes(e.target.value)
              setDirty(true)
            }}
          />
        </CardContent>
      </Card>

      {canEdit && (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <Button
            type="button"
            size="lg"
            disabled={!dirty || update.isPending}
            onClick={handleSave}
            className="shadow-lg"
          >
            {update.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar presença
          </Button>
        </div>
      )}

      {data?.updatedAt && (
        <p className="text-xs text-muted-foreground text-center">
          Última atualização em {new Date(data.updatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          {data.updatedBy?.name ? ` por ${data.updatedBy.name}` : ""}
        </p>
      )}

      <Dialog open={editingKey !== null} onOpenChange={(open) => !open && setEditingKey(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingKey ? `Editar ${counterMeta[editingKey].label}` : "Editar"}
            </DialogTitle>
            <DialogDescription>
              Digite o número total. O contador será substituído.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label htmlFor="attendance-edit-input">Total</Label>
            <Input
              id="attendance-edit-input"
              type="number"
              inputMode="numeric"
              min={0}
              value={editingValue}
              autoFocus
              onChange={(e) => setEditingValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  commitEdit()
                }
              }}
              className="h-12 text-2xl tabular-nums text-center"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingKey(null)}>
              Cancelar
            </Button>
            <Button onClick={commitEdit}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
