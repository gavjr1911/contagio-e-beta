import { NextRequest } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"
import { apiSuccess, apiError, withAuth } from "@/lib/api-utils"

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    try {
      const formData = await request.formData()
      const file = formData.get("file") as File | null

      if (!file) {
        return apiError("Nenhum arquivo enviado", 400)
      }

      // Validar tipo
      if (!file.type.startsWith("image/")) {
        return apiError("Apenas imagens sao permitidas", 400)
      }

      // Validar tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return apiError("Arquivo muito grande (max 5MB)", 400)
      }

      // Criar diretorio se nao existir
      const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars")
      await mkdir(uploadDir, { recursive: true })

      // Gerar nome unico
      const ext = file.name.split(".").pop()
      const filename = `${randomUUID()}.${ext}`
      const filepath = path.join(uploadDir, filename)

      // Salvar arquivo
      const bytes = await file.arrayBuffer()
      await writeFile(filepath, Buffer.from(bytes))

      const url = `/uploads/avatars/${filename}`
      return apiSuccess({ url })
    } catch (error) {
      console.error("Erro no upload:", error)
      return apiError("Erro ao fazer upload do arquivo", 500)
    }
  })
}
