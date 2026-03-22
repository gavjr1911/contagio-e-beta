/**
 * Offline Support Module
 *
 * This module provides offline capabilities for the Contagie Beta PWA.
 * It includes IndexedDB caching for schedules and events data.
 */

export {
  // Types
  type CachedSchedule,
  type CachedEvent,

  // Schedule functions
  cacheSchedules,
  getCachedSchedules,
  getCachedScheduleById,
  clearScheduleCache,

  // Event functions
  cacheEvents,
  getCachedEvents,
  getCachedEventById,
  clearEventsCache,

  // Utility functions
  isCacheExpired,
  getCacheLastUpdated,
  clearAllCache,
  getCacheStats,
} from "./cache";
