import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { hash } from "bcryptjs"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  // Criar usuarios
  const passwordHash = await hash("senha123", 12)

  const admin = await prisma.user.upsert({
    where: { email: "admin@contagie.com" },
    update: {},
    create: {
      email: "admin@contagie.com",
      name: "Administrador",
      password: passwordHash,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  })

  const lider1 = await prisma.user.upsert({
    where: { email: "marcos@contagie.com" },
    update: {},
    create: {
      email: "marcos@contagie.com",
      name: "Marcos Silva",
      password: passwordHash,
      role: "LEADER",
      emailVerified: new Date(),
    },
  })

  const lider2 = await prisma.user.upsert({
    where: { email: "ana@contagie.com" },
    update: {},
    create: {
      email: "ana@contagie.com",
      name: "Ana Paula",
      password: passwordHash,
      role: "LEADER",
      emailVerified: new Date(),
    },
  })

  const voluntario1 = await prisma.user.upsert({
    where: { email: "joao@contagie.com" },
    update: {},
    create: {
      email: "joao@contagie.com",
      name: "Joao Pedro",
      password: passwordHash,
      role: "VOLUNTEER",
      emailVerified: new Date(),
    },
  })

  const voluntario2 = await prisma.user.upsert({
    where: { email: "maria@contagie.com" },
    update: {},
    create: {
      email: "maria@contagie.com",
      name: "Maria Clara",
      password: passwordHash,
      role: "VOLUNTEER",
      emailVerified: new Date(),
    },
  })

  const voluntario3 = await prisma.user.upsert({
    where: { email: "pedro@contagie.com" },
    update: {},
    create: {
      email: "pedro@contagie.com",
      name: "Pedro Henrique",
      password: passwordHash,
      role: "VOLUNTEER",
      emailVerified: new Date(),
    },
  })

  const voluntario4 = await prisma.user.upsert({
    where: { email: "julia@contagie.com" },
    update: {},
    create: {
      email: "julia@contagie.com",
      name: "Julia Santos",
      password: passwordHash,
      role: "VOLUNTEER",
      emailVerified: new Date(),
    },
  })

  console.log("Usuarios criados:", 7)

  // Criar ministerios
  const louvor = await prisma.ministry.upsert({
    where: { id: "louvor-ministry" },
    update: {},
    create: {
      id: "louvor-ministry",
      name: "Louvor",
      description: "Ministerio de louvor e adoracao",
      leaderId: lider1.id,
    },
  })

  const midia = await prisma.ministry.upsert({
    where: { id: "midia-ministry" },
    update: {},
    create: {
      id: "midia-ministry",
      name: "Midia",
      description: "Transmissao, projecao e audio",
      leaderId: lider2.id,
    },
  })

  const recepcao = await prisma.ministry.upsert({
    where: { id: "recepcao-ministry" },
    update: {},
    create: {
      id: "recepcao-ministry",
      name: "Recepcao",
      description: "Acolhimento e recepcao de visitantes",
    },
  })

  console.log("Ministerios criados:", 3)

  // Criar posicoes para Louvor
  const posVocal = await prisma.ministryPosition.upsert({
    where: { id: "pos-vocal" },
    update: {},
    create: {
      id: "pos-vocal",
      ministryId: louvor.id,
      name: "Vocal",
    },
  })

  const posGuitarra = await prisma.ministryPosition.upsert({
    where: { id: "pos-guitarra" },
    update: {},
    create: {
      id: "pos-guitarra",
      ministryId: louvor.id,
      name: "Guitarra",
    },
  })

  const posBaixo = await prisma.ministryPosition.upsert({
    where: { id: "pos-baixo" },
    update: {},
    create: {
      id: "pos-baixo",
      ministryId: louvor.id,
      name: "Baixo",
    },
  })

  const posBateria = await prisma.ministryPosition.upsert({
    where: { id: "pos-bateria" },
    update: {},
    create: {
      id: "pos-bateria",
      ministryId: louvor.id,
      name: "Bateria",
    },
  })

  const posTeclado = await prisma.ministryPosition.upsert({
    where: { id: "pos-teclado" },
    update: {},
    create: {
      id: "pos-teclado",
      ministryId: louvor.id,
      name: "Teclado",
    },
  })

  // Posicoes para Midia
  const posProjecao = await prisma.ministryPosition.upsert({
    where: { id: "pos-projecao" },
    update: {},
    create: {
      id: "pos-projecao",
      ministryId: midia.id,
      name: "Projecao",
    },
  })

  const posAudio = await prisma.ministryPosition.upsert({
    where: { id: "pos-audio" },
    update: {},
    create: {
      id: "pos-audio",
      ministryId: midia.id,
      name: "Audio",
    },
  })

  const posTransmissao = await prisma.ministryPosition.upsert({
    where: { id: "pos-transmissao" },
    update: {},
    create: {
      id: "pos-transmissao",
      ministryId: midia.id,
      name: "Transmissao",
    },
  })

  // Posicoes para Recepcao
  const posRecepcionista = await prisma.ministryPosition.upsert({
    where: { id: "pos-recepcionista" },
    update: {},
    create: {
      id: "pos-recepcionista",
      ministryId: recepcao.id,
      name: "Recepcionista",
    },
  })

  console.log("Posicoes criadas:", 9)

  // Adicionar membros aos ministerios
  await prisma.ministryMember.upsert({
    where: { id: "member-marcos-louvor" },
    update: {},
    create: {
      id: "member-marcos-louvor",
      ministryId: louvor.id,
      userId: lider1.id,
    },
  })

  await prisma.ministryMember.upsert({
    where: { id: "member-ana-midia" },
    update: {},
    create: {
      id: "member-ana-midia",
      ministryId: midia.id,
      userId: lider2.id,
    },
  })

  await prisma.ministryMember.upsert({
    where: { id: "member-joao-louvor" },
    update: {},
    create: {
      id: "member-joao-louvor",
      ministryId: louvor.id,
      userId: voluntario1.id,
    },
  })

  await prisma.ministryMember.upsert({
    where: { id: "member-maria-louvor" },
    update: {},
    create: {
      id: "member-maria-louvor",
      ministryId: louvor.id,
      userId: voluntario2.id,
    },
  })

  await prisma.ministryMember.upsert({
    where: { id: "member-pedro-midia" },
    update: {},
    create: {
      id: "member-pedro-midia",
      ministryId: midia.id,
      userId: voluntario3.id,
    },
  })

  await prisma.ministryMember.upsert({
    where: { id: "member-julia-recepcao" },
    update: {},
    create: {
      id: "member-julia-recepcao",
      ministryId: recepcao.id,
      userId: voluntario4.id,
    },
  })

  console.log("Membros de ministerio criados:", 6)

  // Criar musicas
  const songs = [
    { name: "Quao Grande E o Meu Deus", artist: "Soraya Moraes", defaultKey: "G", tags: ["adoracao", "classico"] },
    { name: "Eu Navegarei", artist: "Delino Marcal", defaultKey: "E", tags: ["adoracao"] },
    { name: "Nao Ha Outro Nome", artist: "Livres Para Adorar", defaultKey: "A", tags: ["adoracao", "avivamento"] },
    { name: "Grande E o Senhor", artist: "Adhemar de Campos", defaultKey: "D", tags: ["classico", "adoracao"] },
    { name: "Ruja o Leao", artist: "Fernandinho", defaultKey: "E", tags: ["avivamento"] },
    { name: "Nao Pare", artist: "Midian Lima", defaultKey: "C", tags: ["animada"] },
    { name: "Yeshua", artist: "Fernandinho", defaultKey: "G", tags: ["adoracao"] },
    { name: "Bondade de Deus", artist: "Isaias Saad", defaultKey: "G", tags: ["adoracao", "popular"] },
    { name: "Nao Tenho Palavras", artist: "Thalles Roberto", defaultKey: "E", tags: ["adoracao"] },
    { name: "Novo Dia", artist: "Fernandinho", defaultKey: "A", tags: ["animada", "abertura"] },
    { name: "Sou Feliz", artist: "Nivea Soares", defaultKey: "D", tags: ["animada"] },
    { name: "Digno E o Senhor", artist: "David Quinlan", defaultKey: "G", tags: ["adoracao", "classico"] },
    { name: "Te Louvarei", artist: "Diante do Trono", defaultKey: "C", tags: ["animada"] },
    { name: "Reina", artist: "Eli Soares", defaultKey: "F", tags: ["adoracao"] },
    { name: "Maravilhosa Graca", artist: "Prisma Brasil", defaultKey: "G", tags: ["classico", "hino"] },
  ]

  for (const song of songs) {
    await prisma.song.upsert({
      where: { id: song.name.toLowerCase().replace(/\s+/g, "-").slice(0, 20) },
      update: {},
      create: {
        id: song.name.toLowerCase().replace(/\s+/g, "-").slice(0, 20),
        name: song.name,
        artist: song.artist,
        defaultKey: song.defaultKey,
        tags: song.tags,
        playCount: Math.floor(Math.random() * 50),
      },
    })
  }

  console.log("Musicas criadas:", songs.length)

  // Criar um evento de exemplo
  const hoje = new Date()
  const proximoDomingo = new Date(hoje)
  proximoDomingo.setDate(hoje.getDate() + ((7 - hoje.getDay()) % 7 || 7))

  const evento = await prisma.event.upsert({
    where: { id: "evento-culto-domingo" },
    update: {},
    create: {
      id: "evento-culto-domingo",
      name: "Culto de Domingo",
      type: "SUNDAY_MORNING",
      date: proximoDomingo,
      startTime: new Date("1970-01-01T09:00:00"),
      endTime: new Date("1970-01-01T12:00:00"),
      status: "PUBLISHED",
    },
  })

  console.log("Evento criado:", evento.name)

  console.log("\n=== SEED CONCLUIDO ===")
  console.log("\nUsuarios de teste:")
  console.log("  admin@contagie.com - Administrador")
  console.log("  marcos@contagie.com - Lider Louvor")
  console.log("  ana@contagie.com - Lider Midia")
  console.log("  joao@contagie.com - Voluntario Louvor")
  console.log("  maria@contagie.com - Voluntaria Louvor")
  console.log("  pedro@contagie.com - Voluntario Midia")
  console.log("  julia@contagie.com - Voluntaria Recepcao")
  console.log("\nSenha para todos: senha123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
