import { render } from "@react-email/components"
import { sendEmail, sendBatchEmails, SendEmailResult } from "./client"
import { ScheduleInviteEmail, ScheduleInviteEmailProps } from "./templates/schedule-invite"
import { ScheduleReminderEmail, ScheduleReminderEmailProps } from "./templates/schedule-reminder"
import { ScheduleConfirmedEmail, ScheduleConfirmedEmailProps } from "./templates/schedule-confirmed"
import { ScheduleChangedEmail, ScheduleChangedEmailProps } from "./templates/schedule-changed"
import { SetlistUpdateEmail, SetlistUpdateEmailProps } from "./templates/setlist-update"
import { UserInviteEmail, UserInviteEmailProps } from "./templates/user-invite"
import { prisma } from "@/lib/prisma"
import { createHmac } from "crypto"
import { format } from "date-fns"

// Base URL da aplicacao
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.beta.church"

// Dias de antecedencia para lembrete
const REMINDER_DAYS_BEFORE = [7, 3, 1]

/**
 * Formata o horario de um evento a partir de startTime (Date)
 */
function formatEventTime(startTime: Date): string {
  return format(new Date(startTime), "HH:mm")
}

// Expiracao do token em 24 horas (em milissegundos)
export const TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000

/**
 * Gera um token unico para confirmacao de escala com HMAC e timestamp
 * Formato: <timestamp_base64>.<hmac_signature>
 */
function generateConfirmToken(scheduleId: string, action: "confirm" | "decline"): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.EMAIL_TOKEN_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET ou EMAIL_TOKEN_SECRET não configurado — defina a variável de ambiente");
  }
  const timestamp = Date.now()

  // Codifica o timestamp em base64 URL-safe
  const timestampBase64 = Buffer.from(timestamp.toString()).toString("base64url")

  // Gera HMAC com scheduleId, action e timestamp
  const data = `${scheduleId}:${action}:${timestamp}`
  const hmac = createHmac("sha256", secret).update(data).digest("base64url")

  // Retorna token no formato: timestamp.hmac (truncado para 32 chars no hmac)
  return `${timestampBase64}.${hmac.substring(0, 32)}`
}

/**
 * Gera URLs de confirmacao/recusa para a escala
 */
function generateActionUrls(scheduleId: string) {
  const confirmToken = generateConfirmToken(scheduleId, "confirm")
  const declineToken = generateConfirmToken(scheduleId, "decline")

  return {
    confirmUrl: `${APP_URL}/api/email/confirm/${scheduleId}?action=confirm&token=${confirmToken}`,
    declineUrl: `${APP_URL}/api/email/confirm/${scheduleId}?action=decline&token=${declineToken}`,
    eventUrl: `${APP_URL}/events/${scheduleId}`,
  }
}

/**
 * Interface de Schedule com dados necessarios para envio de email
 * Usa os campos reais do modelo Prisma: startTime em vez de time, sem location
 */
interface ScheduleWithRelations {
  id: string
  eventId: string
  ministryId: string
  userId: string
  position: string | null
  status: string
  event: {
    id: string
    name: string
    date: Date
    startTime: Date
    endTime?: Date | null
  }
  ministry: {
    id: string
    name: string
  }
  user: {
    id: string
    name: string | null
    email: string | null
  }
}

/**
 * Envia email de convite para escala
 */
export async function sendScheduleInvite(
  schedule: ScheduleWithRelations
): Promise<SendEmailResult> {
  if (!schedule.user.email) {
    return { success: false, error: "Usuario sem email cadastrado" }
  }

  const { confirmUrl, declineUrl } = generateActionUrls(schedule.id)

  const props: ScheduleInviteEmailProps = {
    userName: schedule.user.name || "Voluntario",
    eventName: schedule.event.name,
    eventDate: schedule.event.date,
    eventTime: formatEventTime(schedule.event.startTime),
    ministryName: schedule.ministry.name,
    position: schedule.position || undefined,
    confirmUrl,
    declineUrl,
  }

  const html = await render(ScheduleInviteEmail(props))

  return sendEmail({
    to: schedule.user.email,
    subject: `Convite para Escala: ${schedule.event.name}`,
    html,
  })
}

