/**
 * Fonte única de verdade das regras de arquivo de mídia.
 *
 * Este módulo é importado pelo CLIENT e pelo SERVER, então não pode depender de
 * `prisma`, `crypto` ou qualquer coisa de servidor — era justamente por isso que
 * `src/lib/storage/r2.ts` (que importa Prisma) não podia ser usado no browser e
 * a allowlist e o limite acabaram duplicados em `use-media.ts`. Quem precisar de
 * regra de arquivo importa daqui; `r2.ts` reexporta para não quebrar chamadores.
 */

export const ALLOWED_FILE_TYPES = {
  // Imagens
  "image/png": { extension: "png", type: "IMAGE" as const },
  "image/jpeg": { extension: "jpg", type: "IMAGE" as const },
  "image/gif": { extension: "gif", type: "IMAGE" as const },
  "image/webp": { extension: "webp", type: "IMAGE" as const },
  // Videos
  "video/mp4": { extension: "mp4", type: "VIDEO" as const },
  "video/quicktime": { extension: "mov", type: "VIDEO" as const },
  // Documentos
  "application/pdf": { extension: "pdf", type: "PDF" as const },
  // Apresentacoes
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    extension: "pptx",
    type: "PRESENTATION" as const,
  },
  "application/vnd.ms-powerpoint": {
    extension: "ppt",
    type: "PRESENTATION" as const,
  },
} as const

export type AllowedMimeType = keyof typeof ALLOWED_FILE_TYPES
export type MediaTypeFromMime = (typeof ALLOWED_FILE_TYPES)[AllowedMimeType]["type"]

const MB = 1024 * 1024

/**
 * Limite POR TIPO. Vídeo é o caso que motivou a separação: gravação de culto não
 * cabe em 50MB. 500MB é o teto viável para o mecanismo atual (um único PUT
 * assinado, sem retomada) — acima disso o upload demora tanto numa conexão de
 * igreja que qualquer oscilação de rede faz perder tudo, e aí o caminho correto
 * passa a ser multipart upload com retomada.
 */
export const MAX_FILE_SIZE_BY_TYPE: Record<MediaTypeFromMime, number> = {
  IMAGE: 50 * MB,
  VIDEO: 500 * MB,
  PDF: 50 * MB,
  PRESENTATION: 50 * MB,
}

/** Maior limite entre todos os tipos — teto absoluto, nunca o limite efetivo. */
export const MAX_FILE_SIZE = Math.max(...Object.values(MAX_FILE_SIZE_BY_TYPE))

export function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
  return mimeType in ALLOWED_FILE_TYPES
}

export function getMediaTypeFromMime(mimeType: AllowedMimeType): MediaTypeFromMime {
  return ALLOWED_FILE_TYPES[mimeType].type
}

/** Limite efetivo para um MIME. Desconhecido cai no menor teto, nunca no maior. */
export function getMaxSizeForMime(mimeType: string): number {
  if (!isAllowedMimeType(mimeType)) {
    return Math.min(...Object.values(MAX_FILE_SIZE_BY_TYPE))
  }
  return MAX_FILE_SIZE_BY_TYPE[getMediaTypeFromMime(mimeType)]
}

export function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf(".")
  return idx === -1 ? "" : filename.slice(idx + 1).toLowerCase()
}

/**
 * MIME a partir da extensão. Necessário porque `File.type` vem VAZIO em vários
 * casos reais (`.mov` e `.pptx` no Windows e em alguns Androids), o que fazia o
 * app acusar "tipo não permitido" para arquivo perfeitamente válido.
 */
export function mimeFromExtension(filename: string): AllowedMimeType | null {
  const ext = getFileExtension(filename)
  if (!ext) return null
  if (ext === "jpeg") return "image/jpeg"
  for (const [mime, meta] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (meta.extension === ext) return mime as AllowedMimeType
  }
  return null
}

/**
 * Content-type efetivo de um arquivo escolhido pelo usuário: usa `file.type`
 * quando confiável e cai para a extensão quando o navegador não informou nada.
 */
export function resolveContentType(file: { name: string; type: string }): AllowedMimeType | null {
  if (file.type && isAllowedMimeType(file.type)) return file.type
  return mimeFromExtension(file.name)
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/** Valor do atributo `accept` do input de arquivo, derivado da allowlist. */
export const ACCEPT_ATTRIBUTE = Array.from(
  new Set(Object.values(ALLOWED_FILE_TYPES).map((m) => `.${m.extension}`))
)
  .concat(".jpeg")
  .join(",")

/** Texto curto de limites para a UI, para não haver "50MB" hardcoded na tela. */
export function describeLimits(): string {
  // Agrupa por limite em vez de assumir que tudo que não é vídeo tem o mesmo
  // teto — se um tipo divergir, o texto acompanha em vez de mentir.
  const rotulos: Record<MediaTypeFromMime, string> = {
    IMAGE: "imagens",
    VIDEO: "vídeos",
    PDF: "PDF",
    PRESENTATION: "apresentações",
  }

  const porLimite = new Map<number, string[]>()
  for (const [tipo, limite] of Object.entries(MAX_FILE_SIZE_BY_TYPE) as [MediaTypeFromMime, number][]) {
    const lista = porLimite.get(limite) ?? []
    lista.push(rotulos[tipo])
    porLimite.set(limite, lista)
  }

  return [...porLimite.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([limite, tipos]) => `${tipos.join(", ")} até ${limite / MB}MB`)
    .join("; ")
}

/** Lista legível dos formatos aceitos — para erro de TIPO, não de tamanho. */
export function describeAllowedTypes(): string {
  return Array.from(new Set(Object.values(ALLOWED_FILE_TYPES).map((m) => m.extension)))
    .map((e) => e.toUpperCase())
    .join(", ")
}
