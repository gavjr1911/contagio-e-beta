import { prisma } from "@/lib/prisma"
import {
  LAST_REMINDER_RUN_KEY,
  buildReminderRun,
  parseReminderRun,
  type ReminderRunRecord,
} from "./last-run"

/**
 * Persistencia do registro de ultima execucao do cron de lembretes.
 * Usa o model `AppSettings` ja existente (key/value) — sem migration.
 */
export async function recordReminderRun(input: {
  sent: number
  failed: number
  error?: string
  errors?: string[]
  skipped?: number
  schedulesCovered?: number
  ranAt?: Date
}): Promise<void> {
  const record = buildReminderRun(input)
  const value = JSON.stringify(record)

  await prisma.appSettings.upsert({
    where: { key: LAST_REMINDER_RUN_KEY },
    create: { key: LAST_REMINDER_RUN_KEY, value, encrypted: false },
    update: { value, encrypted: false },
  })
}

export async function readLastReminderRun(): Promise<ReminderRunRecord | null> {
  const setting = await prisma.appSettings.findUnique({
    where: { key: LAST_REMINDER_RUN_KEY },
  })

  return parseReminderRun(setting?.value)
}