/**
 * Envia email de lembrete de escala
 */
export async function sendScheduleReminder(
  schedule: ScheduleWithRelations,
  daysUntilEvent: number
): Promise<SendEmailResult> {
  if (!schedule.user.email) {
    return { success: false, error: "Usuario sem email cadastrado" }
  }

  const { eventUrl } = generateActionUrls(schedule.id)

  const props: ScheduleReminderEmailProps = {
    userName: schedule.user.name || "Voluntario",
    eventName: schedule.event.name,
    eventDate: schedule.event.date,
    eventTime: formatEventTime(schedule.event.startTime),
    ministryName: schedule.ministry.name,
    position: schedule.position || undefined,
    daysUntilEvent,
    eventUrl,
  }

  const html = await render(ScheduleReminderEmail(props))

  const subjectPrefix =
    daysUntilEvent <= 1 ? "AMANHA:" : daysUntilEvent <= 3 ? "EM BREVE:" : "Lembrete:"

  return sendEmail({
    to: schedule.user.email,
    subject: `${subjectPrefix} ${schedule.event.name}`,
    html,
  })
}

/**
 * Envia email de confirmacao recebida
 */
export async function sendScheduleConfirmation(
  schedule: ScheduleWithRelations,
  teamMembers?: Array<{ name: string; position?: string }>
): Promise<SendEmailResult> {
  if (!schedule.user.email) {
    return { success: false, error: "Usuario sem email cadastrado" }
  }

  const { eventUrl } = generateActionUrls(schedule.id)

  const props: ScheduleConfirmedEmailProps = {
    userName: schedule.user.name || "Voluntario",
    eventName: schedule.event.name,
    eventDate: schedule.event.date,
    eventTime: formatEventTime(schedule.event.startTime),
    ministryName: schedule.ministry.name,
    position: schedule.position || undefined,
    eventUrl,
    teamMembers,
  }

  const html = await render(ScheduleConfirmedEmail(props))

  return sendEmail({
    to: schedule.user.email,
    subject: `Presenca Confirmada: ${schedule.event.name}`,
    html,
  })
}

/**
 * Envia email de alteracao na escala
 */
export async function sendScheduleChanged(
  schedule: ScheduleWithRelations,
  changes: Array<{ field: string; oldValue: string; newValue: string }>,
  changedBy?: string,
  requiresReconfirmation?: boolean
): Promise<SendEmailResult> {
  if (!schedule.user.email) {
    return { success: false, error: "Usuario sem email cadastrado" }
  }

  const { eventUrl, confirmUrl } = generateActionUrls(schedule.id)

  const props: ScheduleChangedEmailProps = {
    userName: schedule.user.name || "Voluntario",
    eventName: schedule.event.name,
    eventDate: schedule.event.date,
    eventTime: formatEventTime(schedule.event.startTime),
    ministryName: schedule.ministry.name,
    position: schedule.position || undefined,
    eventUrl,
    changes,
    changedBy,
    requiresReconfirmation,
    confirmUrl: requiresReconfirmation ? confirmUrl : undefined,
  }

  const html = await render(ScheduleChangedEmail(props))

  return sendEmail({
    to: schedule.user.email,
    subject: `Alteracao na Escala: ${schedule.event.name}`,
    html,
  })
}

/**
 * Interface para musico que recebera setlist
 */
interface MusicianForSetlist {
  id: string
  name: string | null
  email: string | null
}

/**
 * Interface para evento com setlist
 */
interface EventWithSetlist {
  id: string
  name: string
  date: Date
  startTime: Date
  setlists: Array<{
    order: number
    key: string | null
    notes: string | null
    song: {
      id: string
      name: string
      artist: string | null
      chordLink: string | null
    }
  }>
}

