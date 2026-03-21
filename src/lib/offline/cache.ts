/**
 * IndexedDB Cache Manager for Offline Support
 *
 * Provides functions to cache and retrieve schedules and events data
 * for offline access in the Contagio e Beta PWA.
 */

const DB_NAME = "contagio-beta-offline";
const DB_VERSION = 1;
const SCHEDULES_STORE = "schedules";
const EVENTS_STORE = "events";
const METADATA_STORE = "metadata";

// Types
export interface CachedSchedule {
  id: string;
  date: string;
  eventName: string;
  eventId?: string;
  role?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CachedEvent {
  id: string;
  name: string;
  date: string;
  location?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CacheMetadata {
  key: string;
  lastUpdated: number;
  expiresAt: number;
}

// Cache expiration time (7 days)
const CACHE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Opens the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open database"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create schedules store
      if (!db.objectStoreNames.contains(SCHEDULES_STORE)) {
        const schedulesStore = db.createObjectStore(SCHEDULES_STORE, { keyPath: "id" });
        schedulesStore.createIndex("date", "date", { unique: false });
        schedulesStore.createIndex("eventId", "eventId", { unique: false });
      }

      // Create events store
      if (!db.objectStoreNames.contains(EVENTS_STORE)) {
        const eventsStore = db.createObjectStore(EVENTS_STORE, { keyPath: "id" });
        eventsStore.createIndex("date", "date", { unique: false });
        eventsStore.createIndex("name", "name", { unique: false });
      }

      // Create metadata store
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: "key" });
      }
    };
  });
}

/**
 * Updates cache metadata
 */
async function updateMetadata(key: string): Promise<void> {
  const db = await openDatabase();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], "readwrite");
    const store = transaction.objectStore(METADATA_STORE);

    const metadata: CacheMetadata = {
      key,
      lastUpdated: now,
      expiresAt: now + CACHE_EXPIRATION_MS,
    };

    const request = store.put(metadata);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error("Failed to update metadata"));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Gets cache metadata
 */
async function getMetadata(key: string): Promise<CacheMetadata | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], "readonly");
    const store = transaction.objectStore(METADATA_STORE);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => reject(new Error("Failed to get metadata"));

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Checks if cache is expired
 */
export async function isCacheExpired(key: string): Promise<boolean> {
  try {
    const metadata = await getMetadata(key);
    if (!metadata) return true;
    return Date.now() > metadata.expiresAt;
  } catch {
    return true;
  }
}

/**
 * Gets the last update time for a cache
 */
export async function getCacheLastUpdated(key: string): Promise<Date | null> {
  try {
    const metadata = await getMetadata(key);
    if (!metadata) return null;
    return new Date(metadata.lastUpdated);
  } catch {
    return null;
  }
}

/**
 * Caches user schedules in IndexedDB
 */
export async function cacheSchedules(schedules: CachedSchedule[]): Promise<void> {
  if (!schedules || schedules.length === 0) return;

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SCHEDULES_STORE], "readwrite");
    const store = transaction.objectStore(SCHEDULES_STORE);

    // Clear existing data
    store.clear();

    // Add new schedules
    schedules.forEach((schedule) => {
      store.add({
        ...schedule,
        cachedAt: Date.now(),
      });
    });

    transaction.oncomplete = async () => {
      db.close();
      await updateMetadata(SCHEDULES_STORE);
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error("Failed to cache schedules"));
    };
  });
}

/**
 * Retrieves cached schedules from IndexedDB
 */
export async function getCachedSchedules(): Promise<CachedSchedule[]> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SCHEDULES_STORE], "readonly");
      const store = transaction.objectStore(SCHEDULES_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const schedules = request.result || [];
        // Sort by date descending
        schedules.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        resolve(schedules);
      };

      request.onerror = () => reject(new Error("Failed to get cached schedules"));

      transaction.oncomplete = () => db.close();
    });
  } catch {
    return [];
  }
}

/**
 * Gets a single cached schedule by ID
 */
export async function getCachedScheduleById(id: string): Promise<CachedSchedule | null> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SCHEDULES_STORE], "readonly");
      const store = transaction.objectStore(SCHEDULES_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error("Failed to get cached schedule"));

      transaction.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

/**
 * Caches events in IndexedDB
 */
export async function cacheEvents(events: CachedEvent[]): Promise<void> {
  if (!events || events.length === 0) return;

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EVENTS_STORE], "readwrite");
    const store = transaction.objectStore(EVENTS_STORE);

    // Clear existing data
    store.clear();

    // Add new events
    events.forEach((event) => {
      store.add({
        ...event,
        cachedAt: Date.now(),
      });
    });

    transaction.oncomplete = async () => {
      db.close();
      await updateMetadata(EVENTS_STORE);
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error("Failed to cache events"));
    };
  });
}

/**
 * Retrieves cached events from IndexedDB
 */
export async function getCachedEvents(): Promise<CachedEvent[]> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EVENTS_STORE], "readonly");
      const store = transaction.objectStore(EVENTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const events = request.result || [];
        // Sort by date ascending (upcoming events first)
        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        resolve(events);
      };

      request.onerror = () => reject(new Error("Failed to get cached events"));

      transaction.oncomplete = () => db.close();
    });
  } catch {
    return [];
  }
}

/**
 * Gets a single cached event by ID
 */
export async function getCachedEventById(id: string): Promise<CachedEvent | null> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([EVENTS_STORE], "readonly");
      const store = transaction.objectStore(EVENTS_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error("Failed to get cached event"));

      transaction.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

/**
 * Clears all cached data
 */
export async function clearAllCache(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [SCHEDULES_STORE, EVENTS_STORE, METADATA_STORE],
      "readwrite"
    );

    transaction.objectStore(SCHEDULES_STORE).clear();
    transaction.objectStore(EVENTS_STORE).clear();
    transaction.objectStore(METADATA_STORE).clear();

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error("Failed to clear cache"));
    };
  });
}

/**
 * Clears only schedule cache
 */
export async function clearScheduleCache(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SCHEDULES_STORE], "readwrite");
    const store = transaction.objectStore(SCHEDULES_STORE);
    store.clear();

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error("Failed to clear schedule cache"));
    };
  });
}

/**
 * Clears only events cache
 */
export async function clearEventsCache(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([EVENTS_STORE], "readwrite");
    const store = transaction.objectStore(EVENTS_STORE);
    store.clear();

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(new Error("Failed to clear events cache"));
    };
  });
}

/**
 * Gets cache statistics
 */
export async function getCacheStats(): Promise<{
  schedulesCount: number;
  eventsCount: number;
  schedulesLastUpdated: Date | null;
  eventsLastUpdated: Date | null;
}> {
  const [schedules, events, schedulesMetadata, eventsMetadata] = await Promise.all([
    getCachedSchedules(),
    getCachedEvents(),
    getMetadata(SCHEDULES_STORE),
    getMetadata(EVENTS_STORE),
  ]);

  return {
    schedulesCount: schedules.length,
    eventsCount: events.length,
    schedulesLastUpdated: schedulesMetadata ? new Date(schedulesMetadata.lastUpdated) : null,
    eventsLastUpdated: eventsMetadata ? new Date(eventsMetadata.lastUpdated) : null,
  };
}
