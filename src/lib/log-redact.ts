/**
 * Saneamento de PII antes de escrever no log.
 *
 * Os logs do Railway ficam retidos e sao visiveis a qualquer pessoa com acesso
 * ao projeto. Mensagens de erro de provedores (Resend, sobretudo) costumam
 * ecoar o destinatario, e objetos de erro serializados arrastam junto o payload
 * inteiro da requisicao. Identificadores internos (`schedule.id`, `userId`) sao
 * suficientes para diagnosticar e nao sao PII.
 *
 * Vive em `src/lib` — e nao dentro de uma rota — porque e usado tanto pelo
 * fluxo de confirmacao por e-mail quanto pelo cliente de envio.
 */

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

/** Converte o valor em texto para log, sem endereços de e-mail. */
export function redactPII(value: unknown): string {
  const text =
    value instanceof Error
      ? `${value.name}: ${value.message}`
      : typeof value === "string"
        ? value
        : typeof value === "object" && value !== null
          ? Object.prototype.toString.call(value)
          : String(value)

  return text.replace(EMAIL_PATTERN, "[email removido]")
}
