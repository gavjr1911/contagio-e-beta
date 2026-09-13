import { render } from "@react-email/components"
import { sendEmail, sendBatchEmails, SendEmailResult } from "./client"
import { ScheduleInviteEmail, ScheduleInviteEmailProps } from "./templates/schedule-invite"
import { ScheduleReminderEmail, ScheduleReminderEmailProps } from "./templates/schedule-reminder"
import { ScheduleConfirmedEmail, ScheduleConfirmedEmailProps } from "./templates/schedule-confirmed"
import { ScheduleChangedEmail, ScheduleChangedEmailProps } from "./templates/schedule-changed"
import { SetlistUpdateEmail, SetlistUpdateEmailProps } from "./templates/setlist-update"
import { UserInviteEmail, UserInviteEmailProps } from "./templates/user-invite"
import { PasswordResetEmail, PasswordResetEmailProps } from "./templates/password-reset"
import type {
  ReminderAssignment,
  ReminderAssignmentStatus,
} from "./templates/schedule-reminder"
import { prisma } from "@/lib/prisma"
import { createHmac } from "crypto"
import { formatTimeToHHMM, getTodayLocal, startOfDay } from "@/lib/date-utils"

// Base URL da aplicacao — prioriza NEXT_PUBLIC_APP_URL, cai para NEXTAUTH_URL (sempre setado em prod)
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "http://localhost:3005"

// Dias de antecedencia para lembrete
const REMINDER_DAYS_BEFORE = [7, 3, 1]

// O Resend limita a ~2 req/s no plano padrao; acima disso devolve 429 e o
// lembrete se perde. 600ms entre envios mantem folga (<2 req/s).
const SEND_INTERVAL_MS = 600

// Uma unica retentativa quando o erro cheira a rate limit.
const RATE_LIMIT_RETRY_MS = 1500

// Linhas de log com eventDate anterior a isto sao apagadas a cada execucao.
const REMINDER_LOG_RETENTION_DAYS = 90

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Detecta violacao de unique do Prisma (P2002) sem depender do namespace. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  )
}

function isRateLimitError(message: string | undefined): boolean {
  if (!message) return false
  return /429|rate.?limit|too many requests/i.test(message)
}

/**
 * Normaliza o status vindo do banco para o que o template entende.
 * DECLINED nunca chega aqui (getSchedulesForReminder filtra).
 */
function toAssignmentStatus(status: string): ReminderAssignmentStatus {
  return status === "PENDING" ? "PENDING" : "CONFIRMED"
}

/**
 * Formata o horario de um evento a partir de startTime (Date)
 */
function formatEventTime(startTime: Date): string {
  // @db.Time é wall-clock ancorado em UTC — ler com getUTC* (via formatTimeToHHMM)
  return formatTimeToHHMM(new Date(startTime))
}

/**
 * Teto absoluto de validade do token de confirmacao/recusa.
 *
 * Era 24h, e isso quebrava o proprio fluxo que o token existe para servir:
 * - o CONVITE (`sendScheduleInvite`) sai quando a escala e criada, o que
 *   costuma acontecer semanas antes do culto;
 * - os LEMBRETES saem em D-7, D-3 e D-1.
 * Em ambos os casos, quem abrisse o e-mail no dia seguinte ja encontrava
 * "Token expirado" — o que se parece muito com "a pessoa esqueceu de
 * confirmar", mas e o link que morreu antes dela clicar.
 *
 * A barreira que realmente importa nao e o relogio do token, e sim a data do
 * evento: `resolveRequest` recusa escala de evento que ja passou. Este teto
 * existe apenas para limitar a janela de uso de um token vazado (e-mail
 * encaminhado, caixa comprometida), nao para gerenciar o fluxo normal.
 */
export const TOKEN_EXPIRATION_MS = 90 * 24 * 60 * 60 * 1000

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
 * Gera URLs de confirmacao/recusa para a escala.
 *
 * ATENCAO: confirmUrl/declineUrl sao por ESCALA (scheduleId), mas a pagina
 * /eventos/[id] espera o ID do EVENTO — por isso eventId e um parametro
 * separado e obrigatorio. Ate Set/2026 o eventUrl usava o scheduleId, e todo
 * botao "Ver Detalhes do Evento" caia em "evento nao encontrado".
 */
