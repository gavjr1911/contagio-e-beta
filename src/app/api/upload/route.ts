import { NextRequest } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"
import { apiSuccess, apiError, withAuth } from "@/lib/api-utils"

// Extensoes permitidas
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"])

// Content-Types permitidos (whitelist do lado do servidor — nao confiar apenas no client)
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

// Magic bytes das assinaturas de arquivo esperadas
// Formato: [offset, bytes esperados em hex]
const MAGIC_SIGNATURES: Array<{ offset: number; bytes: number[] }> = [
  { offset: 0, bytes: [0xff, 0xd8, 0xff] },           // JPEG
  { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] },     // PNG
  { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },     // GIF (GIF87a / GIF89a)
  { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },     // WebP (RIFF header)
]

function hasValidMagicBytes(buffer: Buffer): boolean {
  for (const sig of MAGIC_SIGNATURES) {
    const slice = buffer.slice(sig.offset, sig.offset + sig.bytes.length)
    if (sig.bytes.every((b, i) => slice[i] === b)) {
      return true
    }
  }
  return false
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    try {
      const formData = await request.formData()
      const file = formData.get("file") as File | null

      if (!file) {
        return apiError("Nenhum arquivo enviado", 400)
      }

      // Sanitizar nome do arquivo
      const safeName = path.basename(file.name)

      // Validar extensao via whitelist
      const rawExt = safeName.split(".").pop()?.toLowerCase() ?? ""
      if (!ALLOWED_EXTENSIONS.has(rawExt)) {
        return apiError("Extensão de arquivo não permitida. Use: jpg, jpeg, png, webp ou gif", 400)
      }

      // Validar Content-Type declarado pelo cliente
      if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
        return apiError("Tipo de arquivo não permitido", 400)
      }

      // Validar tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return apiError("Arquivo muito grande (max 5MB)", 400)
      }

      // Ler os bytes e verificar magic bytes reais
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      if (!hasValidMagicBytes(buffer)) {
        return apiError("Conteúdo do arquivo não corresponde a uma imagem válida", 400)
      }

      // Criar diretorio se nao existir
      const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars")
      await mkdir(uploadDir, { recursive: true })

      // Gerar nome unico (usar extensao validada)
      const filename = `${randomUUID()}.${rawExt}`
      const filepath = path.join(uploadDir, filename)

      // Salvar arquivo
      await writeFile(filepath, buffer)

      const url = `/uploads/avatars/${filename}`
      return apiSuccess({ url })
    } catch (error) {
      console.error("Erro no upload:", error)
      return apiError("Erro ao fazer upload do arquivo", 500)
    }
  })
}
