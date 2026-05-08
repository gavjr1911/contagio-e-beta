import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { parseLocalDate } from "@/lib/date-utils"

// Types
export interface ScheduleReportFilters {
  startDate?: Date
  endDate?: Date
  ministryId?: string
  userId?: string
  status?: "PENDING" | "CONFIRMED" | "DECLINED"
}

export interface ScheduleReportData {
  id: string
  date: string
  eventName: string
  eventType: string
  volunteerName: string
  volunteerEmail: string
  ministryName: string
  position: string | null
  status: "PENDING" | "CONFIRMED" | "DECLINED"
  confirmedAt: string | null
  declinedReason: string | null
}

export interface ScheduleReportStatistics {
  totalSchedules: number
  confirmedSchedules: number
  pendingSchedules: number
  declinedSchedules: number
  confirmationRate: number
  uniqueVolunteers: number
  uniqueEvents: number
  uniqueMinistries: number
}

export interface ScheduleReport {
  filters: ScheduleReportFilters
  period: {
    startDate: string | null
    endDate: string | null
  }
  generatedAt: string
  statistics: ScheduleReportStatistics
  data: ScheduleReportData[]
}

// Status translation
const statusTranslations: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  DECLINED: "Recusado",
}

/**
 * Generate PDF report for schedules
 */
export function generateSchedulesPDF(report: ScheduleReport): Blob {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // Title
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("Relatorio de Escalas", pageWidth / 2, 20, { align: "center" })

  // Period
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  const periodText = buildPeriodText(report.period)
  doc.text(periodText, pageWidth / 2, 28, { align: "center" })

  // Generated at
  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(
    `Gerado em: ${format(new Date(report.generatedAt), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}`,
    pageWidth / 2,
    34,
    { align: "center" }
  )
  doc.setTextColor(0)

  // Statistics section
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Estatisticas", 14, 45)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")

  const stats = report.statistics
  const statsData = [
    [`Total de Escalas: ${stats.totalSchedules}`, `Confirmadas: ${stats.confirmedSchedules}`],
    [`Pendentes: ${stats.pendingSchedules}`, `Recusadas: ${stats.declinedSchedules}`],
    [`Taxa de Confirmacao: ${stats.confirmationRate.toFixed(1)}%`, `Voluntarios Unicos: ${stats.uniqueVolunteers}`],
    [`Eventos: ${stats.uniqueEvents}`, `Ministerios: ${stats.uniqueMinistries}`],
  ]

  autoTable(doc, {
    startY: 50,
    head: [],
    body: statsData,
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 90 },
    },
    margin: { left: 14 },
  })

  // Schedule table
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  const statsEndY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 75
  doc.text("Detalhamento", 14, statsEndY + 10)

  // Prepare table data
  const tableData = report.data.map((schedule) => [
    formatDateForTable(schedule.date),
    schedule.eventName,
    schedule.volunteerName,
    schedule.ministryName,
    schedule.position || "-",
    statusTranslations[schedule.status] || schedule.status,
  ])

  autoTable(doc, {
    startY: statsEndY + 15,
    head: [["Data", "Evento", "Voluntario", "Ministerio", "Posicao", "Status"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [249, 115, 22], // Orange-500
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 40 },
      2: { cellWidth: 35 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
      5: { cellWidth: 22 },
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didDrawPage: (data) => {
      // Footer with page number
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(100)
      doc.text(
        `Pagina ${data.pageNumber} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      )
    },
  })

  return doc.output("blob")
}

/**
 * Generate Excel report for schedules
 */
export function generateSchedulesExcel(report: ScheduleReport): Blob {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Statistics
  const statsData = [
    ["Relatorio de Escalas"],
    [],
    ["Periodo", buildPeriodText(report.period)],
    ["Gerado em", format(new Date(report.generatedAt), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })],
    [],
    ["Estatisticas"],
    ["Total de Escalas", report.statistics.totalSchedules],
    ["Escalas Confirmadas", report.statistics.confirmedSchedules],
    ["Escalas Pendentes", report.statistics.pendingSchedules],
    ["Escalas Recusadas", report.statistics.declinedSchedules],
    ["Taxa de Confirmacao (%)", report.statistics.confirmationRate.toFixed(1)],
    ["Voluntarios Unicos", report.statistics.uniqueVolunteers],
    ["Eventos Unicos", report.statistics.uniqueEvents],
    ["Ministerios Unicos", report.statistics.uniqueMinistries],
  ]

  const wsStats = XLSX.utils.aoa_to_sheet(statsData)

  // Set column widths
  wsStats["!cols"] = [
    { wch: 25 },
    { wch: 40 },
  ]

  XLSX.utils.book_append_sheet(wb, wsStats, "Resumo")

  // Sheet 2: Detailed data
  const detailedData = [
    ["Data", "Evento", "Tipo", "Voluntario", "Email", "Ministerio", "Posicao", "Status", "Confirmado em", "Motivo Recusa"],
    ...report.data.map((schedule) => [
      formatDateForTable(schedule.date),
      schedule.eventName,
      schedule.eventType,
      schedule.volunteerName,
      schedule.volunteerEmail,
      schedule.ministryName,
      schedule.position || "",
      statusTranslations[schedule.status] || schedule.status,
      schedule.confirmedAt ? format(new Date(schedule.confirmedAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "",
      schedule.declinedReason || "",
    ]),
  ]

  const wsDetailed = XLSX.utils.aoa_to_sheet(detailedData)

  // Set column widths
  wsDetailed["!cols"] = [
    { wch: 12 },
    { wch: 30 },
    { wch: 12 },
    { wch: 25 },
    { wch: 30 },
    { wch: 20 },
    { wch: 18 },
    { wch: 12 },
    { wch: 18 },
    { wch: 40 },
  ]

  XLSX.utils.book_append_sheet(wb, wsDetailed, "Detalhamento")

  // Generate buffer
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  return new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
}

// Helper functions
function buildPeriodText(period: { startDate: string | null; endDate: string | null }): string {
  if (!period.startDate && !period.endDate) {
    return "Todos os periodos"
  }

  const startText = period.startDate
    ? format(new Date(period.startDate), "dd/MM/yyyy", { locale: ptBR })
    : "Inicio"
  const endText = period.endDate
    ? format(new Date(period.endDate), "dd/MM/yyyy", { locale: ptBR })
    : "Atual"

  return `${startText} a ${endText}`
}

function formatDateForTable(dateStr: string): string {
  try {
    return format(parseLocalDate(dateStr), "dd/MM/yyyy", { locale: ptBR })
  } catch {
    return dateStr
  }
}

/**
 * Calculate statistics from schedule data
 */
export function calculateScheduleStatistics(data: ScheduleReportData[]): ScheduleReportStatistics {
  const totalSchedules = data.length
  const confirmedSchedules = data.filter((s) => s.status === "CONFIRMED").length
  const pendingSchedules = data.filter((s) => s.status === "PENDING").length
  const declinedSchedules = data.filter((s) => s.status === "DECLINED").length

  const confirmationRate = totalSchedules > 0
    ? (confirmedSchedules / totalSchedules) * 100
    : 0

  const uniqueVolunteers = new Set(data.map((s) => s.volunteerEmail)).size
  const uniqueEvents = new Set(data.map((s) => s.eventName)).size
  const uniqueMinistries = new Set(data.map((s) => s.ministryName)).size

  return {
    totalSchedules,
    confirmedSchedules,
    pendingSchedules,
    declinedSchedules,
    confirmationRate,
    uniqueVolunteers,
    uniqueEvents,
    uniqueMinistries,
  }
}
