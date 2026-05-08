"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCachedSchedules, getCachedEvents } from "@/lib/offline/cache";

interface CachedSchedule {
  id: string;
  date: string;
  eventName: string;
  role?: string;
}

interface CachedEvent {
  id: string;
  name: string;
  date: string;
  location?: string;
}

export default function OfflinePage() {
  const [cachedSchedules, setCachedSchedules] = useState<CachedSchedule[]>([]);
  const [cachedEvents, setCachedEvents] = useState<CachedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const [schedules, events] = await Promise.all([
          getCachedSchedules(),
          getCachedEvents(),
        ]);
        setCachedSchedules(schedules || []);
        setCachedEvents(events || []);
      } catch (error) {
        console.error("Erro ao carregar dados em cache:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCachedData();
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.href = "/";
    } else {
      window.location.reload();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const [y, m, d] = dateString.split("T")[0].split("-").map(Number);
      const date = /^\d{4}-\d{2}-\d{2}/.test(dateString)
        ? new Date(y, (m || 1) - 1, d || 1, 12, 0, 0)
        : new Date(dateString);
      return date.toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        timeZone: "America/Sao_Paulo",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Offline Status Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted">
            <WifiOff className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Voce esta offline
          </h1>
          <p className="text-muted-foreground">
            Parece que voce perdeu a conexao com a internet. Verifique sua conexao e tente novamente.
          </p>
        </div>

        {/* Retry Button */}
        <Button
          onClick={handleRetry}
          className="w-full"
          size="lg"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {isOnline ? "Voltar ao inicio" : "Tentar novamente"}
        </Button>

        {/* Cached Data Section */}
        {!isLoading && (cachedSchedules.length > 0 || cachedEvents.length > 0) && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Dados salvos anteriormente</span>
            </div>

            {/* Cached Schedules */}
            {cachedSchedules.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Suas escalas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cachedSchedules.slice(0, 5).map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {schedule.eventName}
                        </p>
                        {schedule.role && (
                          <p className="text-xs text-muted-foreground">
                            {schedule.role}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(schedule.date)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Cached Events */}
            {cachedEvents.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Proximos eventos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cachedEvents.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {event.name}
                        </p>
                        {event.location && (
                          <p className="text-xs text-muted-foreground">
                            {event.location}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(event.date)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* No Cached Data */}
        {!isLoading && cachedSchedules.length === 0 && cachedEvents.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Nenhum dado em cache disponivel. Conecte-se a internet para carregar seus dados.
          </p>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Carregando dados em cache...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