function generateActionUrls(scheduleId: string, eventId: string) {
  const confirmToken = generateConfirmToken(scheduleId, "confirm")
  const declineToken = generateConfirmToken(scheduleId, "decline")

  return {
    confirmUrl: `${APP_URL}/api/email/confirm/${scheduleId}?action=confirm&token=${confirmToken}`,
    declineUrl: `${APP_URL}/api/email/confirm/${scheduleId}?action=decline&token=${declineToken}`,
    eventUrl: `${APP_URL}/eventos/${eventId}`,
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

  const { confirmUrl, declineUrl } = generateActionUrls(schedule.id, schedule.eventId)

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

  const { eventUrl, confirmUrl, declineUrl } = generateActionUrls(
    schedule.id,
    schedule.eventId
  )

  const isPending = toAssignmentStatus(schedule.status) === "PENDING"

  const props: ScheduleReminderEmailProps = {
    userName: schedule.user.name || "Voluntario",
    eventName: schedule.event.name,
    eventDate: schedule.event.date,
    eventTime: formatEventTime(schedule.event.startTime),
    assignments: [
      {
        ministryName: schedule.ministry.name,
        position: schedule.position || undefined,
        status: isPending ? "PENDING" : "CONFIRMED",
        confirmUrl: isPending ? confirmUrl : undefined,
        declineUrl: isPending ? declineUrl : undefined,
      },
    ],
    daysUntilEvent,
    eventUrl,
  }

  const html = await render(ScheduleReminderEmail(props))

  return sendEmail({
    to: schedule.user.email,
    subject: buildReminderSubject(schedule.event.name, daysUntilEvent, isPending),
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

  const { eventUrl } = generateActionUrls(schedule.id, schedule.eventId)

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

  const { eventUrl, confirmUrl } = generateActionUrls(schedule.id, schedule.eventId)

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

  const eventUrl = `${APP_URL}/eventos/${event.id}`

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
 * Janela [inicio, fim) do dia-calendario que fica a `daysAhead` dias de hoje.
 *
 * Tudo em UTC (modelo wall-clock ancorado em UTC de date-utils): `today` vem de
 * getTodayLocal(), que resolve o dia-calendario de Sao Paulo via Intl — logo o
 * resultado NAO depende da hora de execucao nem da variavel TZ do processo.
 * A versao antiga usava new Date() + setDate()/setHours() locais e so acertava
 * porque o cron roda por volta de 12:00Z; entre 00:00 e 03:00Z errava o dia.
 */
export function getReminderDayRange(
  daysAhead: number,
  today: Date = getTodayLocal()
): { targetDate: Date; nextDay: Date } {
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth()
  const day = today.getUTCDate()

  return {
    targetDate: new Date(Date.UTC(year, month, day + daysAhead, 0, 0, 0, 0)),
    nextDay: new Date(Date.UTC(year, month, day + daysAhead + 1, 0, 0, 0, 0)),
  }
}

/**
 * Busca escalas para enviar lembretes (D-7, D-3 e D-1).
 *
 * Traz PENDING e CONFIRMED: quem ainda nao respondeu ao convite e justamente
 * quem mais precisa ser lembrado — para essa pessoa o lembrete vira cobranca de
 * confirmacao, com os botoes Confirmar/Recusar (ver ScheduleReminderEmail).
 * DECLINED fica de fora: quem recusou nao deve ser incomodado.
 */
export async function getSchedulesForReminder(): Promise<{
  schedules: ScheduleWithRelations[]
  daysUntilEvent: number
}[]> {
  const results: { schedules: ScheduleWithRelations[]; daysUntilEvent: number }[] = []
  const today = getTodayLocal()

  for (const daysAhead of REMINDER_DAYS_BEFORE) {
    const { targetDate, nextDay } = getReminderDayRange(daysAhead, today)

    const schedules = await prisma.schedule.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
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
 * Um lembrete a enviar: uma pessoa, um evento, todas as atribuicoes dela
 * naquele evento. Eventos diferentes continuam gerando e-mails diferentes
 * (2 cultos no domingo = 2 e-mails) — isso e proposital.
 *
 * As atribuicoes carregam o status (PENDING/CONFIRMED); um mesmo grupo pode ter
 * os dois. As URLs de acao NAO sao geradas aqui: o token tem timestamp, entao e
 * gerado na hora do envio (sendGroupedScheduleReminder).
 */
export interface ReminderGroup {
  userId: string
  userName: string | null
  email: string
  event: ScheduleWithRelations["event"]
  daysUntilEvent: number
  assignments: Array<ReminderAssignment & { scheduleId: string }>
}

/**
 * Agrupa escalas por (usuario, evento).
 *
 * Quem serve em 2 ministerios no mesmo evento tem 2 Schedule (a unique e
 * [eventId, ministryId, userId]) e recebia 2 e-mails identicos no mesmo dia.
 * Devolve tambem as escalas sem e-mail cadastrado, que nao dao para enviar.
 */
export function groupSchedulesByUserAndEvent(
  schedules: ScheduleWithRelations[],
  daysUntilEvent: number
): { groups: ReminderGroup[]; withoutEmail: ScheduleWithRelations[] } {
  const groups = new Map<string, ReminderGroup>()
  const withoutEmail: ScheduleWithRelations[] = []

  for (const schedule of schedules) {
    if (!schedule.user.email) {
      withoutEmail.push(schedule)
      continue
    }

    const key = `${schedule.userId}::${schedule.eventId}`
    let group = groups.get(key)

    if (!group) {
      group = {
        userId: schedule.userId,
        userName: schedule.user.name,
        email: schedule.user.email,
        event: schedule.event,
        daysUntilEvent,
        assignments: [],
      }
      groups.set(key, group)
    }

    group.assignments.push({
      scheduleId: schedule.id,
      ministryName: schedule.ministry.name,
      position: schedule.position || undefined,
      // DECLINED nunca chega aqui (getSchedulesForReminder filtra); qualquer
      // coisa que nao seja PENDING e tratada como confirmada.
      status: toAssignmentStatus(schedule.status),
    })
  }

  // Ordem estavel para o e-mail nao mudar de layout entre execucoes.
  for (const group of groups.values()) {
    group.assignments.sort(
      (a, b) =>
        a.ministryName.localeCompare(b.ministryName, "pt-BR") ||
        a.scheduleId.localeCompare(b.scheduleId)
    )
  }

  return { groups: [...groups.values()], withoutEmail }
}

/**
 * Envia UM lembrete cobrindo todas as atribuicoes da pessoa naquele evento.
 */
async function sendGroupedScheduleReminder(
  group: ReminderGroup
): Promise<SendEmailResult> {
  const hasPending = group.assignments.some((a) => a.status === "PENDING")

  const props: ScheduleReminderEmailProps = {
    userName: group.userName || "Voluntario",
    eventName: group.event.name,
    eventDate: group.event.date,
    eventTime: formatEventTime(group.event.startTime),
    // Um par Confirmar/Recusar por atribuicao PENDENTE: o token e assinado com
    // o scheduleId, entao um botao so nao cobre duas escalas do mesmo evento.
    assignments: group.assignments.map(
      ({ scheduleId, ministryName, position, status }) => {
        if (status !== "PENDING") {
          return { ministryName, position, status }
        }

        const { confirmUrl, declineUrl } = generateActionUrls(
          scheduleId,
          group.event.id
        )

        return { ministryName, position, status, confirmUrl, declineUrl }
      }
    ),
    daysUntilEvent: group.daysUntilEvent,
    eventUrl: `${APP_URL}/eventos/${group.event.id}`,
  }

  const html = await render(ScheduleReminderEmail(props))

  return sendEmail({
    to: group.email,
    subject: buildReminderSubject(
      group.event.name,
      group.daysUntilEvent,
      hasPending
    ),
    html,
  })
}

/**
 * Chave de idempotencia de um lembrete.
 *
 * Corresponde ao unique (scheduleId, daysBefore, eventDate) de
 * ScheduleReminderLog e NAO inclui o status de proposito: se incluisse, alguem
 * que recebe a cobranca no D-7 e confirma passaria a ter uma chave nova e
 * receberia o MESMO D-7 de novo no disparo seguinte. Marcos diferentes (D-7,
 * D-3, D-1) ja tem chaves diferentes por causa de `daysBefore`.
 */
export interface ReminderLogKey {
  scheduleId: string
  daysBefore: number
  eventDate: Date
}

export function buildReminderLogKey(
  scheduleId: string,
  daysBefore: number,
  eventDate: Date
): ReminderLogKey {
  return { scheduleId, daysBefore, eventDate }
}

/**
 * Reserva (claim) o lembrete de cada escala do grupo ANTES do envio.
 *
 * Devolve as escalas efetivamente reservadas agora: as que ja tinham linha
 * (P2002) sao ignoradas — ja foram avisadas num disparo anterior. Se nenhuma
 * for nova, o chamador pula o e-mail. `createLog` e injetavel para os testes;
 * em producao e o insert no Prisma.
 */
export async function claimReminderSlots(
  scheduleIds: string[],
  daysBefore: number,
  eventDate: Date,
  createLog: (key: ReminderLogKey) => Promise<unknown>
): Promise<{ claimed: string[]; error: string | null }> {
  const claimed: string[] = []

  for (const scheduleId of scheduleIds) {
    try {
      await createLog(buildReminderLogKey(scheduleId, daysBefore, eventDate))
      claimed.push(scheduleId)
    } catch (error) {
      if (isUniqueViolation(error)) continue // ja enviado num disparo anterior
      return {
        claimed,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }
    }
  }

  return { claimed, error: null }
}

/**
 * Monta o assunto do lembrete.
 *
 * Quando ha atribuicao pendente o e-mail nao e "so um lembrete": e um pedido de
 * resposta, e o assunto precisa dizer isso antes de a pessoa abrir.
 */
export function buildReminderSubject(
  eventName: string,
  daysUntilEvent: number,
  hasPending: boolean
): string {
  const urgency =
    daysUntilEvent <= 1 ? "AMANHA" : daysUntilEvent <= 3 ? "EM BREVE" : null

  if (hasPending) {
    return urgency
      ? `CONFIRME - ${urgency}: ${eventName}`
      : `CONFIRME: ${eventName}`
  }

  return urgency ? `${urgency}: ${eventName}` : `Lembrete: ${eventName}`
}

/**
 * Apaga as reservas feitas nesta execucao (envio falhou -> tentar de novo no
 * proximo disparo). Nunca derruba o lote: falha aqui so vira log.
 */
async function releaseReminderClaims(
  scheduleIds: string[],
  daysBefore: number,
  eventDate: Date
): Promise<void> {
  if (scheduleIds.length === 0) return

  try {
    await prisma.scheduleReminderLog.deleteMany({
      where: { scheduleId: { in: scheduleIds }, daysBefore, eventDate },
    })
  } catch (error) {
    console.error(
      "[Email/Reminders] Falha ao liberar reserva de lembrete:",
      error instanceof Error ? error.message : error
    )
  }
}

/**
 * Remove logs de lembrete de eventos antigos para a tabela nao crescer sem fim.
 */
async function pruneOldReminderLogs(today: Date): Promise<void> {
  const cutoff = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - REMINDER_LOG_RETENTION_DAYS,
      0,
      0,
      0,
      0
    )
  )

  try {
    const { count } = await prisma.scheduleReminderLog.deleteMany({
      where: { eventDate: { lt: cutoff } },
    })
    if (count > 0) {
      console.log(`[Email/Reminders] Limpeza: ${count} log(s) antigo(s) removido(s)`)
    }
  } catch (error) {
    console.error(
      "[Email/Reminders] Falha na limpeza de logs antigos:",
      error instanceof Error ? error.message : error
    )
  }
}

/**
 * Envia lembretes para todas as escalas proximas (D-7, D-3, D-1).
 *
 * Idempotencia x agrupamento (decisao de desenho):
 * - O envio e por (usuario, evento); o log de idempotencia e por SCHEDULE
 *   (scheduleId, daysBefore, eventDate), que e a granularidade real do dado.
 * - Antes de enviar, RESERVA uma linha por escala do grupo (create + P2002).
 *   Se todas ja estavam reservadas, o e-mail ja foi enviado -> pula.
 *   Se pelo menos UMA e nova (ex.: a pessoa foi escalada num 2o ministerio
 *   depois do primeiro disparo), envia um e-mail com a lista COMPLETA de
 *   atribuicoes — assim nenhuma atribuicao fica sem lembrete e a reexecucao
 *   pura (mesmo estado) nao reenvia nada.
 * - Se o envio falhar, as reservas feitas AGORA sao apagadas, para a proxima
 *   execucao tentar de novo (429 do Resend e o caso esperado).
 *
 * `sent`/`failed` contam E-MAILS (nao escalas); `schedulesCovered` conta as
 * escalas cobertas pelos e-mails enviados.
 */
export async function sendAllReminders(): Promise<{
  sent: number
  failed: number
  errors: string[]
  skipped: number
  schedulesCovered: number
}> {
  const schedulesGroups = await getSchedulesForReminder()

  let sent = 0
  let failed = 0
  let skipped = 0
  let schedulesCovered = 0
  const errors: string[] = []
  let isFirstSend = true

  for (const day of schedulesGroups) {
    const { groups, withoutEmail } = groupSchedulesByUserAndEvent(
      day.schedules,
      day.daysUntilEvent
    )

    // Sem e-mail nao ha o que enviar.
    //
    // As mensagens de `errors` incluem NOME da pessoa e do evento de proposito:
    // elas vao para `AppSettings` e sao exibidas no card de Configuracoes, que e
    // ADMIN-only. Um erro so identificado por cuid ("user clx8a... (D-1)") nao
    // permite acao nenhuma — o admin nao sabe quem avisar. O log do Railway, que
    // e retido e visto por qualquer um com acesso ao projeto, continua recebendo
    // apenas a CONTAGEM de falhas (ver a rota de cron), nunca estas strings.
    for (const schedule of withoutEmail) {
      failed++
      errors.push(
        `${schedule.user.name || "Sem nome"} (schedule ${schedule.id}): usuario sem email cadastrado`
      )
    }

    for (const group of groups) {
      // Coluna @db.Date: normaliza para meia-noite UTC antes de comparar/gravar.
      const eventDate = startOfDay(group.event.date)
      const { claimed, error: claimError } = await claimReminderSlots(
        group.assignments.map((a) => a.scheduleId),
        day.daysUntilEvent,
        eventDate,
        (key) => prisma.scheduleReminderLog.create({ data: key })
      )

      if (claimError) {
        await releaseReminderClaims(claimed, day.daysUntilEvent, eventDate)
        failed++
        errors.push(
          `${group.userName || "Sem nome"} — ${group.event.name} (D-${day.daysUntilEvent}): falha ao reservar lembrete: ${claimError}`
        )
        continue
      }

      if (claimed.length === 0) {
        skipped++
        continue
      }

      // Espacamento entre envios (rate limit do Resend).
      if (!isFirstSend) await sleep(SEND_INTERVAL_MS)
      isFirstSend = false

      let result = await sendGroupedScheduleReminder(group)

      // 429: uma retentativa com folga antes de desistir e liberar a reserva.
      if (!result.success && isRateLimitError(result.error)) {
        await sleep(RATE_LIMIT_RETRY_MS)
        result = await sendGroupedScheduleReminder(group)
      }

      if (result.success) {
        sent++
        schedulesCovered += group.assignments.length
      } else {
        await releaseReminderClaims(claimed, day.daysUntilEvent, eventDate)
        failed++
        errors.push(
          `${group.userName || "Sem nome"} — ${group.event.name} (D-${day.daysUntilEvent}): ${result.error}`
        )
      }
    }
  }

  await pruneOldReminderLogs(getTodayLocal())

  return { sent, failed, errors, skipped, schedulesCovered }
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

/**
 * Envia o email de redefinição de senha (link para /set-password?token=...).
 */
export async function sendPasswordReset(params: {
  name: string | null
  email: string
  token: string
  expiresAt: Date
  byAdmin?: boolean
}): Promise<SendEmailResult> {
  const resetUrl = `${APP_URL}/set-password?token=${params.token}`

  const props: PasswordResetEmailProps = {
    userName: params.name || "Voluntário",
    resetUrl,
    expiresAt: params.expiresAt,
    byAdmin: params.byAdmin,
  }

  const html = await render(PasswordResetEmail(props))

  return sendEmail({
    to: params.email,
    subject: "Redefinição de senha — Igreja Beta",
    html,
  })
}

export { generateConfirmToken, generateActionUrls }
