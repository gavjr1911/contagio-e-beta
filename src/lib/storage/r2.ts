import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"

// Tipos de arquivo permitidos
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

// Limite de 50MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024

// Interface para configuracoes R2
interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrl: string
}

// Cache para configuracoes (evitar queries repetidas)
let configCache: R2Config | null = null
let configCacheTime = 0
const CACHE_TTL = 60 * 1000 // 1 minuto

// Buscar configuracoes do banco ou env
async function getR2Config(): Promise<R2Config> {
  // Verificar cache
  if (configCache && Date.now() - configCacheTime < CACHE_TTL) {
    return configCache
  }

  // Buscar do banco
  const settings = await prisma.appSettings.findMany({
    where: {
      key: {
        in: [
          "R2_ACCOUNT_ID",
          "R2_ACCESS_KEY_ID",
          "R2_SECRET_ACCESS_KEY",
          "R2_BUCKET_NAME",
          "R2_PUBLIC_URL",
        ],
      },
    },
  })

  const settingsMap: Record<string, string> = {}
  for (const setting of settings) {
    settingsMap[setting.key] = setting.encrypted
      ? decrypt(setting.value)
      : setting.value
  }

  // Usar banco se disponivel, senao usar env como fallback
  const config: R2Config = {
    accountId: settingsMap.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || "",
    accessKeyId: settingsMap.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: settingsMap.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || "",
    bucketName: settingsMap.R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || "",
    publicUrl: settingsMap.R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || "",
  }

  // Atualizar cache
  configCache = config
  configCacheTime = Date.now()

  return config
}

// Limpar cache (chamar apos atualizar configuracoes)
export function clearR2ConfigCache(): void {
  configCache = null
  configCacheTime = 0
}

// Configuracao do cliente R2
async function getR2Client(): Promise<{ client: S3Client; bucketName: string }> {
  const config = await getR2Config()

  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error("Configuracao R2 incompleta. Configure nas Configuracoes do sistema.")
  }

  if (!config.bucketName) {
    throw new Error("Nome do bucket R2 nao configurado.")
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })

  return { client, bucketName: config.bucketName }
}

// Gerar key unica para arquivo
export function generateFileKey(eventId: string, filename: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const sanitizedFilename = filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
  return `events/${eventId}/${timestamp}-${randomString}-${sanitizedFilename}`
}

// Validar tipo de arquivo
export function validateFileType(mimeType: string): mimeType is AllowedMimeType {
  return mimeType in ALLOWED_FILE_TYPES
}

// Obter tipo de media a partir do MIME type
export function getMediaTypeFromMime(mimeType: AllowedMimeType): MediaTypeFromMime {
  return ALLOWED_FILE_TYPES[mimeType].type
}

// Gerar URL presigned para upload
export async function generateUploadPresignedUrl(
  key: string,
  contentType: AllowedMimeType,
  contentLength: number
): Promise<{ uploadUrl: string; expiresIn: number }> {
  if (!validateFileType(contentType)) {
    throw new Error(`Tipo de arquivo nao permitido: ${contentType}`)
  }

  if (contentLength > MAX_FILE_SIZE) {
    throw new Error(`Arquivo muito grande. Limite: ${MAX_FILE_SIZE / (1024 * 1024)}MB`)
  }

  const { client, bucketName } = await getR2Client()
  const expiresIn = 3600 // 1 hora

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  })

  const uploadUrl = await getSignedUrl(client, command, { expiresIn })

  return { uploadUrl, expiresIn }
}

// Verificar se arquivo existe no R2
export async function fileExistsInR2(key: string): Promise<boolean> {
  const { client, bucketName } = await getR2Client()

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    )
    return true
  } catch {
    return false
  }
}

// Deletar arquivo do R2
export async function deleteFromR2(key: string): Promise<void> {
  const { client, bucketName } = await getR2Client()

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  )
}

// Obter URL publica do arquivo
export async function getPublicUrl(key: string): Promise<string> {
  const config = await getR2Config()

  if (!config.publicUrl) {
    throw new Error("URL publica do R2 nao configurada.")
  }

  // Remove trailing slash se houver
  const baseUrl = config.publicUrl.endsWith("/")
    ? config.publicUrl.slice(0, -1)
    : config.publicUrl
  return `${baseUrl}/${key}`
}

// Versao sincrona para uso onde async nao e possivel
// Usa cache se disponivel, senao usa env
export function getPublicUrlSync(key: string): string {
  const publicUrl = configCache?.publicUrl || process.env.R2_PUBLIC_URL
  if (!publicUrl) {
    throw new Error("URL publica do R2 nao configurada.")
  }

  const baseUrl = publicUrl.endsWith("/") ? publicUrl.slice(0, -1) : publicUrl
  return `${baseUrl}/${key}`
}

// Formatar tamanho de arquivo
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// Verificar se a configuracao R2 esta completa (async)
export async function isR2Configured(): Promise<boolean> {
  const config = await getR2Config()
  return Boolean(
    config.accountId &&
    config.accessKeyId &&
    config.secretAccessKey &&
    config.bucketName &&
    config.publicUrl
  )
}

// Verificar rapidamente usando cache/env (sync)
export function isR2ConfiguredSync(): boolean {
  if (configCache) {
    return Boolean(
      configCache.accountId &&
      configCache.accessKeyId &&
      configCache.secretAccessKey &&
      configCache.bucketName &&
      configCache.publicUrl
    )
  }

  // Fallback para env
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL
  )
}
