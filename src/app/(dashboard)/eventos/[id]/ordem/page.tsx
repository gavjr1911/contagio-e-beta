"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Calendar, Clock, Loader2, FileText } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/layout/page-header"
import { OrderOfServiceEditor } from "@/components/events/order-of-service-editor"
import { useEvent, getEventTypeLabel, formatTimeFromDate } from "@/hooks/use-events"

import { parseLocalDate, formatDateToISO } from "@/lib/date-utils"

export default function OrdemDeCultoPage() {
  const params = useParams()
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
      <div>
        <Card className="p-8 text-center">
          <p className="text-destructive mb-4">Evento não encontrado</p>
          <Link href="/eventos">
            <Button variant="outline">Voltar para eventos</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const dateStr = typeof event.date === "string" ? event.date : formatDateToISO(event.date)
  const eventDate = parseLocalDate(dateStr)
  const startTime = formatTimeFromDate(event.startTime)
  const isReadOnly = event.status === "COMPLETED"

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        backHref={`/eventos/${eventId}`}
        backLabel="Voltar para o evento"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {event.name}
            <Badge variant="outline">{getEventTypeLabel(event.type)}</Badge>
            {isReadOnly && <Badge variant="secondary">Concluído</Badge>}
          </span>
        }
        meta={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span className="capitalize">
                {format(eventDate, "EEEE, dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {startTime}
            </span>
          </div>
        }
      />

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
              : "Organize a sequência de atividades do culto"}
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
            <li>- Defina a duração para calcular os horários automaticamente</li>
            <li>- Use &quot;Notas Internas&quot; para informações da equipe que não devem aparecer para membros</li>
            <li>- Para blocos de louvor, adicione as músicas no Setlist do evento</li>
          </ul>
        </Card>
      )}
    </div>
  )
}
