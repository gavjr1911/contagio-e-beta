import { prisma } from "@/lib/prisma"
import { RecurrencePattern } from "@/generated/prisma/client"
import { buildEventSlug } from "@/lib/slug"
import { addDays, addMonths, isOnOrBeforeDay } from "@/lib/date-utils"

async function generateUniqueEventSlug(base: string): Promise<string> {
  let candidate = base
  let counter = 2
  while (true) {
    const existing = await prisma.event.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing) return candidate
    candidate = `${base}-${counter}`
    counter += 1
  }
}

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
  checklistTemplateId?: string | null
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
 * - MONTHLY: Add 1 month each iteration (clamp no fim do mês — ver getNextDate)
 *
 * The startDate is NOT included in the output (it represents the parent event).
 * Stops when the generated date exceeds endDate or after MAX_OCCURRENCES.
 * `endDate` é INCLUSIVO: uma ocorrência que cai exatamente no dia de término
 * é gerada. A comparação é por dia-calendário (UTC) porque `startDate` chega
 * do Prisma à meia-noite UTC e `endDate` vem de `parseLocalDate()` ao meio-dia
 * UTC — âncoras diferentes, mesmo modelo.
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

    // Stop if we've exceeded the end date (comparação por dia-calendário)
    if (!isOnOrBeforeDay(currentDate, config.endDate)) {
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
 * Toda a aritmética usa os helpers de `@/lib/date-utils`, que operam sobre os
 * componentes UTC (modelo "wall-clock ancorado em UTC"). É PROIBIDO usar
 * `setDate()/getDate()/setMonth()/getMonth()` locais aqui: `Event.date` é
 * @db.Date (meia-noite UTC) e, em São Paulo (UTC-3), o dia LOCAL desse valor é
 * o dia anterior às 21:00 — o que fazia a recorrência mensal saltar um mês
 * (31/01 → 01/03 em vez de 28/02).
 *
 * MONTHLY faz clamp no último dia do mês de destino (ver `addMonths`), e a
 * próxima ocorrência é contada a partir da data já clampada — ou seja, a série
 * "dia 31" degrada para o menor dia já visitado (31/01 → 28/02 → 28/03 → …).
 * Esse é o comportamento histórico (o que o código já fazia sob TZ=UTC) e foi
 * mantido de propósito.
 *
 * @param currentDate - The current date
 * @param pattern - The recurrence pattern (WEEKLY, BIWEEKLY, MONTHLY)
 * @returns The next date according to the pattern
 */
function getNextDate(currentDate: Date, pattern: RecurrencePattern): Date {
  switch (pattern) {
    case "WEEKLY":
      return addDays(currentDate, 7)

    case "BIWEEKLY":
      return addDays(currentDate, 14)

    case "MONTHLY":
      // Jan 31 -> Feb 28/29 (clamp no último dia do mês de destino)
      return addMonths(currentDate, 1)

    default:
      throw new Error(`Unknown recurrence pattern: ${pattern}`)
  }
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
    // Gerar slug unico para o evento filho
    const baseSlug = buildEventSlug({
      name: parentEvent.name,
      date,
      startTime: parentEvent.startTime,
    })
    const slug = await generateUniqueEventSlug(baseSlug)

    // Create the child event
    const childEvent = await prisma.event.create({
      data: {
        name: parentEvent.name,
        slug,
        type: parentEvent.type as "CULTO" | "SPECIAL",
        date: date,
        startTime: parentEvent.startTime,
        endTime: parentEvent.endTime,
        templateId: parentEvent.templateId,
        checklistTemplateId: parentEvent.checklistTemplateId,
        isRecurring: true,
        parentEventId: parentEvent.id,
        status: "PUBLISHED",
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
