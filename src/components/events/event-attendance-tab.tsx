"use client"

import * as React from "react"
import { Minus, Plus, Save, Users, UserPlus, Sparkles, Loader2, History } from "lucide-react"

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
  useEventAttendanceHistory,
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
  const { data: history } = useEventAttendanceHistory(eventId)
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
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Icon className={cn("h-4 w-4", meta.iconColor)} />
                  {meta.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 shrink-0 rounded-full"
                    onClick={() => bump(key, -1)}
                    disabled={!canEdit || value === 0}
                    aria-label={`Remover 1 de ${meta.label}`}
                  >
                    <Minus className="h-5 w-5" />
                  </Button>

                  <button
                    type="button"
                    onClick={() => openEdit(key)}
                    disabled={!canEdit}
                    className={cn(
                      "flex-1 text-center tabular-nums font-display text-5xl sm:text-6xl font-bold leading-none py-2 select-none transition-transform",
                      canEdit && "active:scale-95 cursor-pointer hover:text-primary",
                      !canEdit && "cursor-default",
                    )}
                    aria-label={`Editar ${meta.label}`}
                  >
                    {value}
                  </button>

                  <Button
                    type="button"
                    variant="default"
                    size="icon"
                    className={cn("h-12 w-12 shrink-0 rounded-full ring-1", meta.ring)}
                    onClick={() => bump(key, 1)}
                    disabled={!canEdit}
                    aria-label={`Adicionar 1 em ${meta.label}`}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">{meta.description}</p>
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

      {history && history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <History className="h-4 w-4 text-muted-foreground" />
              Histórico de alterações
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ol className="divide-y divide-border">
              {history.map((log) => (
                <li key={log.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {log.updatedBy?.name ?? "Usuário removido"}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {new Date(log.createdAt).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground tabular-nums">
                    <span>
                      <Users className="inline h-3 w-3 mr-1" />
                      {log.attendees}
                    </span>
                    <span>
                      <UserPlus className="inline h-3 w-3 mr-1" />
                      {log.visitors}
                    </span>
                    <span>
                      <Sparkles className="inline h-3 w-3 mr-1" />
                      {log.conversions}
                    </span>
                  </div>
                  {log.notes && (
                    <p className="text-xs text-muted-foreground italic line-clamp-2">
                      &ldquo;{log.notes}&rdquo;
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
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
