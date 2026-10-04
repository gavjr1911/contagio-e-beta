"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
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
import { useEvent } from "@/hooks/use-events"
import { eventKeys, eventChecklistKeys } from "@/hooks/query-keys"
import {
  shouldAutoStartChecklist,
  isAlreadyStartedError,
  toTimedEvent,
} from "@/lib/events/checklist-auto-start"
import { cn } from "@/lib/utils"

interface EventChecklistTabProps {
  eventId: string
}

/**
 * Eventos cujo disparo automático já foi tentado NESTA sessão de navegação.
 *
 * Mora fora do componente de propósito: um `useRef` morre quando a aba é
 * desmontada (trocar de aba e voltar desmonta), e aí a cada volta sairia um
 * POST novo. O servidor se protege com transação, mas martelar a rota no Wi-Fi
 * da igreja não é opção. Garante também o disparo único sob StrictMode, que em
 * dev monta e roda os efeitos duas vezes de propósito.
 *
 * Quem falhou continua tendo o botão manual como saída — por isso a entrada não
 * é removida no erro.
 */
const autoStartAttempted = new Set<string>()

type AutoStartStatus = "idle" | "pending" | "settled" | "error"

export function EventChecklistTab({ eventId }: EventChecklistTabProps) {
  const { data, isLoading, error } = useEventChecklist(eventId)
  const [newItemTitle, setNewItemTitle] = React.useState("")

  const initMutation = useInitEventChecklist()
  const toggleMutation = useToggleChecklistItem()
  const addMutation = useAddChecklistItem()
  const deleteMutation = useDeleteChecklistItem()

  // ---------------------------------------------------------------------
  // Materialização automática durante a janela do evento
  // ---------------------------------------------------------------------
  //
  // O evento vem do MESMO hook que a página do evento já usa, com a mesma
  // chave de cache: nenhuma requisição extra, e nenhuma prop nova no
  // componente. `date`/`startTime` chegam como "YYYY-MM-DD"/"HH:MM"
  // (`transformEventForResponse`), que é o formato que `isEventHappening` pede.
  const { data: event, isLoading: isEventLoading } = useEvent(eventId)
  const queryClient = useQueryClient()

  const [autoStatus, setAutoStatus] = React.useState<AutoStartStatus>("idle")

  // Assim que a lista chega, o estado transitório cumpriu seu papel e volta a
  // "idle". Sem isto, "settled" fica preso para sempre: se algum dia os itens
  // sumirem (reset no banco, um futuro "refazer checklist"), a aba mostraria o
  // spinner "Preparando checklist..." eterno — sem botão manual e sem erro,
  // saindo só com reload.
  React.useEffect(() => {
    if (data?.hasInstantiatedItems && autoStatus === "settled") {
      setAutoStatus("idle")
    }
  }, [data?.hasInstantiatedItems, autoStatus])
  const [autoError, setAutoError] = React.useState<string | null>(null)

  const canEdit = data?.canEdit ?? false
  const hasTemplate = data?.hasTemplate ?? false
  const hasInstantiatedItems = data?.hasInstantiatedItems ?? false
  const isCompletedEvent = data?.isCompleted ?? false

  const timedEvent = React.useMemo(() => toTimedEvent(event), [event])

  const wantsAutoStart = shouldAutoStartChecklist({
    event: timedEvent,
    canEdit,
    hasTemplate,
    hasInstantiatedItems,
    isCompleted: isCompletedEvent,
  })

  React.useEffect(() => {
    if (!wantsAutoStart) return
    if (autoStartAttempted.has(eventId)) return

    autoStartAttempted.add(eventId)
    setAutoStatus("pending")
    setAutoError(null)

    // Chamada direta em vez de `useInitEventChecklist`: o hook sempre dispara
    // toast de sucesso e de erro, e aqui o disparo é invisível para quem está
    // marcando o checklist — inclusive o 400 de corrida, que não é erro.
    void (async () => {
      try {
        // Escalonamento + reconferência antes de escrever.
        //
        // A rota `init` reconfere a contagem dentro da transação, mas em
        // READ COMMITTED duas transações concorrentes leem zero e as duas
        // inserem — verificado aqui: duas abas abrindo juntas geraram 24 itens
        // em vez de 12. Com o disparo automático, "duas pessoas abrindo a aba"
        // deixa de ser clique simultâneo e vira o caso comum do domingo.
        //
        // O atraso aleatório desencontra as aberturas e o GET seguinte vê o
        // checklist que a outra pessoa acabou de criar. NÃO é correção: a
        // corrida exatamente simultânea continua possível e só se fecha no
        // servidor (índice único ou advisory lock na rota `init`).
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 700))

        const atual = await fetch(`/api/events/${eventId}/checklist`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)

        if (atual?.data?.hasInstantiatedItems) {
          await queryClient.invalidateQueries({
            queryKey: eventChecklistKeys.list(eventId),
          })
          setAutoStatus("settled")
          return
        }

        const res = await fetch(`/api/events/${eventId}/checklist/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
        const payload = await res.json().catch(() => null)

        // Corrida real: duas pessoas abriram a aba ao mesmo tempo e o servidor
        // deixou a segunda de fora. O checklist existe — é só recarregar.
        const jaIniciado =
          res.status === 400 && isAlreadyStartedError(payload?.error)

        if (!res.ok && !jaIniciado) {
          throw new Error(payload?.error || "Erro ao iniciar checklist")
        }

        await queryClient.invalidateQueries({
          queryKey: eventChecklistKeys.list(eventId),
        })
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) })

        setAutoStatus("settled")
      } catch (err) {
        // Falha não vira laço: o estado "error" devolve o botão manual, e a
        // entrada em `autoStartAttempted` impede nova tentativa automática.
        setAutoStatus("error")
        setAutoError(
          err instanceof Error ? err.message : "Erro ao iniciar checklist"
        )
      }
    })()
  }, [wantsAutoStart, eventId, queryClient])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // `error && !data`, nao so `error`: `useToggleChecklistItem` invalida a query
  // a CADA marcacao e, no Wi-Fi da igreja, um refetch pode esgotar os retries e
  // setar `error` com a lista ainda em cache. Testar `error` sozinho apagava os
  // 39 itens da tela no meio do preenchimento.
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive">Erro ao carregar checklist</p>
      </div>
    )
  }

  if (!data) return null

  const { items, template, stats } = data
  const isCompleted = isCompletedEvent

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
    // Enquanto o evento não chegou ao cache ainda não dá para saber se estamos
    // na janela. Mostrar o botão aqui faria ele piscar e sumir na cara de quem
    // abriu a aba no meio do culto — então segura o estado de carregamento.
    const aguardandoEvento = isEventLoading && !timedEvent && canEdit && !isCompleted

    // "settled": o init já voltou, mas o refetch da lista ainda está vindo.
    // A materialização copia dezenas de itens — sem isto a pessoa veria
    // "Iniciar Checklist" piscando antes da lista aparecer.
    const materializando =
      aguardandoEvento || autoStatus === "pending" || autoStatus === "settled"

    if (materializando) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Preparando checklist do evento...</p>
        </div>
      )
    }

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

            {autoStatus === "error" && canEdit && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Não foi possível abrir o checklist automaticamente
                  {autoError ? `: ${autoError.replace(/\.?$/, ".")}` : "."} Use
                  o botão abaixo.
                </span>
              </div>
            )}

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
                {isCompleted
                  ? "Este evento já foi concluído e o checklist não pode mais ser iniciado. Peça a um administrador para reabrir o evento."
                  : "Você não tem permissão para iniciar este checklist. É preciso estar escalado neste evento por um ministério com permissão de checklists."}
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
              {isCompleted
                ? "Este evento já foi concluído e o checklist não pode mais ser alterado. Peça a um administrador para reabrir o evento."
                : "Você não tem permissão para marcar itens deste checklist. É preciso estar escalado neste evento por um ministério com permissão de checklists."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
