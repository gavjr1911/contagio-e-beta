/**
 * Envio do arquivo ao R2 (PUT direto do navegador), isolado do React.
 *
 * Está separado do hook por dois motivos: dá para testar sem montar componente,
 * e a lógica de erro aqui é sutil o bastante para merecer testes próprios.
 *
 * ## Por que a causa da falha não sai do status HTTP
 *
 * Medido no Chrome contra o bucket real: com um presign expirado, o R2 responde
 * 403 mas **sem** cabeçalhos CORS na resposta de erro. O navegador então bloqueia
 * a resposta e o XHR enxerga `status === 0` e evento `error` — o 403 nunca chega
 * ao código. Ou seja, discriminar por `xhr.status` não funciona: praticamente
 * toda falha vira status 0.
 *
 * A causa provável é então deduzida de sinais que realmente existem:
 * se o navegador está offline; se o envio chegou a progredir; e há quanto tempo
 * a URL assinada foi emitida.
 */

export interface UploadProgress {
  /** 0-100 */
  progress: number
  loaded: number
  total: number
  /** Média da janela recente, não do envio inteiro. */
  bytesPerSecond: number
  /** Segundos restantes, ou null enquanto não há amostra suficiente. */
  etaSeconds: number | null
}

export type UploadFailureReason =
  | "canceled"
  | "offline"
  | "stalled"
  | "expired"
  | "blocked"
  | "interrupted"
  | "rejected"
  | "unknown"

export class UploadError extends Error {
  readonly reason: UploadFailureReason

  constructor(reason: UploadFailureReason, message: string) {
    super(message)
    this.name = "UploadError"
    this.reason = reason
  }
}

/** Mensagens em linguagem de quem opera a mídia da igreja, não de quem programa. */
export const UPLOAD_ERROR_MESSAGES: Record<UploadFailureReason, string> = {
  canceled: "Envio cancelado.",
  offline: "Sem conexão com a internet. Reconecte e envie novamente — o arquivo continua aqui.",
  stalled:
    "O envio parou de responder. Verifique a conexão e tente novamente; o arquivo não foi salvo.",
  expired: "O envio demorou mais do que o permitido. Clique em enviar novamente para recomeçar.",
  blocked:
    "Não foi possível falar com o servidor de arquivos. Avise o administrador do sistema — pode ser configuração do storage.",
  interrupted:
    "A conexão caiu durante o envio e o arquivo não foi salvo. Tente novamente com uma rede estável.",
  rejected: "O servidor de arquivos recusou o envio. Selecione o arquivo novamente.",
  unknown: "Não foi possível enviar o arquivo. Tente novamente.",
}

export interface UploadToR2Options {
  url: string
  file: Blob
  contentType: string
  signal?: AbortSignal
  onProgress?: (info: UploadProgress) => void
  /** `Date.now()` de quando a URL assinada foi obtida. */
  presignedAt?: number
  /** Validade da URL assinada, em ms (o servidor emite com 1h). */
  presignTtlMs?: number
  /** Sem nenhum byte novo por este tempo, o envio é considerado travado. */
  stallTimeoutMs?: number
}

const DEFAULT_PRESIGN_TTL_MS = 60 * 60 * 1000
/**
 * O maior silêncio entre eventos de progresso medido num envio real de 30MB foi
 * de 0,5s. 60s é folgado o bastante para não acusar travamento numa rede apenas
 * lenta, e curto o bastante para o usuário não encarar uma barra parada por
 * tempo indeterminado.
 */
const DEFAULT_STALL_TIMEOUT_MS = 60_000

/** Amostras usadas na janela móvel de velocidade. */
const JANELA = 8

export function uploadToR2({
  url,
  file,
  contentType,
  signal,
  onProgress,
  presignedAt,
  presignTtlMs = DEFAULT_PRESIGN_TTL_MS,
  stallTimeoutMs = DEFAULT_STALL_TIMEOUT_MS,
}: UploadToR2Options): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const amostras: { t: number; loaded: number }[] = []

    let loaded = 0
    let ultimoAvanco = Date.now()
    let travou = false

    // A média desde o início mente numa conexão que oscila: um trecho rápido no
    // começo mantém a estimativa otimista por minutos. A janela móvel reage.
    const vigia = setInterval(() => {
      if (Date.now() - ultimoAvanco > stallTimeoutMs) {
        travou = true
        xhr.abort()
      }
    }, 1000)

    const encerrar = () => {
      clearInterval(vigia)
      signal?.removeEventListener("abort", cancelar)
    }

    const cancelar = () => xhr.abort()
    signal?.addEventListener("abort", cancelar)

    xhr.upload.addEventListener("progress", (e) => {
      if (!e.lengthComputable) return

      if (e.loaded > loaded) {
        loaded = e.loaded
        ultimoAvanco = Date.now()
      }

      amostras.push({ t: Date.now(), loaded: e.loaded })
      if (amostras.length > JANELA) amostras.shift()

      const primeira = amostras[0]
      const ultima = amostras[amostras.length - 1]
      const dt = (ultima.t - primeira.t) / 1000
      const db = ultima.loaded - primeira.loaded
      const bytesPerSecond = dt > 0 ? db / dt : 0
      const etaSeconds =
        bytesPerSecond > 0 ? Math.round((e.total - e.loaded) / bytesPerSecond) : null

      onProgress?.({
        progress: Math.round((e.loaded / e.total) * 100),
        loaded: e.loaded,
        total: e.total,
        bytesPerSecond,
        etaSeconds,
      })
    })

    xhr.addEventListener("load", () => {
      encerrar()
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      // Só chega aqui se a resposta de erro trouxer CORS — raro no R2.
      reject(new UploadError("rejected", UPLOAD_ERROR_MESSAGES.rejected))
    })

    xhr.addEventListener("abort", () => {
      encerrar()
      const reason: UploadFailureReason = travou ? "stalled" : "canceled"
      reject(new UploadError(reason, UPLOAD_ERROR_MESSAGES[reason]))
    })

    xhr.addEventListener("error", () => {
      encerrar()
      reject(new UploadError(...deduzirFalha({ loaded, presignedAt, presignTtlMs })))
    })

    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", contentType)
    xhr.send(file)
  })
}

/**
 * Deduz a causa provável de uma falha que chegou como `status 0`.
 * Exportada para poder ser testada sem navegador.
 */
export function deduzirFalha({
  loaded,
  presignedAt,
  presignTtlMs = DEFAULT_PRESIGN_TTL_MS,
  agora = Date.now(),
  online,
}: {
  loaded: number
  presignedAt?: number
  presignTtlMs?: number
  agora?: number
  online?: boolean
}): [UploadFailureReason, string] {
  const estaOnline =
    online ?? (typeof navigator === "undefined" ? true : navigator.onLine !== false)

  if (!estaOnline) return ["offline", UPLOAD_ERROR_MESSAGES.offline]

  // Assinatura vencida: o usuário escolheu o arquivo, ficou com a tela aberta e
  // só depois mandou enviar.
  if (presignedAt !== undefined && agora - presignedAt >= presignTtlMs) {
    return ["expired", UPLOAD_ERROR_MESSAGES.expired]
  }

  // Nenhum byte saiu: o navegador barrou antes de começar — tipicamente CORS
  // ausente ou storage mal configurado. Não é algo que o operador resolva.
  if (loaded === 0) return ["blocked", UPLOAD_ERROR_MESSAGES.blocked]

  // Já tinha progredido: a rede caiu no meio do caminho.
  return ["interrupted", UPLOAD_ERROR_MESSAGES.interrupted]
}
