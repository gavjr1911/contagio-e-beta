"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCachedSchedules,
  getCachedEvents,
  getCacheLastUpdated,
  isCacheExpired,
  type CachedSchedule,
  type CachedEvent,
} from "@/lib/offline/cache";

/**
 * Hook to detect online/offline status
 */
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Track that we were offline to show reconnection message
      if (!navigator.onLine) {
        setWasOffline(true);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const clearWasOffline = useCallback(() => {
    setWasOffline(false);
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    clearWasOffline,
  };
}

/**
 * Hook to get cached schedules data
 */
export function useCachedSchedules() {
  const [data, setData] = useState<CachedSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [schedules, updated, expired] = await Promise.all([
        getCachedSchedules(),
        getCacheLastUpdated("schedules"),
        isCacheExpired("schedules"),
      ]);

      setData(schedules);
      setLastUpdated(updated);
      setIsExpired(expired);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load cached schedules"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    isExpired,
    refresh,
    hasData: data.length > 0,
  };
}

/**
 * Hook to get cached events data
 */
export function useCachedEvents() {
  const [data, setData] = useState<CachedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [events, updated, expired] = await Promise.all([
        getCachedEvents(),
        getCacheLastUpdated("events"),
        isCacheExpired("events"),
      ]);

      setData(events);
      setLastUpdated(updated);
      setIsExpired(expired);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load cached events"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    isExpired,
    refresh,
    hasData: data.length > 0,
  };
}

/**
 * Generic hook to get cached data with key
 */
export function useCachedData<T>(
  key: "schedules" | "events",
  fetchFn: () => Promise<T[]>
) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [result, updated, expired] = await Promise.all([
        fetchFn(),
        getCacheLastUpdated(key),
        isCacheExpired(key),
      ]);

      setData(result);
      setLastUpdated(updated);
      setIsExpired(expired);
      setIsFromCache(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Failed to load cached ${key}`));
    } finally {
      setIsLoading(false);
    }
  }, [key, fetchFn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    isExpired,
    isFromCache,
    refresh,
    hasData: data.length > 0,
  };
}

/**
 * Hook to check service worker status
 */
export function useServiceWorker() {
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported = "serviceWorker" in navigator;
    setIsSupported(supported);

    if (!supported) return;

    // Check current registration
    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);
      setIsRegistered(true);

      // Listen for updates
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        }
      });
    });
  }, []);

  const update = useCallback(async () => {
    if (registration) {
      await registration.update();
    }
  }, [registration]);

  const skipWaiting = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  }, [registration]);

  return {
    isSupported,
    isRegistered,
    registration,
    updateAvailable,
    update,
    skipWaiting,
  };
}

/**
 * Hook for comprehensive offline-first data management
 */
export function useOfflineFirst<T>(
  fetchOnline: () => Promise<T[]>,
  getCached: () => Promise<T[]>,
  cacheData: (data: T[]) => Promise<void>,
  cacheKey: string
) {
  const { isOnline } = useOfflineStatus();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isOnline) {
        // Try to fetch fresh data
        try {
          const freshData = await fetchOnline();
          setData(freshData);
          setIsFromCache(false);
          setLastUpdated(new Date());

          // Cache the fresh data
          await cacheData(freshData);
        } catch {
          // Fall back to cache if online fetch fails
          const cachedData = await getCached();
          setData(cachedData);
          setIsFromCache(true);
          const updated = await getCacheLastUpdated(cacheKey);
          setLastUpdated(updated);
        }
      } else {
        // Load from cache when offline
        const cachedData = await getCached();
        setData(cachedData);
        setIsFromCache(true);
        const updated = await getCacheLastUpdated(cacheKey);
        setLastUpdated(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load data"));
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, fetchOnline, getCached, cacheData, cacheKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh when coming back online
  useEffect(() => {
    if (isOnline && isFromCache) {
      refresh();
    }
  }, [isOnline, isFromCache, refresh]);

  return {
    data,
    isLoading,
    error,
    isFromCache,
    lastUpdated,
    refresh,
    hasData: data.length > 0,
  };
}
