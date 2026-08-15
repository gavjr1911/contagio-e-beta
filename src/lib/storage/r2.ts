import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"
import {
  ALLOWED_FILE_TYPES,
  getMaxSizeForMime,
  isAllowedMimeType,
  type AllowedMimeType,
  type MediaTypeFromMime,
} from "@/lib/media/constants"

// A allowlist e os limites vivem em @/lib/media/constants (sem dependência de
// servidor, para o client poder importar). Reexportados aqui para não quebrar
// quem já importava de @/lib/storage/r2.
export {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_BY_TYPE,
  getMaxSizeForMime,
  isAllowedMimeType,
  formatFileSize,
} from "@/lib/media/constants"
export type { AllowedMimeType, MediaTypeFromMime } from "@/lib/media/constants"

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
  return isAllowedMimeType(mimeType)
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

  // Limite POR TIPO — vídeo tem teto maior que imagem/PDF/apresentação.
  const maxSize = getMaxSizeForMime(contentType)
  if (contentLength > maxSize) {
    throw new Error(
      `Arquivo muito grande. Limite para este tipo: ${Math.round(maxSize / (1024 * 1024))}MB`
    )
  }

  const { client, bucketName } = await getR2Client()
  // Vídeo grande em conexão lenta pode levar dezenas de minutos; a assinatura é
  // validada no início da requisição, mas a janela precisa cobrir o intervalo
  // entre escolher o arquivo e clicar em enviar.
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

/**
 * URL assinada de LEITURA que força download com o nome original.
 *
 * O botão "Baixar" apontava direto para o domínio público do bucket com
 * `<a download>`, mas esse atributo é ignorado pelo navegador em links
 * cross-origin — o arquivo abria numa aba em vez de baixar. O R2 honra
 * `response-content-disposition` na URL assinada, que resolve isso sem
 * trazer o arquivo para dentro do servidor.
 */
export async function generateDownloadPresignedUrl(
  key: string,
  downloadName: string,
  expiresIn = 300
): Promise<string> {
  const { client, bucketName } = await getR2Client()

  // Aspas e barras invertidas quebrariam o cabeçalho; ASCII puro no filename e
  // o nome completo em filename* (RFC 5987), que cobre acento e espaço.
  const safeName = downloadName.replace(/["\\]/g, "")
  const asciiName = safeName.replace(/[^\x20-\x7E]/g, "_")

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
  })

  return getSignedUrl(client, command, { expiresIn })
}

export interface R2ObjectMetadata {
  contentLength: number
  contentType: string | null
  etag: string | null
}

/**
 * Metadados reais do objeto no bucket.
 *
 * O `confirm` gravava `fileSize` e `mimeType` exatamente como o cliente
 * mandou, enquanto o HeadObject era feito só para dizer "existe" e o resultado
 * jogado fora. Devolver os metadados permite gravar a fonte da verdade.
 */
export async function getObjectMetadata(key: string): Promise<R2ObjectMetadata | null> {
  const { client, bucketName } = await getR2Client()

  try {
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    )
    // Sem ContentLength não dá para validar limite nem gravar tamanho — tratar
    // como falha em vez de registrar `fileSize: 0`.
    if (typeof head.ContentLength !== "number") {
      throw new Error("HeadObject sem ContentLength")
    }
    return {
      contentLength: head.ContentLength,
      contentType: head.ContentType ?? null,
      etag: head.ETag ?? null,
    }
  } catch (error) {
    // Só "não existe" vira null. Engolir todo erro faria uma falha de
    // credencial ou de rede virar a mensagem "o upload pode ter falhado",
    // enganando o usuário depois de ele ter esperado o envio inteiro.
    const name = (error as { name?: string })?.name
    const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode
    if (name === "NotFound" || name === "NoSuchKey" || status === 404) {
      return null
    }
    throw error
  }
}

// Verificar se arquivo existe no R2
export async function fileExistsInR2(key: string): Promise<boolean> {
  try {
    return (await getObjectMetadata(key)) !== null
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
