"use client";

import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  CalendarOff,
  RefreshCw,
  ListChecks,
  FileText,
  FileSpreadsheet,
  ArrowRight,
  BarChart3,
  Music,
} from "lucide-react";
import Link from "next/link";
import { useDashboardStats, DashboardEvent, DashboardSchedule } from "@/hooks/use-dashboard";
import { toLocalDate } from "@/lib/date-utils";
import { useConfirmSchedule, useDeclineSchedule } from "@/hooks/use-schedules";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { meetsLevel } from "@/lib/permissions/check";

interface DashboardContentProps {
  userName: string;
  userId: string | undefined;
  greeting: string;
}

// Card component
function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  isLoading?: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl p-5 md:p-6 border border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          {isLoading ? (
            <Skeleton className="h-9 w-12 mt-1" />
          ) : (
            <p className="text-2xl md:text-3xl font-semibold text-foreground mt-1">{value}</p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="shrink-0 p-2.5 md:p-3 bg-primary/20 rounded-xl">
          <Icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}

// Stats Card Skeleton
function StatsCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </div>
  );
}

// Event card component
function EventCard({ event }: { event: DashboardEvent }) {
  const formatDate = (dateStr: string) => {
    const date = toLocalDate(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    });
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CULTO: "Culto",
      SPECIAL: "Evento Especial",
    };
    return labels[type] || type;
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
      PUBLISHED: {
        icon: AlertCircle,
        color: "text-blue-400",
        bg: "bg-blue-400/10",
      },
      COMPLETED: {
        icon: CheckCircle2,
        color: "text-green-400",
        bg: "bg-green-400/10",
      },
    };
    return configs[status] || configs.PUBLISHED;
  };

  const config = getStatusConfig(event.status);
  const StatusIcon = config.icon;

  return (
    <Link
      href={`/eventos/${event.slug ?? event.id}`}
      className="block bg-card/50 rounded-xl p-4 border border-border hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-foreground">{event.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {getEventTypeLabel(event.type)}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(event.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(event.startTime)}
            </span>
          </div>
        </div>
        <div className={`p-2 rounded-lg ${config.bg}`}>
          <StatusIcon className={`h-4 w-4 ${config.color}`} />
        </div>
      </div>
    </Link>
  );
}

