/**
 * Lista (e opcionalmente remove) objetos do bucket R2 que não têm registro
 * correspondente em `media`.
 *
 * Órfãos aparecem por três caminhos: o usuário fecha a aba entre o PUT e o
 * confirm; o confirm é recusado depois do arquivo já estar no bucket; e a
 * exclusão de um evento, que por `onDelete: Cascade` apaga as linhas de `media`
 * sem tocar no R2. Nenhum deles some sozinho — o storage segue sendo cobrado.
 *
 * Uso (dry-run por padrão, nunca apaga sem --apply):
 *   DB=$(railway variables --service Postgres --kv | grep '^DATABASE_PUBLIC_URL=' | cut -d= -f2-)
 *   eval "$(railway variables --kv | grep -E '^R2_' | sed 's/^/export /;s/=/="/;s/$/"/')"
 *   DATABASE_URL="$DB" npx tsx scripts/r2-orfaos.ts            # só lista
 *   DATABASE_URL="$DB" npx tsx scripts/r2-orfaos.ts --apply    # remove
 *
 * ATENÇÃO: a remoção é irreversível. Confira a lista do dry-run antes.
 */
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { prisma } from "@/lib/prisma"

const c = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})
const Bucket = process.env.R2_BUCKET_NAME!
const APPLY = process.argv.includes("--apply")

/**
 * Idade mínima para considerar um objeto órfão. Existe uma janela entre o PUT
 * terminar e o `confirm` gravar a linha — e com vídeo de 500MB o próprio PUT
 * dura minutos. Sem essa margem, rodar o script durante um upload apagaria o
 * arquivo de quem está no meio da operação.
 */
const IDADE_MINIMA_HORAS = 24

async function main() {
  const rows = await prisma.media.findMany({ select: { filename: true } })
  const registradas = new Set(rows.map((m) => m.filename))
  const limite = Date.now() - IDADE_MINIMA_HORAS * 60 * 60 * 1000

  let bytes = 0
  let orfaos = 0
  let recentes = 0
  let total = 0
  let ContinuationToken: string | undefined

  // ListObjectsV2 devolve no máximo 1000 chaves por página. Sem paginar, um
  // bucket maior que isso reportaria "0 órfãos" com a maior parte nunca lida.
  do {
    const r = await c.send(new ListObjectsV2Command({ Bucket, ContinuationToken }))
    for (const o of r.Contents ?? []) {
      if (!o.Key) continue
      total++
      if (registradas.has(o.Key)) continue

      if (o.LastModified && o.LastModified.getTime() > limite) {
        recentes++
        console.log(`  RECENTE ${o.Key} (pode ser upload em andamento; ignorado)`)
        continue
      }

      orfaos++
      bytes += o.Size ?? 0
      console.log(`  ORFAO   ${o.Key} (${o.Size} bytes)`)
      if (APPLY) await c.send(new DeleteObjectCommand({ Bucket, Key: o.Key }))
    }
    ContinuationToken = r.IsTruncated ? r.NextContinuationToken : undefined
  } while (ContinuationToken)

  console.log(
    `\n${total} objetos no bucket | ${orfaos} orfaos (${(bytes / 1048576).toFixed(2)} MB)` +
      ` | ${recentes} recentes preservados` +
      (APPLY ? " -- ORFAOS REMOVIDOS" : " (dry-run, nada apagado)")
  )
}

main()
  .catch((e) => { console.error("FALHOU:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())
