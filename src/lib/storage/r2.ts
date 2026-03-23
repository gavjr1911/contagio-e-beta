import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

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

// Configuracao do cliente R2
function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Configuracao R2 incompleta. Verifique as variaveis de ambiente.")
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
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

  const bucketName = process.env.R2_BUCKET_NAME
  if (!bucketName) {
    throw new Error("R2_BUCKET_NAME nao configurado")
  }

  const client = getR2Client()
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
  const bucketName = process.env.R2_BUCKET_NAME
  if (!bucketName) {
    throw new Error("R2_BUCKET_NAME nao configurado")
  }

  const client = getR2Client()

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
  const bucketName = process.env.R2_BUCKET_NAME
  if (!bucketName) {
    throw new Error("R2_BUCKET_NAME nao configurado")
  }

  const client = getR2Client()

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  )
}

// Obter URL publica do arquivo
export function getPublicUrl(key: string): string {
  const publicUrl = process.env.R2_PUBLIC_URL
  if (!publicUrl) {
    throw new Error("R2_PUBLIC_URL nao configurado")
  }

  // Remove trailing slash se houver
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

// Verificar se a configuracao R2 esta completa
export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_PUBLIC_URL
  )
}
