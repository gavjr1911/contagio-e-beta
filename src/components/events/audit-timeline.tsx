"use client";

import * as React from "react";
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  User,
  UserPlus,
  UserMinus,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  useEventAuditLogs,
  type AuditLog,
  type AuditAction,
  type AuditEntityType,
  ACTION_LABELS,
  ENTITY_LABELS,
} from "@/hooks/use-audit";

// Icones por tipo de acao
const ACTION_ICONS: Record<AuditAction, React.ReactNode> = {
  created: <Plus className="h-4 w-4" />,
  updated: <Edit2 className="h-4 w-4" />,
  deleted: <Trash2 className="h-4 w-4" />,
  confirmed: <CheckCircle2 className="h-4 w-4" />,
  declined: <XCircle className="h-4 w-4" />,
  assigned: <UserPlus className="h-4 w-4" />,
  unassigned: <UserMinus className="h-4 w-4" />,
};

// Cores por tipo de acao
const ACTION_COLORS: Record<AuditAction, string> = {
  created: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  updated: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  deleted: "bg-red-500/10 text-red-500 border-red-500/20",
  confirmed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  declined: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  assigned: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  unassigned: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

// Formatar data relativa
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHour < 24) return `há ${diffHour}h`;
  if (diffDay < 7) return `há ${diffDay} dias`;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

// Formatar data completa
function formatFullDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

// Gerar descricao do log
function getLogDescription(log: AuditLog): string {
  const entityLabel = ENTITY_LABELS[log.entityType] || log.entityType;
  const changes = log.changes as Record<string, { old: unknown; new: unknown }> | null;

  // Para Schedule, mostrar informacoes mais detalhadas
  if (log.entityType === "Schedule" && changes) {
    const userName = changes.userName?.new as string | null;
    const ministryName = changes.ministryName?.new as string | null;
    const eventName = changes.eventName?.new as string | null;

    switch (log.action) {
      case "created":
        return userName
          ? `${userName} foi escalado${ministryName ? ` no ${ministryName}` : ""}`
          : `Escala criada${ministryName ? ` para ${ministryName}` : ""}`;
      case "deleted":
        const deletedUserName = changes.userName?.old as string | null;
        return deletedUserName
          ? `${deletedUserName} foi removido da escala`
          : "Escala removida";
      case "confirmed":
        return userName ? `${userName} confirmou participação` : "Participação confirmada";
      case "declined":
        const reason = changes.declinedReason?.new as string | null;
        return userName
          ? `${userName} recusou a escala${reason ? `: "${reason}"` : ""}`
          : "Escala recusada";
      case "updated":
        const statusChange = changes.status;
        if (statusChange) {
          return `Status alterado de ${statusChange.old} para ${statusChange.new}`;
        }
        return "Escala atualizada";
      default:
        return `${entityLabel} ${ACTION_LABELS[log.action]?.toLowerCase() || log.action}`;
    }
  }

  return `${entityLabel} ${ACTION_LABELS[log.action]?.toLowerCase() || log.action}`;
}

// Renderizar mudancas detalhadas
function renderChanges(changes: Record<string, { old: unknown; new: unknown }> | null) {
  if (!changes) return null;

  // Filtrar campos que nao queremos mostrar
  const hiddenFields = ["userName", "eventName", "ministryName", "eventId", "ministryId", "userId"];
  const visibleChanges = Object.entries(changes).filter(
    ([key]) => !hiddenFields.includes(key)
  );

  if (visibleChanges.length === 0) return null;

  return (
    <div className="mt-2 space-y-1 text-xs">
      {visibleChanges.map(([field, { old: oldVal, new: newVal }]) => {
        // Traduzir nomes de campos
        const fieldLabels: Record<string, string> = {
          status: "Status",
          position: "Função",
          declinedReason: "Motivo",
          name: "Nome",
          date: "Data",
        };
        const fieldLabel = fieldLabels[field] || field;

        // Formatar valores
        const formatValue = (val: unknown): string => {
          if (val === null || val === undefined) return "-";
          if (typeof val === "object") return JSON.stringify(val);
          return String(val);
        };

        return (
          <div key={field} className="flex items-center gap-2 text-muted-foreground">
            <span className="font-medium">{fieldLabel}:</span>
            {oldVal !== null && oldVal !== undefined && (
              <>
                <span className="line-through opacity-60">{formatValue(oldVal)}</span>
                <span>→</span>
              </>
            )}
            <span className="text-foreground">{formatValue(newVal)}</span>
          </div>
        );
      })}
    </div>
  );
}

interface AuditTimelineProps {
  eventId: string;
  className?: string;
}

export function AuditTimeline({ eventId, className }: AuditTimelineProps) {
  const { data, isLoading, error, refetch } = useEventAuditLogs(eventId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando histórico...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">Erro ao carregar histórico</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Tente novamente mais tarde"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const logs = data?.data || [];

  if (logs.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Mudanças
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum histórico disponível</p>
            <p className="text-sm mt-1">
              As mudanças nas escalas serão registradas aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Mudanças
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {logs.length} {logs.length === 1 ? "registro" : "registros"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative">
          {/* Linha vertical */}
          <div className="absolute left-5 top-2 bottom-2 w-px bg-border" />

          {/* Timeline items */}
          <div className="space-y-4">
            {logs.map((log, index) => (
              <div key={log.id} className="relative flex gap-4">
                {/* Icone */}
                <div
                  className={cn(
                    "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-background",
                    ACTION_COLORS[log.action as AuditAction] || "bg-muted text-muted-foreground"
                  )}
                >
                  {ACTION_ICONS[log.action as AuditAction] || <Edit2 className="h-4 w-4" />}
                </div>

                {/* Conteudo */}
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Descricao */}
                      <p className="font-medium text-sm">{getLogDescription(log)}</p>

                      {/* Usuario que fez a acao */}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {log.user ? (
                          <>
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={log.user.image || undefined} />
                              <AvatarFallback className="text-[8px]">
                                {log.user.name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span>{log.user.name || log.user.email}</span>
                          </>
                        ) : (
                          <>
                            <User className="h-3 w-3" />
                            <span>{log.userName || log.userEmail || "Sistema"}</span>
                          </>
                        )}
                      </div>

                      {/* Mudancas detalhadas */}
                      {renderChanges(log.changes as Record<string, { old: unknown; new: unknown }> | null)}
                    </div>

                    {/* Data */}
                    <div
                      className="text-xs text-muted-foreground shrink-0 cursor-help"
                      title={formatFullDate(log.createdAt)}
                    >
                      {formatRelativeTime(log.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AuditTimeline;
