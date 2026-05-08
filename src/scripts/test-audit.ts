import "dotenv/config"
import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Has auditLog:", prisma.auditLog !== undefined)
  console.log("auditLog type:", typeof prisma.auditLog)
  console.log("Testing prisma.auditLog.count...")
  try {
    const count = await prisma.auditLog.count()
    console.log("AuditLog count:", count)
  } catch (e) {
    console.error("Error:", e)
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
