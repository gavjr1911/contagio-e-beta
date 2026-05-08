import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import {
  generateSchedulesPDF,
  generateSchedulesExcel,
  calculateScheduleStatistics,
  type ScheduleReportData,
  type ScheduleReport,
} from "@/lib/reports/schedules"
import { parseLocalDate, formatDateToISO } from "@/lib/date-utils"

// Query params schema
const querySchema = z.object({
  format: z.enum(["pdf", "excel", "json"]).optional().default("json"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ministryId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  status: z.enum(["PENDING", "CONFIRMED", "DECLINED"]).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Only admins and leaders can access reports
    const allowedRoles = ["ADMIN", "LEADER"]
    if (!session.user.role || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "Voce nao tem permissao para acessar relatorios" },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const queryResult = querySchema.safeParse({
      format: searchParams.get("format") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      ministryId: searchParams.get("ministryId") || undefined,
      userId: searchParams.get("userId") || undefined,
      status: searchParams.get("status") || undefined,
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Parametros invalidos", details: queryResult.error.flatten() },
        { status: 400 }
      )
    }

    const { format, startDate, endDate, ministryId, userId, status } = queryResult.data

    // Build where clause
    const where: {
      event?: { date?: { gte?: Date; lte?: Date } }
      ministryId?: string
      userId?: string
      status?: "PENDING" | "CONFIRMED" | "DECLINED"
    } = {}

    if (startDate || endDate) {
      where.event = {
        date: {
          ...(startDate && { gte: parseLocalDate(startDate) }),
          ...(endDate && { lte: parseLocalDate(endDate) }),
        },
      }
    }

    if (ministryId) {
      where.ministryId = ministryId
    }

    if (userId) {
      where.userId = userId
    }

    if (status) {
      where.status = status
    }

    // Fetch schedules with related data
    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            name: true,
            type: true,
            date: true,
            startTime: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ministry: {
          select: {
            id: true,
            name: true,
          },
        },
        vacancy: {
          select: {
            position: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ event: { date: "desc" } }, { createdAt: "desc" }],
    })

    // Transform data for report
    const reportData: ScheduleReportData[] = schedules.map((schedule) => ({
      id: schedule.id,
      date: formatDateToISO(schedule.event.date),
      eventName: schedule.event.name,
      eventType: schedule.event.type,
      volunteerName: schedule.user.name || "Sem nome",
      volunteerEmail: schedule.user.email,
      ministryName: schedule.ministry.name,
      position: schedule.vacancy?.position?.name || schedule.position || null,
      status: schedule.status as "PENDING" | "CONFIRMED" | "DECLINED",
      confirmedAt: schedule.confirmedAt?.toISOString() || null,
      declinedReason: schedule.declinedReason,
    }))

    // Calculate statistics
    const statistics = calculateScheduleStatistics(reportData)

    // Build report object
    const report: ScheduleReport = {
      filters: {
        startDate: startDate ? parseLocalDate(startDate) : undefined,
        endDate: endDate ? parseLocalDate(endDate) : undefined,
        ministryId,
        userId,
        status,
      },
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      generatedAt: new Date().toISOString(),
      statistics,
      data: reportData,
    }

    // Return based on format
    if (format === "pdf") {
      const pdfBlob = generateSchedulesPDF(report)
      const pdfBuffer = await pdfBlob.arrayBuffer()

      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="relatorio-escalas-${Date.now()}.pdf"`,
        },
      })
    }

    if (format === "excel") {
      const excelBlob = generateSchedulesExcel(report)
      const excelBuffer = await excelBlob.arrayBuffer()

      return new NextResponse(excelBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="relatorio-escalas-${Date.now()}.xlsx"`,
        },
      })
    }

    // Default: return JSON
    return NextResponse.json({
      report: {
        period: report.period,
        generatedAt: report.generatedAt,
      },
      statistics: report.statistics,
      data: report.data,
    })
  } catch (error) {
    console.error("Erro ao gerar relatorio de escalas:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
