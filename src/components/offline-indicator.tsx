"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi, CloudOff, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOfflineStatus, useServiceWorker } from "@/hooks/use-offline";
import { Button } from "@/components/ui/button";

interface OfflineIndicatorProps {
  className?: string;
  showUpdatePrompt?: boolean;
}

/**
 * Banner component that shows when the user is offline
 */
export function OfflineBanner({ className }: OfflineIndicatorProps) {
  const { isOffline, wasOffline, isOnline, clearWasOffline } = useOfflineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      setDismissed(false);

      // Hide reconnected message after 3 seconds
      const timer = setTimeout(() => {
        setShowReconnected(false);
        clearWasOffline();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, clearWasOffline]);

  // Show offline banner
  if (isOffline && !dismissed) {
    return (
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "bg-destructive text-destructive-foreground",
          "px-4 py-2",
          "flex items-center justify-center gap-2",
          "animate-in slide-in-from-top duration-300",
          className
        )}
      >
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">
          Você está offline. Alguns recursos podem estar indisponíveis.
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="ml-2 p-1 hover:bg-destructive-foreground/10 rounded"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Show reconnected banner
  if (showReconnected) {
    return (
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "bg-green-600 text-white",
          "px-4 py-2",
          "flex items-center justify-center gap-2",
          "animate-in slide-in-from-top duration-300",
          className
        )}
      >
        <Wifi className="w-4 h-4" />
        <span className="text-sm font-medium">Conexão restabelecida!</span>
      </div>
    );
  }

  return null;
}

/**
 * Badge component that shows offline/cache status
 */
export function OfflineBadge({
  className,
  isFromCache,
  lastUpdated,
}: {
  className?: string;
  isFromCache?: boolean;
  lastUpdated?: Date | null;
}) {
  const { isOffline } = useOfflineStatus();

  if (!isOffline && !isFromCache) return null;

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return "Desconhecido";

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Agora mesmo";
    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full",
        "text-xs font-medium",
        isOffline
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground",
        className
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Offline</span>
        </>
      ) : (
        <>
          <CloudOff className="w-3 h-3" />
          <span>Cache: {formatLastUpdated(lastUpdated ?? null)}</span>
        </>
      )}
    </div>
  );
}

/**
 * Floating indicator for offline status
 */
export function OfflineFloatingIndicator({ className }: OfflineIndicatorProps) {
  const { isOffline } = useOfflineStatus();

  if (!isOffline) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "flex items-center gap-2",
        "bg-destructive text-destructive-foreground",
        "px-3 py-2 rounded-full shadow-lg",
        "animate-in fade-in slide-in-from-bottom duration-300",
        className
      )}
    >
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">Offline</span>
    </div>
  );
}

/**
 * Service Worker Update Prompt
 */
export function UpdatePrompt({ className }: OfflineIndicatorProps) {
  const { updateAvailable, skipWaiting } = useServiceWorker();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50",
        "bg-card border border-border rounded-lg shadow-lg",
        "p-4",
        "animate-in fade-in slide-in-from-bottom duration-300",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <RefreshCw className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-sm text-foreground">
            Atualização disponível
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Uma nova versão do aplicativo está disponível.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={skipWaiting}>
              Atualizar agora
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
            >
              Depois
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Combined offline indicator with all features
 */
export function OfflineIndicator({
  className,
  showUpdatePrompt = true,
}: OfflineIndicatorProps) {
  return (
    <>
      <OfflineBanner className={className} />
      {showUpdatePrompt && <UpdatePrompt />}
    </>
  );
}

export default OfflineIndicator;
