/**
 * Modelo do registro de ultima execucao do cron de lembretes.
 *
 * Motivacao: a rota de cron responde 200 mesmo quando o lote falha e o unico
 * sinal ficava no log do Railway — o cron ficou quebrado por mais de 30 dias
 * sem ninguem perceber. Passamos a gravar o resultado de cada execucao em
 * `AppSettings` (chave `last_reminder_run`) para que a lideranca veja o estado
 * na tela de Configuracoes.
 *
 * Este arquivo e puro (sem Prisma) para poder ser testado isoladamente;
 * a persistencia fica em `./last-run.store`.
 */

/** Chave usada em AppSettings.key */
export const LAST_REMINDER_RUN_KEY = "last_reminder_run"

/** O cron e diario; acima disso consideramos que houve falha silenciosa. */
export const REMINDER_STALE_AFTER_MS = 36 * 60 * 60 * 1000

export interface ReminderRunRecord {
  /** Timestamp ISO do fim da execucao */
  ranAt: string
  sent: number
  failed: number
  /** Mensagem de erro quando o lote inteiro falhou */
  error?: string
  /** Erros parciais (por destinatario), limitados para nao inchar o registro */
  errors?: string[]
  /** Grupos pulados por ja terem recebido o lembrete num disparo anterior */
  skipped?: number
  /** Escalas cobertas pelos e-mails efetivamente enviados */
  schedulesCovered?: number
}

export type ReminderRunHealth = "ok" | "warning" | "never"

export interface ReminderRunStatus {
  lastRun: ReminderRunRecord | null
  health: ReminderRunHealth
  /** Motivos do alerta, em pt-BR, prontos para exibir */
  reasons: string[]
  /** Idade da ultima execucao em milissegundos (null se nunca rodou) */
  ageMs: number | null
}

/** Converte o JSON salvo em AppSettings.value para o registro tipado. */
export function parseReminderRun(value: string | null | undefined): ReminderRunRecord | null {
  if (!value) return null

  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== "object") return null

    const record = parsed as Record<string, unknown>
    if (typeof record.ranAt !== "string") return null

    const parsedRecord: ReminderRunRecord = {
      ranAt: record.ranAt,
      sent: typeof record.sent === "number" ? record.sent : 0,
      failed: typeof record.failed === "number" ? record.failed : 0,
      error: typeof record.error === "string" ? record.error : undefined,
      errors: Array.isArray(record.errors)
        ? record.errors.filter((e): e is string => typeof e === "string")
        : undefined,
    }

    // Campos opcionais so aparecem quando existem no JSON: registros gravados
    // antes desta versao nao os tem, e criar a chave com `undefined` mudaria a
    // forma do objeto sem necessidade.
    if (typeof record.skipped === "number") parsedRecord.skipped = record.skipped
    if (typeof record.schedulesCovered === "number") {
      parsedRecord.schedulesCovered = record.schedulesCovered
    }

    return parsedRecord
  } catch {
    return null
  }
}

/**
 * Avalia a saude da ultima execucao.
 * ALERTA quando: nunca rodou, rodou ha mais de ~36h, houve erro geral ou
 * houve pelo menos uma falha de envio.
 */
export function evaluateReminderRun(
  record: ReminderRunRecord | null,
  now: Date = new Date()
): ReminderRunStatus {
  if (!record) {
    return {
      lastRun: null,
      health: "never",
      reasons: ["O cron de lembretes nunca registrou uma execucao."],
      ageMs: null,
    }
  }

  const ranAtMs = Date.parse(record.ranAt)
  const ageMs = Number.isNaN(ranAtMs) ? null : now.getTime() - ranAtMs
  const reasons: string[] = []

  if (ageMs === null) {
    reasons.push("Data da ultima execucao invalida.")
  } else if (ageMs > REMINDER_STALE_AFTER_MS) {
    const hours = Math.floor(ageMs / (60 * 60 * 1000))
    reasons.push(`Ultima execucao ha ${hours}h (o cron deveria rodar todo dia).`)
  }

  if (record.error) {
    reasons.push(`A ultima execucao falhou: ${record.error}`)
  }

  if (record.failed > 0) {
    reasons.push(`${record.failed} e-mail(s) nao foram enviados na ultima execucao.`)
  }

  return {
    lastRun: record,
    health: reasons.length > 0 ? "warning" : "ok",
    reasons,
    ageMs,
  }
}

/** Monta o registro a ser salvo, truncando a lista de erros. */
export function buildReminderRun(input: {
  sent: number
  failed: number
  error?: string
  errors?: string[]
  skipped?: number
  schedulesCovered?: number
  ranAt?: Date
}): ReminderRunRecord {
  const record: ReminderRunRecord = {
    ranAt: (input.ranAt ?? new Date()).toISOString(),
    sent: input.sent,
    failed: input.failed,
  }

  if (typeof input.skipped === "number") record.skipped = input.skipped
  if (typeof input.schedulesCovered === "number") {
    record.schedulesCovered = input.schedulesCovered
  }
  if (input.error) record.error = input.error
  if (input.errors && input.errors.length > 0) {
    record.errors = input.errors.slice(0, 20)
  }

  return record
}
