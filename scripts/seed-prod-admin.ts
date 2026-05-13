/**
 * Cria ou atualiza o usuário ADMIN inicial em produção. Idempotente.
 *
 * Variáveis de ambiente esperadas (injetadas via `railway run`):
 *   - DATABASE_URL
 *   - ADMIN_EMAIL
 *   - ADMIN_PASSWORD
 *   - ADMIN_NAME (opcional, default "Administrador")
 *
 * Uso:
 *   railway run --service contagie-beta-web -- \
 *     ADMIN_EMAIL="..." ADMIN_PASSWORD="..." ADMIN_NAME="..." \
 *     npx tsx scripts/seed-prod-admin.ts
 */

import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { hash } from "bcryptjs"

const required = ["DATABASE_URL", "ADMIN_EMAIL", "ADMIN_PASSWORD"] as const
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Variavel ${key} ausente`)
    process.exit(1)
  }
}

const adapter = new PrismaPg(
  new Pool({ connectionString: process.env.DATABASE_URL }),
)
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = process.env.ADMIN_EMAIL!.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD!
  const name = process.env.ADMIN_NAME?.trim() || "Administrador"

  const passwordHash = await hash(password, 12)

  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    const updated = await prisma.user.update({
      where: { email },
      data: {
        name,
        password: passwordHash,
        role: "ADMIN",
        active: true,
        emailVerified: existing.emailVerified ?? new Date(),
      },
      select: { id: true, email: true, role: true },
    })
    console.log(`✅ Admin atualizado: ${updated.email} (${updated.role})`)
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        name,
        password: passwordHash,
        role: "ADMIN",
        active: true,
        emailVerified: new Date(),
      },
      select: { id: true, email: true, role: true },
    })
    console.log(`✅ Admin criado: ${created.email} (${created.role})`)
  }

  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } })
  console.log(`ℹ️  Total de ADMINs no banco: ${adminCount}`)
}

main()
  .catch((err) => {
    console.error("❌ Erro:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
