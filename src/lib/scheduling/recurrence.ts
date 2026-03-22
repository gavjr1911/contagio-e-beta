import { prisma } from "@/lib/prisma"
import { RecurrencePattern } from "@/generated/prisma/client"

// ============================================
// TYPES & INTERFACES
// ============================================

export interface RecurrenceConfig {
  pattern: RecurrencePattern
  endDate: Date
}

export interface EventData {
  name: string
  type: string
  date: Date
  startTime: Date
  endTime?: Date | null
  templateId?: string | null
}

// Maximum number of occurrences to generate (safety limit)
const MAX_OCCURRENCES = 52

// ============================================
// DATE GENERATION
// ============================================

/**
 * Generate dates for recurring events based on the recurrence pattern.
 *
 * - WEEKLY: Add 7 days each iteration
 * - BIWEEKLY: Add 14 days each iteration
 * - MONTHLY: Add 1 month each iteration (handles month boundary correctly)
 *
 * The startDate is NOT included in the output (it represents the parent event).
 * Stops when the generated date exceeds endDate or after MAX_OCCURRENCES.
 *
 * @param startDate - The date of the parent event
 * @param config - Recurrence configuration with pattern and end date
 * @returns Array of dates for recurring events
 */
export function generateRecurringDates(
  startDate: Date,
  config: RecurrenceConfig
): Date[] {
  const dates: Date[] = []
  let currentDate = new Date(startDate)
  let occurrenceCount = 0

  while (occurrenceCount < MAX_OCCURRENCES) {
    // Advance to the next occurrence based on pattern
    currentDate = getNextDate(currentDate, config.pattern)

    // Stop if we've exceeded the end date
    if (currentDate > config.endDate) {
      break
    }

    dates.push(new Date(currentDate))
    occurrenceCount++
  }

  return dates
}

/**
 * Calculate the next date based on the recurrence pattern.
 *
 * @param currentDate - The current date
 * @param pattern - The recurrence pattern (WEEKLY, BIWEEKLY, MONTHLY)
 * @returns The next date according to the pattern
 */
function getNextDate(currentDate: Date, pattern: RecurrencePattern): Date {
  const nextDate = new Date(currentDate)

  switch (pattern) {
    case "WEEKLY":
      nextDate.setDate(nextDate.getDate() + 7)
      break

    case "BIWEEKLY":
      nextDate.setDate(nextDate.getDate() + 14)
      break

    case "MONTHLY":
      // Handle month boundary correctly
      // e.g., Jan 31 -> Feb 28/29 (last day of month)
      const originalDay = currentDate.getDate()
      nextDate.setMonth(nextDate.getMonth() + 1)

      // If the day changed (e.g., 31 -> 28), it means we overflowed
      // Set to the last day of the previous month
      if (nextDate.getDate() !== originalDay) {
        nextDate.setDate(0) // Sets to last day of previous month
      }
      break

    default:
      throw new Error(`Unknown recurrence pattern: ${pattern}`)
  }

  return nextDate
}

// ============================================
// VACANCY COPYING
// ============================================

/**
 * Copy vacancies from one event to another.
 *
 * Fetches all vacancies from the source event and creates the same
 * vacancies for the target event. Handles duplicates gracefully by
 * skipping if a vacancy with the same event/ministry/position already exists.
 *
 * @param sourceEventId - The ID of the event to copy vacancies from
 * @param targetEventId - The ID of the event to copy vacancies to
 */
export async function copyVacanciesToEvent(
  sourceEventId: string,
  targetEventId: string
): Promise<void> {
  // Fetch all vacancies from the source event
  const sourceVacancies = await prisma.eventVacancy.findMany({
    where: { eventId: sourceEventId },
    select: {
      ministryId: true,
      positionId: true,
      quantity: true,
    },
  })

  if (sourceVacancies.length === 0) {
    return
  }

  // Create vacancies for the target event
  for (const vacancy of sourceVacancies) {
    try {
      await prisma.eventVacancy.create({
        data: {
          eventId: targetEventId,
          ministryId: vacancy.ministryId,
          positionId: vacancy.positionId,
          quantity: vacancy.quantity,
        },
      })
    } catch (error) {
      // Handle duplicate gracefully (unique constraint on eventId, ministryId, positionId)
      // If the vacancy already exists, skip it
      if (
        error instanceof Error &&
        error.message.includes("Unique constraint")
      ) {
        // Vacancy already exists, skip
        continue
      }
      // Re-throw other errors
      throw error
    }
  }
}

// ============================================
// RECURRING EVENT CREATION
// ============================================

/**
 * Create recurring events in the database.
 *
 * Generates dates based on the recurrence pattern, creates child events
 * with parentEventId pointing to the parent event, and copies vacancies
 * from the parent to each child event.
 *
 * @param parentEvent - The parent event data including its ID
 * @param config - Recurrence configuration with pattern and end date
 * @returns Array of IDs of the created child events
 */
export async function createRecurringEvents(
  parentEvent: { id: string } & EventData,
  config: RecurrenceConfig
): Promise<string[]> {
  // Generate dates for recurring events
  const dates = generateRecurringDates(parentEvent.date, config)

  if (dates.length === 0) {
    return []
  }

  const createdEventIds: string[] = []

  // Create each child event
  for (const date of dates) {
    // Create the child event
    const childEvent = await prisma.event.create({
      data: {
        name: parentEvent.name,
        type: parentEvent.type as "SUNDAY_MORNING" | "SUNDAY_EVENING" | "SPECIAL",
        date: date,
        startTime: parentEvent.startTime,
        endTime: parentEvent.endTime,
        templateId: parentEvent.templateId,
        isRecurring: true,
        parentEventId: parentEvent.id,
        status: "DRAFT",
      },
    })

    createdEventIds.push(childEvent.id)

    // Copy vacancies from parent to child
    await copyVacanciesToEvent(parentEvent.id, childEvent.id)
  }

  return createdEventIds
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Delete all child events of a parent event.
 * Useful when changing recurrence pattern or canceling recurring series.
 *
 * @param parentEventId - The ID of the parent event
 * @returns Number of deleted child events
 */
export async function deleteChildEvents(
  parentEventId: string
): Promise<number> {
  const result = await prisma.event.deleteMany({
    where: {
      parentEventId: parentEventId,
    },
  })

  return result.count
}

/**
 * Get all child events of a parent event.
 *
 * @param parentEventId - The ID of the parent event
 * @returns Array of child events ordered by date
 */
export async function getChildEvents(parentEventId: string) {
  return prisma.event.findMany({
    where: {
      parentEventId: parentEventId,
    },
    orderBy: {
      date: "asc",
    },
  })
}

/**
 * Update recurrence for an existing event series.
 * Deletes existing child events and creates new ones based on the new config.
 *
 * @param parentEventId - The ID of the parent event
 * @param parentEventData - The parent event data
 * @param config - New recurrence configuration
 * @returns Array of IDs of the newly created child events
 */
export async function updateRecurrence(
  parentEventId: string,
  parentEventData: EventData,
  config: RecurrenceConfig
): Promise<string[]> {
  // Delete existing child events
  await deleteChildEvents(parentEventId)

  // Create new child events with the new configuration
  return createRecurringEvents(
    { id: parentEventId, ...parentEventData },
    config
  )
}
