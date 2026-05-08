"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate, formatDateToISO } from "@/lib/date-utils";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Loader2,
  BarChart3,
  Building2,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Types
interface Ministry {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface ScheduleReportStatistics {
  totalSchedules: number;
  confirmedSchedules: number;
  pendingSchedules: number;
  declinedSchedules: number;
  confirmationRate: number;
  uniqueVolunteers: number;
  uniqueEvents: number;
  uniqueMinistries: number;
}

interface ScheduleReportData {
  id: string;
  date: string;
  eventName: string;
  eventType: string;
  volunteerName: string;
  volunteerEmail: string;
  ministryName: string;
  position: string | null;
  status: "PENDING" | "CONFIRMED" | "DECLINED";
  confirmedAt: string | null;
  declinedReason: string | null;
}

interface ReportResponse {
  report: {
    period: {
      startDate: string | null;
      endDate: string | null;
    };
    generatedAt: string;
  };
  statistics: ScheduleReportStatistics;
  data: ScheduleReportData[];
}

// Quick date range options
type DateRangeOption = "last7days" | "last30days" | "thisMonth" | "lastMonth" | "custom";

const dateRangeOptions = [
  { value: "last7days", label: "Ultimos 7 dias" },
  { value: "last30days", label: "Ultimos 30 dias" },
  { value: "thisMonth", label: "Este mes" },
  { value: "lastMonth", label: "Mes passado" },
  { value: "custom", label: "Personalizado" },
];

export default function RelatorioEscalasPage() {
  const { toast } = useToast();
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>("last30days");
  const [startDate, setStartDate] = useState<Date | undefined>(() => subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(() => new Date());
  const [ministryId, setMinistryId] = useState<string>("all");
  const [userId, setUserId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [isDownloading, setIsDownloading] = useState<"pdf" | "excel" | null>(null);

  // Handle date range option change
  useEffect(() => {
    const now = new Date();
    switch (dateRangeOption) {
      case "last7days":
        setStartDate(subDays(now, 7));
        setEndDate(now);
        break;
      case "last30days":
        setStartDate(subDays(now, 30));
        setEndDate(now);
        break;
      case "thisMonth":
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case "lastMonth":
        const lastMonth = subDays(startOfMonth(now), 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
      // "custom" - don't change dates
    }
  }, [dateRangeOption]);

  // Fetch ministries
  const { data: ministriesData } = useQuery({
    queryKey: ["ministries"],
    queryFn: async () => {
      const response = await fetch("/api/ministries?limit=100");
      if (!response.ok) throw new Error("Erro ao carregar ministerios");
      const result = await response.json();
      return result.data as Ministry[];
    },
  });

  // Fetch users
  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users?limit=200");
      if (!response.ok) throw new Error("Erro ao carregar usuarios");
      const result = await response.json();
      return result.data as User[];
    },
  });

  // Build query string
  const buildQueryString = (format?: string) => {
    const params = new URLSearchParams();
    if (format) params.set("format", format);
    if (startDate) params.set("startDate", format === undefined ? formatDateForAPI(startDate) : formatDateForAPI(startDate));
    if (endDate) params.set("endDate", formatDateForAPI(endDate));
    if (ministryId && ministryId !== "all") params.set("ministryId", ministryId);
    if (userId && userId !== "all") params.set("userId", userId);
    if (status && status !== "all") params.set("status", status);
    return params.toString();
  };

  // Fetch report preview (JSON)
  const {
    data: reportData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["schedules-report", startDate, endDate, ministryId, userId, status],
    queryFn: async () => {
      const response = await fetch(`/api/reports/schedules?${buildQueryString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao carregar relatorio");
      }
      return response.json() as Promise<ReportResponse>;
    },
    enabled: !!startDate && !!endDate,
  });

  // Download handler
  const handleDownload = async (downloadFormat: "pdf" | "excel") => {
    setIsDownloading(downloadFormat);
    try {
      const response = await fetch(`/api/reports/schedules?${buildQueryString(downloadFormat)}`);
      if (!response.ok) {
        throw new Error("Erro ao baixar relatorio");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-escalas-${Date.now()}.${downloadFormat === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download concluido",
        description: `Relatorio ${downloadFormat.toUpperCase()} baixado com sucesso.`,
      });
    } catch (err) {
      toast({
        title: "Erro no download",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const stats = reportData?.statistics;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        backHref="/relatorios"
        backLabel="Voltar para relatórios"
        title="Relatorio de Escalas"
        description="Analise estatisticas e exporte dados das escalas"
        actions={
          <>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleDownload("excel")}
              disabled={isDownloading !== null || !reportData}
            >
              {isDownloading === "excel" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              Excel
            </Button>
            <Button
              className="gap-2"
              onClick={() => handleDownload("pdf")}
              disabled={isDownloading !== null || !reportData}
            >
              {isDownloading === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              PDF
            </Button>
          </>
        }
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Date Range Option */}
            <div className="space-y-2">
              <Label>Periodo</Label>
              <Select
                value={dateRangeOption}
                onValueChange={(v) => setDateRangeOption(v as DateRangeOption)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o periodo" />
                </SelectTrigger>
                <SelectContent>
                  {dateRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {startDate
                      ? format(startDate, "dd/MM/yyyy", { locale: ptBR })
                      : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      setDateRangeOption("custom");
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {endDate
                      ? format(endDate, "dd/MM/yyyy", { locale: ptBR })
                      : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date);
                      setDateRangeOption("custom");
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Ministry Filter */}
            <div className="space-y-2">
              <Label>Ministerio</Label>
              <Select value={ministryId} onValueChange={setMinistryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os ministerios</SelectItem>
                  {ministriesData?.map((ministry) => (
                    <SelectItem key={ministry.id} value={ministry.id}>
                      {ministry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                  <SelectItem value="DECLINED">Recusado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Volunteer Filter - Full width */}
          <div className="mt-4 space-y-2 max-w-sm">
            <Label>Voluntario</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os voluntarios</SelectItem>
                {usersData?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-20 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
            <p className="text-destructive font-medium">
              {error instanceof Error ? error.message : "Erro ao carregar dados"}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Escalas
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stats.totalSchedules}
                </div>
                <p className="text-xs text-muted-foreground">
                  No periodo selecionado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Taxa de Confirmacao
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stats.confirmationRate.toFixed(1)}%
                </div>
                <div className="mt-1 flex gap-2">
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {stats.confirmedSchedules}
                  </Badge>
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
                    <Clock className="h-3 w-3 mr-1" />
                    {stats.pendingSchedules}
                  </Badge>
                  <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                    <XCircle className="h-3 w-3 mr-1" />
                    {stats.declinedSchedules}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Voluntarios Unicos
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stats.uniqueVolunteers}
                </div>
                <p className="text-xs text-muted-foreground">
                  Participaram no periodo
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ministerios Ativos
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stats.uniqueMinistries}
                </div>
                <p className="text-xs text-muted-foreground">
                  Em {stats.uniqueEvents} eventos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Data Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Preview dos Dados</span>
                <Badge variant="secondary">
                  {reportData?.data.length} registros
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportData?.data && reportData.data.length > 0 ? (
                <div>
                  {/* Mobile: cards */}
                  <div className="md:hidden space-y-3">
                    {reportData.data.slice(0, 10).map((item) => (
                      <Card
                        key={item.id}
                        className="border border-border/60 shadow-none"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-base font-semibold text-foreground truncate">
                                {item.volunteerName}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {item.eventName}
                              </p>
                            </div>
                            <StatusBadge status={item.status} />
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-border">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Data
                              </p>
                              <p className="text-sm text-foreground">
                                {format(
                                  parseLocalDate(item.date),
                                  "dd/MM/yyyy",
                                  { locale: ptBR },
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Funcao
                              </p>
                              <p className="text-sm text-foreground">
                                {item.position || "-"}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-muted-foreground">
                                Ministerio
                              </p>
                              <p className="text-sm text-foreground">
                                {item.ministryName}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop: tabela */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="hidden md:table w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                            Data
                          </th>
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                            Evento
                          </th>
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                            Voluntario
                          </th>
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                            Ministerio
                          </th>
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                            Funcao
                          </th>
                          <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.data.slice(0, 10).map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-border/50 hover:bg-muted/50"
                          >
                            <td className="py-3 px-2">
                              {format(
                                parseLocalDate(item.date),
                                "dd/MM/yyyy",
                                { locale: ptBR },
                              )}
                            </td>
                            <td className="py-3 px-2">{item.eventName}</td>
                            <td className="py-3 px-2">{item.volunteerName}</td>
                            <td className="py-3 px-2">{item.ministryName}</td>
                            <td className="py-3 px-2">
                              {item.position || "-"}
                            </td>
                            <td className="py-3 px-2">
                              <StatusBadge status={item.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {reportData.data.length > 10 && (
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      Mostrando 10 de {reportData.data.length} registros.
                      Baixe o relatorio completo para ver todos os dados.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Nenhuma escala encontrada para os filtros selecionados
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

// Helper components
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "CONFIRMED":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Confirmado
        </Badge>
      );
    case "PENDING":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      );
    case "DECLINED":
      return (
        <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20">
          <XCircle className="h-3 w-3 mr-1" />
          Recusado
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// Helper function
function formatDateForAPI(date: Date): string {
  return formatDateToISO(date);
}
