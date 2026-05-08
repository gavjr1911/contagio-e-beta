import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { hash } from "bcryptjs"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...")

  // Limpar dados existentes (em ordem de dependência)
  console.log("🗑️  Limpando dados existentes...")
  await prisma.auditLog.deleteMany()
  await prisma.assignmentLog.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.eventVacancy.deleteMany()
  await prisma.setlistItem.deleteMany()
  await prisma.eventItem.deleteMany()
  await prisma.media.deleteMany()
  await prisma.event.deleteMany()
  await prisma.eventTemplate.deleteMany()
  await prisma.blockedDate.deleteMany()
  await prisma.songMapping.deleteMany()
  await prisma.song.deleteMany()
  await prisma.bandMember.deleteMany()
  await prisma.band.deleteMany()
  await prisma.ministryPosition.deleteMany()
  await prisma.ministryMember.deleteMany()
  await prisma.ministry.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
  await prisma.church.deleteMany()

  // 1. Criar Igreja
  console.log("⛪ Criando igreja...")
  const church = await prisma.church.create({
    data: {
      id: "church-beta",
      name: "Igreja Beta",
      slug: "beta",
    },
  })

  // 2. Criar Usuários
  console.log("👥 Criando usuários...")
  const passwordHash = await hash("123456", 12)

  const admin = await prisma.user.create({
    data: {
      id: "user-admin",
      name: "Gilson Vila",
      email: "admin@beta.church",
      password: passwordHash,
      role: "ADMIN",
      phone: "(11) 99999-0001",
      emailVerified: new Date(),
    },
  })

  const coordinator = await prisma.user.create({
    data: {
      id: "user-coordinator",
      name: "Ana Paula Silva",
      email: "ana@beta.church",
      password: passwordHash,
      role: "LEADER",
      phone: "(11) 99999-0002",
      emailVerified: new Date(),
    },
  })

  const leader1 = await prisma.user.create({
    data: {
      id: "user-leader-louvor",
      name: "Carlos Eduardo",
      email: "carlos@beta.church",
      password: passwordHash,
      role: "LEADER",
      phone: "(11) 99999-0003",
      emailVerified: new Date(),
    },
  })

  const leader2 = await prisma.user.create({
    data: {
      id: "user-leader-midia",
      name: "Fernanda Costa",
      email: "fernanda@beta.church",
      password: passwordHash,
      role: "LEADER",
      phone: "(11) 99999-0004",
      emailVerified: new Date(),
    },
  })

  // Voluntários
  const volunteers = await Promise.all([
    prisma.user.create({
      data: {
        id: "user-vol-1",
        name: "João Pedro Santos",
        email: "joao@beta.church",
        password: passwordHash,
        role: "VOLUNTEER",
        phone: "(11) 98888-0001",
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        id: "user-vol-2",
        name: "Maria Clara Oliveira",
        email: "maria@beta.church",
        password: passwordHash,
        role: "VOLUNTEER",
        phone: "(11) 98888-0002",
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        id: "user-vol-3",
        name: "Lucas Mendes",
        email: "lucas@beta.church",
        password: passwordHash,
        role: "VOLUNTEER",
        phone: "(11) 98888-0003",
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        id: "user-vol-4",
        name: "Beatriz Almeida",
        email: "beatriz@beta.church",
        password: passwordHash,
        role: "VOLUNTEER",
        phone: "(11) 98888-0004",
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        id: "user-vol-5",
        name: "Pedro Henrique",
        email: "pedro@beta.church",
        password: passwordHash,
        role: "VOLUNTEER",
        phone: "(11) 98888-0005",
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        id: "user-vol-6",
        name: "Julia Fernandes",
        email: "julia@beta.church",
        password: passwordHash,
        role: "VOLUNTEER",
        phone: "(11) 98888-0006",
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        id: "user-vol-7",
        name: "Gabriel Souza",
        email: "gabriel@beta.church",
        password: passwordHash,
        role: "VOLUNTEER",
        phone: "(11) 98888-0007",
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        id: "user-vol-8",
        name: "Isabela Lima",
        email: "isabela@beta.church",
        password: passwordHash,
        role: "VOLUNTEER",
        phone: "(11) 98888-0008",
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        id: "user-vol-9",
        name: "Rafael Martins",
        email: "rafael@beta.church",
        password: passwordHash,
        role: "VOLUNTEER",
        phone: "(11) 98888-0009",
        emailVerified: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        id: "user-vol-10",
        name: "Camila Rocha",
        email: "camila@beta.church",
        password: passwordHash,
        role: "VOLUNTEER",
        phone: "(11) 98888-0010",
        emailVerified: new Date(),
      },
    }),
  ])

  // 3. Criar Ministérios
  console.log("🎵 Criando ministérios...")

  const ministryLouvor = await prisma.ministry.create({
    data: {
      id: "ministry-louvor",
      name: "Louvor",
      description: "Ministério de louvor e adoração",
      type: "WORSHIP",
      churchId: church.id,
      leaderId: leader1.id,
      color: "#F97316",
    },
  })

  const ministryMidia = await prisma.ministry.create({
    data: {
      id: "ministry-midia",
      name: "Mídia",
      description: "Ministério de mídia e transmissão",
      type: "MEDIA",
      churchId: church.id,
      leaderId: leader2.id,
      color: "#3B82F6",
    },
  })

  const ministryRecepcao = await prisma.ministry.create({
    data: {
      id: "ministry-recepcao",
      name: "Recepção",
      description: "Ministério de acolhimento e recepção",
      type: "MINISTRY",
      churchId: church.id,
      leaderId: coordinator.id,
      color: "#10B981",
    },
  })

  const ministryKids = await prisma.ministry.create({
    data: {
      id: "ministry-kids",
      name: "Kids",
      description: "Ministério infantil",
      type: "MINISTRY",
      churchId: church.id,
      leaderId: coordinator.id,
      color: "#EC4899",
    },
  })

  // 4. Criar Posições nos Ministérios
  console.log("📋 Criando posições...")

  // Posições do Louvor
  const posLiderLouvor = await prisma.ministryPosition.create({
    data: { id: "pos-lider-louvor", name: "Líder de Louvor", ministryId: ministryLouvor.id, order: 1 },
  })
  const posVocalista = await prisma.ministryPosition.create({
    data: { id: "pos-vocalista", name: "Vocalista", ministryId: ministryLouvor.id, order: 2 },
  })
  const posGuitarra = await prisma.ministryPosition.create({
    data: { id: "pos-guitarra", name: "Guitarra", ministryId: ministryLouvor.id, order: 3 },
  })
  const posBaixo = await prisma.ministryPosition.create({
    data: { id: "pos-baixo", name: "Baixo", ministryId: ministryLouvor.id, order: 4 },
  })
  const posBateria = await prisma.ministryPosition.create({
    data: { id: "pos-bateria", name: "Bateria", ministryId: ministryLouvor.id, order: 5 },
  })
  const posTeclado = await prisma.ministryPosition.create({
    data: { id: "pos-teclado", name: "Teclado", ministryId: ministryLouvor.id, order: 6 },
  })

  // Posições da Mídia
  const posOperadorSom = await prisma.ministryPosition.create({
    data: { id: "pos-som", name: "Operador de Som", ministryId: ministryMidia.id, order: 1 },
  })
  const posOperadorProjetor = await prisma.ministryPosition.create({
    data: { id: "pos-projetor", name: "Operador de Projetor", ministryId: ministryMidia.id, order: 2 },
  })
  const posTransmissao = await prisma.ministryPosition.create({
    data: { id: "pos-transmissao", name: "Transmissão", ministryId: ministryMidia.id, order: 3 },
  })

  // Posições da Recepção
  const posRecepcionista = await prisma.ministryPosition.create({
    data: { id: "pos-recepcionista", name: "Recepcionista", ministryId: ministryRecepcao.id, order: 1 },
  })
  const posDiacono = await prisma.ministryPosition.create({
    data: { id: "pos-diacono", name: "Diácono", ministryId: ministryRecepcao.id, order: 2 },
  })

  // Posições do Kids
  const posProfessorKids = await prisma.ministryPosition.create({
    data: { id: "pos-professor-kids", name: "Professor", ministryId: ministryKids.id, order: 1 },
  })
  const posAuxiliarKids = await prisma.ministryPosition.create({
    data: { id: "pos-auxiliar-kids", name: "Auxiliar", ministryId: ministryKids.id, order: 2 },
  })

  // 5. Adicionar membros aos ministérios
  console.log("👤 Adicionando membros aos ministérios...")

  // Membros do Louvor
  await prisma.ministryMember.createMany({
    data: [
      { id: "mm-1", userId: leader1.id, ministryId: ministryLouvor.id, positionId: posLiderLouvor.id },
      { id: "mm-2", userId: volunteers[0].id, ministryId: ministryLouvor.id, positionId: posVocalista.id },
      { id: "mm-3", userId: volunteers[1].id, ministryId: ministryLouvor.id, positionId: posVocalista.id },
      { id: "mm-4", userId: volunteers[2].id, ministryId: ministryLouvor.id, positionId: posGuitarra.id },
      { id: "mm-5", userId: volunteers[3].id, ministryId: ministryLouvor.id, positionId: posBaixo.id },
      { id: "mm-6", userId: volunteers[4].id, ministryId: ministryLouvor.id, positionId: posBateria.id },
      { id: "mm-7", userId: volunteers[5].id, ministryId: ministryLouvor.id, positionId: posTeclado.id },
    ],
  })

  // Membros da Mídia
  await prisma.ministryMember.createMany({
    data: [
      { id: "mm-8", userId: leader2.id, ministryId: ministryMidia.id, positionId: posOperadorSom.id },
      { id: "mm-9", userId: volunteers[6].id, ministryId: ministryMidia.id, positionId: posOperadorSom.id },
      { id: "mm-10", userId: volunteers[7].id, ministryId: ministryMidia.id, positionId: posOperadorProjetor.id },
      { id: "mm-11", userId: volunteers[8].id, ministryId: ministryMidia.id, positionId: posTransmissao.id },
    ],
  })

  // Membros da Recepção
  await prisma.ministryMember.createMany({
    data: [
      { id: "mm-12", userId: volunteers[9].id, ministryId: ministryRecepcao.id, positionId: posRecepcionista.id },
      { id: "mm-13", userId: volunteers[0].id, ministryId: ministryRecepcao.id, positionId: posDiacono.id },
      { id: "mm-14", userId: volunteers[2].id, ministryId: ministryRecepcao.id, positionId: posRecepcionista.id },
    ],
  })

  // Membros do Kids
  await prisma.ministryMember.createMany({
    data: [
      { id: "mm-15", userId: volunteers[1].id, ministryId: ministryKids.id, positionId: posProfessorKids.id },
      { id: "mm-16", userId: volunteers[4].id, ministryId: ministryKids.id, positionId: posAuxiliarKids.id },
    ],
  })

  // 6. Criar Músicas
  console.log("🎶 Criando músicas...")

  await Promise.all([
    prisma.song.create({
      data: {
        id: "song-1",
        name: "Grande é o Senhor",
        artist: "Adhemar de Campos",
        defaultKey: "G",
        bpm: 72,
        genre: "Adoração",
        lyrics: "Grande é o Senhor e mui digno de louvor...",
        churchId: church.id,
        tags: ["adoracao", "classico"],
        playCount: 45,
      },
    }),
    prisma.song.create({
      data: {
        id: "song-2",
        name: "Nada Além do Sangue",
        artist: "Fernandinho",
        defaultKey: "E",
        bpm: 68,
        genre: "Adoração",
        lyrics: "Nada além do sangue de Jesus...",
        churchId: church.id,
        tags: ["adoracao"],
        playCount: 38,
      },
    }),
    prisma.song.create({
      data: {
        id: "song-3",
        name: "Bondade de Deus",
        artist: "Isaias Saad",
        defaultKey: "D",
        bpm: 74,
        genre: "Louvor",
        lyrics: "Eu amo o Senhor, Ele ouviu a minha voz...",
        churchId: church.id,
        tags: ["adoracao", "popular"],
        playCount: 52,
      },
    }),
    prisma.song.create({
      data: {
        id: "song-4",
        name: "Lugar Secreto",
        artist: "Gabriela Rocha",
        defaultKey: "C",
        bpm: 65,
        genre: "Adoração",
        lyrics: "Quero o Teu querer, sonhar Teus sonhos...",
        churchId: church.id,
        tags: ["adoracao", "intimidade"],
        playCount: 30,
      },
    }),
    prisma.song.create({
      data: {
        id: "song-5",
        name: "Vou Louvar",
        artist: "Preto no Branco",
        defaultKey: "A",
        bpm: 128,
        genre: "Celebração",
        lyrics: "Vou louvar, vou louvar ao meu Deus...",
        churchId: church.id,
        tags: ["animada", "celebracao"],
        playCount: 41,
      },
    }),
    prisma.song.create({
      data: {
        id: "song-6",
        name: "Creio em Ti",
        artist: "Vocal Livre",
        defaultKey: "F",
        bpm: 80,
        genre: "Adoração",
        lyrics: "Quando eu olho o sol nascendo...",
        churchId: church.id,
        tags: ["adoracao"],
        playCount: 25,
      },
    }),
    prisma.song.create({
      data: {
        id: "song-7",
        name: "Eu Navegarei",
        artist: "Delino Marçal",
        defaultKey: "Bb",
        bpm: 70,
        genre: "Louvor",
        lyrics: "Eu navegarei no oceano do Espírito...",
        churchId: church.id,
        tags: ["adoracao", "avivamento"],
        playCount: 33,
      },
    }),
    prisma.song.create({
      data: {
        id: "song-8",
        name: "Porque Ele Vive",
        artist: "Andréa Fontes",
        defaultKey: "G",
        bpm: 85,
        genre: "Celebração",
        lyrics: "Deus enviou Seu único Filho...",
        churchId: church.id,
        tags: ["celebracao", "classico"],
        playCount: 48,
      },
    }),
    prisma.song.create({
      data: {
        id: "song-9",
        name: "Quão Grande É o Meu Deus",
        artist: "Soraya Moraes",
        defaultKey: "G",
        bpm: 76,
        genre: "Adoração",
        lyrics: "A grandeza do meu Deus...",
        churchId: church.id,
        tags: ["adoracao", "popular"],
        playCount: 55,
      },
    }),
    prisma.song.create({
      data: {
        id: "song-10",
        name: "Yeshua",
        artist: "Fernandinho",
        defaultKey: "E",
        bpm: 62,
        genre: "Adoração",
        lyrics: "Há um nome que eu sei...",
        churchId: church.id,
        tags: ["adoracao", "intimidade"],
        playCount: 60,
      },
    }),
  ])

  // 7. Criar Eventos
  console.log("📅 Criando eventos...")

  const today = new Date()
  const nextSunday = new Date(today)
  nextSunday.setDate(today.getDate() + ((7 - today.getDay()) % 7 || 7))
  nextSunday.setHours(10, 0, 0, 0)

  const nextSunday2 = new Date(nextSunday)
  nextSunday2.setDate(nextSunday2.getDate() + 7)

  const nextSunday3 = new Date(nextSunday2)
  nextSunday3.setDate(nextSunday3.getDate() + 7)

  // Evento 1 - Próximo Domingo
  const event1 = await prisma.event.create({
    data: {
      id: "event-culto-domingo-1",
      name: "Culto de Domingo",
      description: "Culto dominical de celebração",
      type: "CULTO",
      status: "PUBLISHED",
      date: nextSunday,
      startTime: "10:00",
      endTime: "12:00",
      location: "Templo Principal",
      churchId: church.id,
    },
  })

  // Evento 2 - Domingo seguinte
  const event2 = await prisma.event.create({
    data: {
      id: "event-culto-domingo-2",
      name: "Culto de Domingo",
      description: "Culto dominical de celebração",
      type: "CULTO",
      status: "PUBLISHED",
      date: nextSunday2,
      startTime: "10:00",
      endTime: "12:00",
      location: "Templo Principal",
      churchId: church.id,
    },
  })

  // Evento 3 - Terceiro domingo (Especial)
  const event3 = await prisma.event.create({
    data: {
      id: "event-culto-especial",
      name: "Culto Especial de Celebração",
      description: "Celebração especial com participações",
      type: "SPECIAL",
      status: "PUBLISHED",
      date: nextSunday3,
      startTime: "10:00",
      endTime: "13:00",
      location: "Templo Principal",
      churchId: church.id,
    },
  })

  // 8. Criar Itens da Ordem do Culto
  console.log("📝 Criando ordem do culto...")

  // Itens do Evento 1
  await prisma.eventItem.createMany({
    data: [
      { id: "ei-1-1", eventId: event1.id, order: 1, type: "WELCOME", title: "Boas-vindas", durationMinutes: 5, requiresMedia: false },
      { id: "ei-1-2", eventId: event1.id, order: 2, type: "WORSHIP", title: "Bloco de Louvor", durationMinutes: 25, requiresMedia: true },
      { id: "ei-1-3", eventId: event1.id, order: 3, type: "PRAYER", title: "Oração", durationMinutes: 5, requiresMedia: false },
      { id: "ei-1-4", eventId: event1.id, order: 4, type: "ANNOUNCEMENTS", title: "Avisos", durationMinutes: 5, requiresMedia: true },
      { id: "ei-1-5", eventId: event1.id, order: 5, type: "OFFERING", title: "Dízimos e Ofertas", durationMinutes: 10, requiresMedia: true },
      { id: "ei-1-6", eventId: event1.id, order: 6, type: "PREACHING", title: "Palavra - Pr. João", durationMinutes: 40, requiresMedia: true },
      { id: "ei-1-7", eventId: event1.id, order: 7, type: "WORSHIP", title: "Adoração Final", durationMinutes: 10, requiresMedia: false },
    ],
  })

  // Itens do Evento 2
  await prisma.eventItem.createMany({
    data: [
      { id: "ei-2-1", eventId: event2.id, order: 1, type: "WELCOME", title: "Boas-vindas", durationMinutes: 5, requiresMedia: false },
      { id: "ei-2-2", eventId: event2.id, order: 2, type: "WORSHIP", title: "Bloco de Louvor", durationMinutes: 25, requiresMedia: true },
      { id: "ei-2-3", eventId: event2.id, order: 3, type: "READING", title: "Leitura Bíblica", durationMinutes: 5, requiresMedia: true },
      { id: "ei-2-4", eventId: event2.id, order: 4, type: "ANNOUNCEMENTS", title: "Avisos", durationMinutes: 5, requiresMedia: true },
      { id: "ei-2-5", eventId: event2.id, order: 5, type: "OFFERING", title: "Dízimos e Ofertas", durationMinutes: 10, requiresMedia: true },
      { id: "ei-2-6", eventId: event2.id, order: 6, type: "PREACHING", title: "Palavra - Pra. Maria", durationMinutes: 40, requiresMedia: true },
      { id: "ei-2-7", eventId: event2.id, order: 7, type: "COMMUNION", title: "Santa Ceia", durationMinutes: 15, requiresMedia: false },
    ],
  })

  // Itens do Evento 3 (Especial)
  await prisma.eventItem.createMany({
    data: [
      { id: "ei-3-1", eventId: event3.id, order: 1, type: "VIDEO", title: "Vídeo de Abertura", durationMinutes: 5, requiresMedia: true },
      { id: "ei-3-2", eventId: event3.id, order: 2, type: "WELCOME", title: "Boas-vindas Especial", durationMinutes: 10, requiresMedia: false },
      { id: "ei-3-3", eventId: event3.id, order: 3, type: "WORSHIP", title: "Bloco de Louvor", durationMinutes: 30, requiresMedia: true },
      { id: "ei-3-4", eventId: event3.id, order: 4, type: "SPECIAL", title: "Participação Coral", durationMinutes: 15, requiresMedia: true },
      { id: "ei-3-5", eventId: event3.id, order: 5, type: "ANNOUNCEMENTS", title: "Avisos", durationMinutes: 5, requiresMedia: true },
      { id: "ei-3-6", eventId: event3.id, order: 6, type: "OFFERING", title: "Dízimos e Ofertas", durationMinutes: 10, requiresMedia: true },
      { id: "ei-3-7", eventId: event3.id, order: 7, type: "PREACHING", title: "Mensagem Especial", durationMinutes: 50, requiresMedia: true },
      { id: "ei-3-8", eventId: event3.id, order: 8, type: "COMMUNION", title: "Santa Ceia", durationMinutes: 20, requiresMedia: false },
      { id: "ei-3-9", eventId: event3.id, order: 9, type: "WORSHIP", title: "Adoração Final", durationMinutes: 15, requiresMedia: false },
    ],
  })

  // 9. Criar Vagas nos Eventos
  console.log("🎯 Criando vagas nos eventos...")

  // Vagas Evento 1
  const vacancies1 = await Promise.all([
    // Louvor
    prisma.eventVacancy.create({ data: { id: "vac-1-1", eventId: event1.id, ministryId: ministryLouvor.id, positionId: posLiderLouvor.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-1-2", eventId: event1.id, ministryId: ministryLouvor.id, positionId: posVocalista.id, quantity: 2 } }),
    prisma.eventVacancy.create({ data: { id: "vac-1-3", eventId: event1.id, ministryId: ministryLouvor.id, positionId: posGuitarra.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-1-4", eventId: event1.id, ministryId: ministryLouvor.id, positionId: posBaixo.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-1-5", eventId: event1.id, ministryId: ministryLouvor.id, positionId: posBateria.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-1-6", eventId: event1.id, ministryId: ministryLouvor.id, positionId: posTeclado.id, quantity: 1 } }),
    // Mídia
    prisma.eventVacancy.create({ data: { id: "vac-1-7", eventId: event1.id, ministryId: ministryMidia.id, positionId: posOperadorSom.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-1-8", eventId: event1.id, ministryId: ministryMidia.id, positionId: posOperadorProjetor.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-1-9", eventId: event1.id, ministryId: ministryMidia.id, positionId: posTransmissao.id, quantity: 1 } }),
    // Recepção
    prisma.eventVacancy.create({ data: { id: "vac-1-10", eventId: event1.id, ministryId: ministryRecepcao.id, positionId: posRecepcionista.id, quantity: 2 } }),
  ])

  // Vagas Evento 2
  await Promise.all([
    prisma.eventVacancy.create({ data: { id: "vac-2-1", eventId: event2.id, ministryId: ministryLouvor.id, positionId: posLiderLouvor.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-2-2", eventId: event2.id, ministryId: ministryLouvor.id, positionId: posVocalista.id, quantity: 2 } }),
    prisma.eventVacancy.create({ data: { id: "vac-2-3", eventId: event2.id, ministryId: ministryLouvor.id, positionId: posGuitarra.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-2-4", eventId: event2.id, ministryId: ministryLouvor.id, positionId: posBaixo.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-2-5", eventId: event2.id, ministryId: ministryLouvor.id, positionId: posBateria.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-2-6", eventId: event2.id, ministryId: ministryMidia.id, positionId: posOperadorSom.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-2-7", eventId: event2.id, ministryId: ministryMidia.id, positionId: posOperadorProjetor.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-2-8", eventId: event2.id, ministryId: ministryRecepcao.id, positionId: posRecepcionista.id, quantity: 2 } }),
  ])

  // Vagas Evento 3 (mais vagas para evento especial)
  await Promise.all([
    prisma.eventVacancy.create({ data: { id: "vac-3-1", eventId: event3.id, ministryId: ministryLouvor.id, positionId: posLiderLouvor.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-3-2", eventId: event3.id, ministryId: ministryLouvor.id, positionId: posVocalista.id, quantity: 3 } }),
    prisma.eventVacancy.create({ data: { id: "vac-3-3", eventId: event3.id, ministryId: ministryLouvor.id, positionId: posGuitarra.id, quantity: 2 } }),
    prisma.eventVacancy.create({ data: { id: "vac-3-4", eventId: event3.id, ministryId: ministryLouvor.id, positionId: posBaixo.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-3-5", eventId: event3.id, ministryId: ministryLouvor.id, positionId: posBateria.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-3-6", eventId: event3.id, ministryId: ministryLouvor.id, positionId: posTeclado.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-3-7", eventId: event3.id, ministryId: ministryMidia.id, positionId: posOperadorSom.id, quantity: 2 } }),
    prisma.eventVacancy.create({ data: { id: "vac-3-8", eventId: event3.id, ministryId: ministryMidia.id, positionId: posOperadorProjetor.id, quantity: 1 } }),
    prisma.eventVacancy.create({ data: { id: "vac-3-9", eventId: event3.id, ministryId: ministryMidia.id, positionId: posTransmissao.id, quantity: 2 } }),
    prisma.eventVacancy.create({ data: { id: "vac-3-10", eventId: event3.id, ministryId: ministryRecepcao.id, positionId: posRecepcionista.id, quantity: 4 } }),
    prisma.eventVacancy.create({ data: { id: "vac-3-11", eventId: event3.id, ministryId: ministryKids.id, positionId: posProfessorKids.id, quantity: 2 } }),
    prisma.eventVacancy.create({ data: { id: "vac-3-12", eventId: event3.id, ministryId: ministryKids.id, positionId: posAuxiliarKids.id, quantity: 2 } }),
  ])

  // 10. Criar Escalas (algumas confirmadas, algumas pendentes)
  console.log("📊 Criando escalas...")

  // Escalas do Evento 1 (próximo domingo - todas confirmadas)
  await prisma.schedule.createMany({
    data: [
      { id: "sch-1-1", userId: leader1.id, eventId: event1.id, ministryId: ministryLouvor.id, vacancyId: vacancies1[0].id, status: "CONFIRMED", position: "Líder de Louvor", confirmedAt: new Date() },
      { id: "sch-1-2", userId: volunteers[0].id, eventId: event1.id, ministryId: ministryLouvor.id, vacancyId: vacancies1[1].id, status: "CONFIRMED", position: "Vocalista", confirmedAt: new Date() },
      { id: "sch-1-3", userId: volunteers[1].id, eventId: event1.id, ministryId: ministryLouvor.id, vacancyId: vacancies1[1].id, status: "CONFIRMED", position: "Vocalista", confirmedAt: new Date() },
      { id: "sch-1-4", userId: volunteers[2].id, eventId: event1.id, ministryId: ministryLouvor.id, vacancyId: vacancies1[2].id, status: "CONFIRMED", position: "Guitarra", confirmedAt: new Date() },
      { id: "sch-1-5", userId: volunteers[3].id, eventId: event1.id, ministryId: ministryLouvor.id, vacancyId: vacancies1[3].id, status: "CONFIRMED", position: "Baixo", confirmedAt: new Date() },
      { id: "sch-1-6", userId: volunteers[4].id, eventId: event1.id, ministryId: ministryLouvor.id, vacancyId: vacancies1[4].id, status: "CONFIRMED", position: "Bateria", confirmedAt: new Date() },
      { id: "sch-1-7", userId: volunteers[5].id, eventId: event1.id, ministryId: ministryLouvor.id, vacancyId: vacancies1[5].id, status: "CONFIRMED", position: "Teclado", confirmedAt: new Date() },
      { id: "sch-1-8", userId: leader2.id, eventId: event1.id, ministryId: ministryMidia.id, vacancyId: vacancies1[6].id, status: "CONFIRMED", position: "Operador de Som", confirmedAt: new Date() },
      { id: "sch-1-9", userId: volunteers[7].id, eventId: event1.id, ministryId: ministryMidia.id, vacancyId: vacancies1[7].id, status: "CONFIRMED", position: "Operador de Projetor", confirmedAt: new Date() },
      { id: "sch-1-10", userId: volunteers[8].id, eventId: event1.id, ministryId: ministryMidia.id, vacancyId: vacancies1[8].id, status: "CONFIRMED", position: "Transmissão", confirmedAt: new Date() },
      { id: "sch-1-11", userId: volunteers[9].id, eventId: event1.id, ministryId: ministryRecepcao.id, vacancyId: vacancies1[9].id, status: "CONFIRMED", position: "Recepcionista", confirmedAt: new Date() },
    ],
  })

  // Escalas do Evento 2 (algumas pendentes, algumas confirmadas)
  await prisma.schedule.createMany({
    data: [
      { id: "sch-2-1", userId: leader1.id, eventId: event2.id, ministryId: ministryLouvor.id, status: "PENDING", position: "Líder de Louvor" },
      { id: "sch-2-2", userId: volunteers[0].id, eventId: event2.id, ministryId: ministryLouvor.id, status: "PENDING", position: "Vocalista" },
      { id: "sch-2-3", userId: volunteers[2].id, eventId: event2.id, ministryId: ministryLouvor.id, status: "PENDING", position: "Guitarra" },
      { id: "sch-2-4", userId: volunteers[6].id, eventId: event2.id, ministryId: ministryMidia.id, status: "PENDING", position: "Operador de Som" },
      { id: "sch-2-5", userId: volunteers[7].id, eventId: event2.id, ministryId: ministryMidia.id, status: "CONFIRMED", position: "Operador de Projetor", confirmedAt: new Date() },
    ],
  })

  // Escalas do Evento 3 (algumas recusadas, algumas pendentes)
  await prisma.schedule.createMany({
    data: [
      { id: "sch-3-1", userId: leader1.id, eventId: event3.id, ministryId: ministryLouvor.id, status: "CONFIRMED", position: "Líder de Louvor", confirmedAt: new Date() },
      { id: "sch-3-2", userId: volunteers[1].id, eventId: event3.id, ministryId: ministryLouvor.id, status: "DECLINED", position: "Vocalista", declineReason: "Estarei viajando" },
      { id: "sch-3-3", userId: volunteers[4].id, eventId: event3.id, ministryId: ministryLouvor.id, status: "PENDING", position: "Bateria" },
      { id: "sch-3-4", userId: volunteers[6].id, eventId: event3.id, ministryId: ministryMidia.id, status: "PENDING", position: "Operador de Som" },
    ],
  })

  // 11. Criar Template de Evento
  console.log("📋 Criando templates...")

  await prisma.eventTemplate.create({
    data: {
      id: "template-culto-domingo",
      name: "Culto de Domingo Padrão",
      description: "Template padrão para cultos dominicais",
      eventType: "CULTO",
      duration: 120,
      createdById: admin.id,
      defaultItems: JSON.stringify([
        { type: "WELCOME", title: "Boas-vindas", durationMinutes: 5, requiresMedia: false },
        { type: "WORSHIP", title: "Bloco de Louvor", durationMinutes: 25, requiresMedia: true },
        { type: "PRAYER", title: "Oração", durationMinutes: 5, requiresMedia: false },
        { type: "ANNOUNCEMENTS", title: "Avisos", durationMinutes: 5, requiresMedia: true },
        { type: "OFFERING", title: "Dízimos e Ofertas", durationMinutes: 10, requiresMedia: true },
        { type: "PREACHING", title: "Palavra", durationMinutes: 40, requiresMedia: true },
        { type: "WORSHIP", title: "Adoração Final", durationMinutes: 10, requiresMedia: false },
      ]),
      defaultSchedules: JSON.stringify([
        { ministryId: ministryLouvor.id, positionId: posLiderLouvor.id, quantity: 1 },
        { ministryId: ministryLouvor.id, positionId: posVocalista.id, quantity: 2 },
        { ministryId: ministryLouvor.id, positionId: posGuitarra.id, quantity: 1 },
        { ministryId: ministryLouvor.id, positionId: posBaixo.id, quantity: 1 },
        { ministryId: ministryLouvor.id, positionId: posBateria.id, quantity: 1 },
        { ministryId: ministryMidia.id, positionId: posOperadorSom.id, quantity: 1 },
        { ministryId: ministryMidia.id, positionId: posOperadorProjetor.id, quantity: 1 },
        { ministryId: ministryRecepcao.id, positionId: posRecepcionista.id, quantity: 2 },
      ]),
    },
  })

  // 12. Criar algumas datas bloqueadas
  console.log("🚫 Criando datas bloqueadas...")

  const nextMonth = new Date(today)
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  await prisma.blockedDate.createMany({
    data: [
      {
        id: "bd-1",
        userId: volunteers[1].id,
        startDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 10),
        endDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 17),
        reason: "Férias",
      },
      {
        id: "bd-2",
        userId: volunteers[3].id,
        startDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 5),
        endDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 5),
        reason: "Compromisso pessoal",
      },
    ],
  })

  // 13. Criar Banda
  console.log("🎸 Criando banda...")

  const banda = await prisma.band.create({
    data: {
      id: "band-principal",
      name: "Banda Principal",
      churchId: church.id,
    },
  })

  await prisma.bandMember.createMany({
    data: [
      { id: "bm-1", bandId: banda.id, userId: leader1.id, role: "Líder/Vocalista" },
      { id: "bm-2", bandId: banda.id, userId: volunteers[0].id, role: "Vocalista" },
      { id: "bm-3", bandId: banda.id, userId: volunteers[2].id, role: "Guitarra" },
      { id: "bm-4", bandId: banda.id, userId: volunteers[3].id, role: "Baixo" },
      { id: "bm-5", bandId: banda.id, userId: volunteers[4].id, role: "Bateria" },
      { id: "bm-6", bandId: banda.id, userId: volunteers[5].id, role: "Teclado" },
    ],
  })

  // 14. Criar Setlist para o evento 1
  console.log("🎼 Criando setlist...")

  await prisma.setlistItem.createMany({
    data: [
      { id: "sl-1", eventId: event1.id, songId: "song-5", order: 1, key: "A", notes: "Abertura animada" },
      { id: "sl-2", eventId: event1.id, songId: "song-9", order: 2, key: "G", notes: "" },
      { id: "sl-3", eventId: event1.id, songId: "song-3", order: 3, key: "D", notes: "Transição para adoração" },
      { id: "sl-4", eventId: event1.id, songId: "song-10", order: 4, key: "E", notes: "Ministração" },
    ],
  })

  // Resumo final
  console.log("\n✅ Seed concluído com sucesso!")
  console.log("\n📊 Dados criados:")
  console.log("   - 1 Igreja")
  console.log("   - 14 Usuários (1 admin, 1 coordenador, 2 líderes, 10 voluntários)")
  console.log("   - 4 Ministérios (Louvor, Mídia, Recepção, Kids)")
  console.log("   - 13 Posições")
  console.log("   - 10 Músicas")
  console.log("   - 3 Eventos")
  console.log("   - 23 Itens da ordem do culto")
  console.log("   - 30 Vagas")
  console.log("   - 20 Escalas")
  console.log("   - 1 Template")
  console.log("   - 2 Datas bloqueadas")
  console.log("   - 1 Banda")
  console.log("   - 4 Músicas no setlist")

  console.log("\n🔐 Credenciais de acesso:")
  console.log("   Email: admin@beta.church")
  console.log("   Senha: 123456")
  console.log("\n   Outros usuários também usam senha: 123456")
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
