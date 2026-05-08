import { type NextRequest } from "next/server"
import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"

// POST /api/settings/test-r2 - Testar conexao com R2
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    // Apenas admin pode testar
    if (session.user.role !== "ADMIN") {
      return Response.json(
        { error: "Apenas administradores podem testar a conexao R2" },
        { status: 403 }
      )
    }

    // Buscar configuracoes do banco
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

    // Verificar se todas as configuracoes estao presentes
    const accountId = settingsMap.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID
    const accessKeyId = settingsMap.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = settingsMap.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY
    const bucketName = settingsMap.R2_BUCKET_NAME || process.env.R2_BUCKET_NAME
    const publicUrl = settingsMap.R2_PUBLIC_URL || process.env.R2_PUBLIC_URL

    const missingFields: string[] = []
    if (!accountId) missingFields.push("Account ID")
    if (!accessKeyId) missingFields.push("Access Key ID")
    if (!secretAccessKey) missingFields.push("Secret Access Key")
    if (!bucketName) missingFields.push("Nome do Bucket")
    if (!publicUrl) missingFields.push("URL Publica")

    if (missingFields.length > 0) {
      return Response.json({
        data: {
          success: false,
          message: `Configuracoes ausentes: ${missingFields.join(", ")}`,
          details: {
            configured: false,
            missingFields,
          },
        },
      })
    }

    // Criar cliente S3
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    })

    // Teste 1: Listar objetos (verifica acesso de leitura)
    try {
      await client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          MaxKeys: 1,
        })
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      return Response.json({
        data: {
          success: false,
          message: `Erro ao acessar bucket: ${errorMessage}`,
          details: {
            configured: true,
            readAccess: false,
            writeAccess: false,
          },
        },
      })
    }

    // Teste 2: Criar e deletar arquivo de teste (verifica acesso de escrita)
    const testKey = `_test_connection_${Date.now()}.txt`
    const testContent = "Test connection from Contagie"

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: testKey,
          Body: testContent,
          ContentType: "text/plain",
        })
      )

      // Deletar arquivo de teste
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: testKey,
        })
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      return Response.json({
        data: {
          success: false,
          message: `Erro de escrita no bucket: ${errorMessage}`,
          details: {
            configured: true,
            readAccess: true,
            writeAccess: false,
          },
        },
      })
    }

    // Tudo funcionando!
    return Response.json({
      data: {
        success: true,
        message: "Conexao com R2 funcionando corretamente!",
        details: {
          configured: true,
          readAccess: true,
          writeAccess: true,
          bucketName,
          publicUrl,
        },
      },
    })
  } catch (error) {
    console.error("Error testing R2 connection:", error)
    return Response.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}
