"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, Loader2, FileText } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { OrderOfServiceEditor } from "@/components/events/order-of-service-editor"
import { useEvent, getEventTypeLabel, formatTimeFromDate } from "@/hooks/use-events"

// Parse date string (YYYY-MM-DD) to Date object in local timezone
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

export default function OrdemDeCultoPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const { data: event, isLoading } = useEvent(eventId)

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex-1 p-6">
        <Card className="p-8 text-center">
          <p className="text-destructive mb-4">Evento nao encontrado</p>
          <Link href="/eventos">
            <Button variant="outline">Voltar para eventos</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const dateStr = typeof event.date === "string" ? event.date : event.date.toISOString().split("T")[0]
  const eventDate = parseLocalDate(dateStr)
  const startTime = formatTimeFromDate(event.startTime)
  const isReadOnly = event.status === "COMPLETED"

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/eventos/${eventId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-display">{event.name}</h1>
              <Badge variant="outline">{getEventTypeLabel(event.type)}</Badge>
              {isReadOnly && (
                <Badge variant="secondary">Concluido</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {format(eventDate, "EEEE, dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {startTime}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <FileText className="h-4 w-4 mr-1" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Order of Service Editor */}
      <Card className="p-4 md:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Ordem de Culto
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isReadOnly
              ? "Visualize a ordem de culto deste evento"
              : "Organize a sequencia de atividades do culto"}
          </p>
        </div>

        <OrderOfServiceEditor
          eventId={eventId}
          eventStartTime={startTime}
          readOnly={isReadOnly}
        />
      </Card>

      {/* Tips */}
      {!isReadOnly && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <h3 className="font-medium text-sm mb-2">Dicas:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>- Arraste os itens para reordenar</li>
            <li>- Defina a duracao para calcular os horarios automaticamente</li>
            <li>- Use &quot;Notas Internas&quot; para informacoes da equipe que nao devem aparecer para membros</li>
            <li>- Para blocos de louvor, adicione as musicas no Setlist do evento</li>
          </ul>
        </Card>
      )}
    </div>
  )
}
