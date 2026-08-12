import { Resend } from "resend"

// Inicializa o cliente Resend de forma lazy para evitar erros durante o build
let _resend: Resend | null = null

// Retorna null quando RESEND_API_KEY nao esta configurada. Antes era criado um
// cliente com chave "re_placeholder", o que nao simulava nada: as chamadas iam
// para a rede e voltavam 401, gastando latencia para falhar do mesmo jeito.
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  if (!_resend) {
    _resend = new Resend(apiKey)
  }
  return _resend
}

// Dominio de envio configurado no Resend
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Beta Church <noreply@beta.church>"

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export interface SendEmailResult {
  success: boolean
  data?: { id: string }
  error?: string
}

/**
 * Envia um email usando o Resend
 * @param options - Opcoes do email (to, subject, html, replyTo)
 * @returns Resultado do envio com sucesso/erro
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, replyTo } = options

  try {
    const resend = getResend()
    if (!resend) {
      const message = "RESEND_API_KEY nao configurada"
      console.error("[Email] Envio abortado:", message)
      return { success: false, error: message }
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo,
    })

    if (error) {
      console.error("[Email] Erro ao enviar:", error)
      return {
        success: false,
        error: error.message,
      }
    }

    // Aceite do Resend (202) nao e entrega: bounce/spam chegam depois, de forma
    // assincrona. Nao havendo webhook, o status real so pode ser conferido na
    // API do Resend (campo last_event). Evita ler este log como "entregue".
    console.log("[Email] Aceito pelo Resend (entrega nao confirmada):", data?.id)
    return {
      success: true,
      data: data ? { id: data.id } : undefined,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido"
    console.error("[Email] Excecao ao enviar:", message)
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Envia multiplos emails em batch
 * @param emails - Array de emails para enviar
 * @returns Array com resultados de cada envio
 */
export async function sendBatchEmails(
  emails: SendEmailOptions[]
): Promise<SendEmailResult[]> {
  const results = await Promise.allSettled(
    emails.map((email) => sendEmail(email))
  )

  return results.map((result) => {
    if (result.status === "fulfilled") {
      return result.value
    }
    return {
      success: false,
      error: result.reason?.message || "Falha no envio",
    }
  })
}

export { getResend as resend }