/**
 * Envia email de setlist atualizado para musicos
 */
export async function sendSetlistUpdate(
  event: EventWithSetlist,
  musicians: MusicianForSetlist[],
  updatedBy?: string,
  isNewSetlist?: boolean
): Promise<SendEmailResult[]> {
  const songs = event.setlists.map((s) => ({
    order: s.order,
    name: s.song.name,
    artist: s.song.artist || undefined,
    key: s.key || "?",
    chordLink: s.song.chordLink || undefined,
    notes: s.notes || undefined,
  }))

  const eventUrl = `${APP_URL}/events/${event.id}`

  const emails = await Promise.all(
    musicians
      .filter((m) => m.email)
      .map(async (musician) => {
        const props: SetlistUpdateEmailProps = {
          userName: musician.name || "Musico",
          eventName: event.name,
          eventDate: event.date,
          eventTime: formatEventTime(event.startTime),
          songs,
          eventUrl,
          updatedBy,
          isNewSetlist,
        }

        const html = await render(SetlistUpdateEmail(props))

        return {
          to: musician.email!,
          subject: `${isNewSetlist ? "Novo Setlist" : "Setlist Atualizado"}: ${event.name}`,
          html,
        }
      })
  )

  return sendBatchEmails(emails)
}

/**
 * Busca escalas pendentes para enviar lembretes
 */
export async function getSchedulesForReminder(): Promise<{
  schedules: ScheduleWithRelations[]
  daysUntilEvent: number
}[]> {
  const results: { schedules: ScheduleWithRelations[]; daysUntilEvent: number }[] = []

  for (const daysAhead of REMINDER_DAYS_BEFORE) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + daysAhead)
    targetDate.setHours(0, 0, 0, 0)

    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    const schedules = await prisma.schedule.findMany({
      where: {
        status: "CONFIRMED",
        event: {
          date: {
            gte: targetDate,
            lt: nextDay,
          },
        },
      },
      include: {
        event: true,
        ministry: true,
        user: true,
      },
    })

    if (schedules.length > 0) {
      results.push({
        schedules: schedules as unknown as ScheduleWithRelations[],
        daysUntilEvent: daysAhead,
      })
    }
  }

  return results
}

/**
 * Envia lembretes para todas as escalas proximas
 */
export async function sendAllReminders(): Promise<{
  sent: number
  failed: number
  errors: string[]
}> {
  const schedulesGroups = await getSchedulesForReminder()

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const group of schedulesGroups) {
    for (const schedule of group.schedules) {
      const result = await sendScheduleReminder(schedule, group.daysUntilEvent)

      if (result.success) {
        sent++
      } else {
        failed++
        errors.push(`${schedule.user.email}: ${result.error}`)
      }
    }
  }

  return { sent, failed, errors }
}

/**
 * Interface para dados de convite de usuario
 */
interface InviteUserData {
  id: string
  name: string | null
  email: string
  inviteToken: string
  inviteExpires: Date
}

/**
 * Interface para dados do ministerio
 */
interface MinistryData {
  id: string
  name: string
}

/**
 * Envia email de convite para novo usuario
 */
export async function sendUserInvite(
  user: InviteUserData,
  ministry: MinistryData,
  position?: string
): Promise<SendEmailResult> {
  const inviteUrl = `${APP_URL}/set-password?token=${user.inviteToken}`

  const props: UserInviteEmailProps = {
    userName: user.name || "Voluntário",
    ministryName: ministry.name,
    position,
    inviteUrl,
    expiresAt: user.inviteExpires,
  }

  const html = await render(UserInviteEmail(props))

  return sendEmail({
    to: user.email,
    subject: `Convite: Junte-se ao ministério ${ministry.name}`,
    html,
  })
}

export { generateConfirmToken, generateActionUrls }