// Event Card Skeleton
function EventCardSkeleton() {
  return (
    <div className="bg-card/50 rounded-xl p-4 border border-border">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
          <div className="flex items-center gap-3 mt-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}

// Scale card component
function ScaleCard({
  schedule,
  onConfirm,
  onDecline,
  isConfirming,
  isDeclining,
}: {
  schedule: DashboardSchedule;
  onConfirm: () => void;
  onDecline: () => void;
  isConfirming: boolean;
  isDeclining: boolean;
}) {
  const formatDate = (date: Date | string) => {
    const d = toLocalDate(date);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    });
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    PENDING: {
      label: "Pendente",
      color: "border-primary bg-primary/10",
    },
    CONFIRMED: {
      label: "Confirmado",
      color: "border-green-500 bg-green-500/10",
    },
    DECLINED: {
      label: "Recusado",
      color: "border-red-500 bg-red-500/10",
    },
  };

  const config = statusConfig[schedule.status] || statusConfig.PENDING;
  const isPending = schedule.status === "PENDING";
  const isProcessing = isConfirming || isDeclining;

  return (
    <div className={`rounded-xl p-4 border-l-4 bg-card/50 ${config.color}`}>
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="font-medium text-foreground">{schedule.event.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {schedule.vacancy?.position?.name || schedule.position || schedule.ministry.name}
          </p>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(schedule.event.date)}
          </p>
        </div>
        {isPending && (
          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1 sm:flex-initial px-4 h-9 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConfirming ? "..." : "Aceitar"}
            </button>
            <button
              onClick={onDecline}
              disabled={isProcessing}
              className="flex-1 sm:flex-initial px-4 h-9 text-sm font-medium bg-muted text-muted-foreground rounded-lg hover:bg-muted/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeclining ? "..." : "Recusar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Scale Card Skeleton
function ScaleCardSkeleton() {
  return (
    <div className="rounded-xl p-4 border-l-4 bg-card/50 border-muted">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-24 mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-lg" />
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card/50 rounded-xl p-6 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
      <p className="text-foreground font-medium">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

export function DashboardContent({ userName, userId, greeting }: DashboardContentProps) {
  const { stats, events, pendingSchedules, isLoading, refetch } =
    useDashboardStats(userId);
  const queryClient = useQueryClient();
  const confirmSchedule = useConfirmSchedule();
  const declineSchedule = useDeclineSchedule();
  const { permissions, isAdmin } = usePermissions();
  const canViewReports = isAdmin || meetsLevel(permissions.reports, "view");

  const handleConfirm = async (scheduleId: string) => {
    try {
      await confirmSchedule.mutateAsync(scheduleId);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      console.error("Erro ao confirmar escala:", error);
    }
  };

  const handleDecline = async (scheduleId: string) => {
    try {
      await declineSchedule.mutateAsync({ scheduleId });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      console.error("Erro ao recusar escala:", error);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Greeting */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
            {greeting}, {userName}!
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Confira suas escalas e próximos eventos
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          aria-label="Atualizar dados"
          title="Atualizar dados"
        >
          <RefreshCw className={`h-5 w-5 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <StatsCard
              title="Próximos Eventos"
              value={stats.upcomingEventsCount}
              description="Próximos 30 dias"
              icon={Calendar}
            />
            <StatsCard
              title="Escalas Pendentes"
              value={stats.pendingSchedulesCount}
              description="Aguardando confirmação"
              icon={Clock}
            />
            <StatsCard
              title="Ministérios"
              value={stats.myMinistriesCount}
              description="Você participa"
              icon={Users}
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Próximos Eventos
            </h3>
            <Link
              href="/eventos"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <>
                <EventCardSkeleton />
                <EventCardSkeleton />
                <EventCardSkeleton />
              </>
            ) : events.length > 0 ? (
              events.slice(0, 5).map((event) => (
                <EventCard key={event.id} event={event} />
              ))
            ) : (
              <EmptyState
                icon={CalendarOff}
                title="Nenhum evento próximo"
                description="Não há eventos agendados para os próximos 30 dias"
              />
            )}
          </div>
        </div>

        {/* Pending Scales */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Minhas Escalas
            </h3>
            <Link
              href="/escalas"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <>
                <ScaleCardSkeleton />
                <ScaleCardSkeleton />
              </>
            ) : pendingSchedules.length > 0 ? (
              pendingSchedules.slice(0, 5).map((schedule) => (
                <ScaleCard
                  key={schedule.id}
                  schedule={schedule}
                  onConfirm={() => handleConfirm(schedule.id)}
                  onDecline={() => handleDecline(schedule.id)}
                  isConfirming={
                    confirmSchedule.isPending &&
                    confirmSchedule.variables === schedule.id
                  }
                  isDeclining={
                    declineSchedule.isPending &&
                    declineSchedule.variables?.scheduleId === schedule.id
                  }
                />
              ))
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="Todas as escalas confirmadas!"
                description="Você não tem escalas pendentes"
              />
            )}
          </div>
        </div>
      </div>

      {/* Reports Section */}
      {canViewReports && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Relatórios
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/relatorios/escalas">
              <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ListChecks className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Relatório de Escalas</CardTitle>
                      <CardDescription className="text-xs">
                        Exportar dados de escalas
                      </CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                      <FileText className="h-3 w-3" /> PDF
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                      <FileSpreadsheet className="h-3 w-3" /> Excel
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-card/30 rounded-2xl p-5 md:p-6 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Ações Rápidas
        </h3>
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <Link
            href="/eventos"
            className="flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl bg-card/50 hover:bg-card transition-colors group min-h-[88px] justify-center"
          >
            <Calendar className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs md:text-sm text-foreground text-center">Ver Eventos</span>
          </Link>
          <Link
            href="/escalas"
            className="flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl bg-card/50 hover:bg-card transition-colors group min-h-[88px] justify-center"
          >
            <Clock className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs md:text-sm text-foreground text-center">Minhas Escalas</span>
          </Link>
          <Link
            href="/ministerios"
            className="flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl bg-card/50 hover:bg-card transition-colors group min-h-[88px] justify-center"
          >
            <Users className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs md:text-sm text-foreground text-center">Ministérios</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
