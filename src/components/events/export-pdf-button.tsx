"use client"

import { useState } from "react"
import { FileDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Event } from "@/hooks/use-events"
import type { EventItem } from "@/hooks/use-event-items"
import type { EventScheduleGroup } from "@/hooks/use-schedules"
import { toast } from "sonner"
import { toLocalDate, formatDateToISO } from "@/lib/date-utils"

interface ExportPDFButtonProps {
  event: Event
  items: EventItem[]
  schedules: EventScheduleGroup[]
  churchName?: string
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function ExportPDFButton({
  event,
  items,
  schedules,
  churchName = "Igreja Beta",
  variant = "outline",
  size = "default",
  className,
}: ExportPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleExport = async () => {
    if (isGenerating) return

    setIsGenerating(true)

    try {
      // Import dinamicamente para evitar problemas de SSR
      const { pdf } = await import("@react-pdf/renderer")
      const { EventPDFDocument } = await import("./event-pdf-document")

      // Gerar o PDF
      const doc = (
        <EventPDFDocument
          event={event}
          items={items}
          schedules={schedules}
          churchName={churchName}
        />
      )

      const blob = await pdf(doc).toBlob()

      // Criar link para download
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")

      // Formatar nome do arquivo
      const eventDate = toLocalDate(event.date)
      const dateStr = formatDateToISO(eventDate)
      const fileName = `${event.name.replace(/[^a-zA-Z0-9]/g, "-")}_${dateStr}.pdf`

      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("PDF exportado com sucesso!")
    } catch (error) {
      console.error("Erro ao gerar PDF:", error)
      toast.error("Erro ao gerar o PDF. Tente novamente.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isGenerating}
      className={className}
    >
      {isGenerating ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-2 h-4 w-4" />
      )}
      {isGenerating ? "Gerando PDF..." : "Exportar PDF"}
    </Button>
  )
}
