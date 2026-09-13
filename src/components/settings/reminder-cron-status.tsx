"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ReminderRunStatus } from "@/lib/cron/last-run";

async function fetchCronStatus(): Promise<ReminderRunStatus> {
  const response = await fetch("/api/settings/cron-status");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao carregar status do cron");
  }
  const result = await response.json();
  return result.data;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatAge(ageMs: number | null): string | null {
  if (ageMs === null) return null;
  const hours = Math.floor(ageMs / (60 * 60 * 1000));
  if (hours < 1) return "há menos de 1 hora";
  if (hours < 48) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)} dias`;
}

/**
 * Mostra o resultado da última execução do cron de lembretes, para que a
 * liderança perceba uma falha sem precisar abrir os logs do Railway.
 */
export function ReminderCronStatus() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["settings", "cron-status"],
    queryFn: fetchCronStatus,
  });

  const isAlert = data ? data.health !== "ok" : false;

  return (
    <Card className="lg:col-span-2 xl:col-span-1">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          <CardTitle>Lembretes Automáticos</CardTitle>
        </div>
        <CardDescription>
          Última execução do envio diário de lembretes de escala
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {error instanceof Error ? error.message : "Erro desconhecido"}
            </p>
          </div>
        ) : data ? (
          <>
            <div
              className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
                isAlert
                  ? "bg-destructive/10 text-destructive"
                  : "bg-green-500/10 text-green-600"
              }`}
            >
              {isAlert ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div className="space-y-1">
                <p className="font-medium">
                  {isAlert ? "Atenção: verifique os lembretes" : "Funcionando normalmente"}
                </p>
                {data.reasons.length > 0 && (
                  <ul className="list-inside list-disc text-xs opacity-90">
                    {data.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {data.lastRun ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Última execução</span>
                  <span className="font-medium">
                    {formatDateTime(data.lastRun.ranAt)}
                    {formatAge(data.ageMs) ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({formatAge(data.ageMs)})
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Enviados</span>
                  <span className="font-medium">{data.lastRun.sent}</span>
                </div>
                {/*
                  Sem esta linha, "0 enviados / 0 falhas" fica ambiguo: nao da
                  para distinguir "nao havia lembrete para hoje" de "ja tinham
                  sido enviados" ou de "a busca nao encontrou nada". Foi essa
                  ambiguidade que deixou o cron quebrado por 30 dias sem ninguem
                  perceber.
                */}
                {typeof data.lastRun.skipped === "number" && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      Ja enviados antes
                    </span>
                    <span className="font-medium">{data.lastRun.skipped}</span>
                  </div>
                )}
                {typeof data.lastRun.schedulesCovered === "number" && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      Escalas cobertas
                    </span>
                    <span className="font-medium">
                      {data.lastRun.schedulesCovered}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Falhas</span>
                  <span
                    className={`font-medium ${
                      data.lastRun.failed > 0 ? "text-destructive" : ""
                    }`}
                  >
                    {data.lastRun.failed}
                  </span>
                </div>
                {data.lastRun.errors && data.lastRun.errors.length > 0 && (
                  <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                    <p className="mb-1 font-medium text-foreground">
                      Detalhes das falhas
                    </p>
                    <ul className="list-inside list-disc space-y-0.5">
                      {data.lastRun.errors.map((detail, index) => (
                        <li key={`${detail}-${index}`}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma execução registrada até agora.
              </p>
            )}
          </>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar
        </Button>
      </CardFooter>
    </Card>
  );
}
