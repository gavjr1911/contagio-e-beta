import "dotenv/config"
import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { hash } from "bcryptjs"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Iniciando seed...")
  console.log("Limpando dados...")
  
  await prisma.auditLog.deleteMany()
  await prisma.assignmentLog.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.eventVacancy.deleteMany()
  await prisma.setlist.deleteMany()
  await prisma.eventItem.deleteMany()
  await prisma.media.deleteMany()
  await prisma.event.deleteMany()
  await prisma.eventTemplate.deleteMany()
  await prisma.blockedDate.deleteMany()
  await prisma.song.deleteMany()
  await prisma.bandMember.deleteMany()
  await prisma.band.deleteMany()
  await prisma.memberPosition.deleteMany()
  await prisma.ministryPosition.deleteMany()
  await prisma.ministryMember.deleteMany()
  await prisma.ministry.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  console.log("Criando usuarios...")
  const passwordHash = await hash("123456", 12)

  const admin = await prisma.user.create({ data: { id: "user-admin", name: "Gilson Vila", email: "admin@beta.church", password: passwordHash, role: "ADMIN", emailVerified: new Date() } })
  const coordinator = await prisma.user.create({ data: { id: "user-coordinator", name: "Ana Paula Silva", email: "ana@beta.church", password: passwordHash, role: "LEADER", emailVerified: new Date() } })
  const leader1 = await prisma.user.create({ data: { id: "user-leader-louvor", name: "Carlos Eduardo", email: "carlos@beta.church", password: passwordHash, role: "LEADER", emailVerified: new Date() } })
  const leader2 = await prisma.user.create({ data: { id: "user-leader-midia", name: "Fernanda Costa", email: "fernanda@beta.church", password: passwordHash, role: "LEADER", emailVerified: new Date() } })

  const volunteers = await Promise.all([
    prisma.user.create({ data: { id: "user-vol-1", name: "Joao Pedro Santos", email: "joao@beta.church", password: passwordHash, role: "VOLUNTEER", emailVerified: new Date() } }),
    prisma.user.create({ data: { id: "user-vol-2", name: "Maria Clara Oliveira", email: "maria@beta.church", password: passwordHash, role: "VOLUNTEER", emailVerified: new Date() } }),
    prisma.user.create({ data: { id: "user-vol-3", name: "Lucas Mendes", email: "lucas@beta.church", password: passwordHash, role: "VOLUNTEER", emailVerified: new Date() } }),
    prisma.user.create({ data: { id: "user-vol-4", name: "Beatriz Almeida", email: "beatriz@beta.church", password: passwordHash, role: "VOLUNTEER", emailVerified: new Date() } }),
    prisma.user.create({ data: { id: "user-vol-5", name: "Pedro Henrique", email: "pedro@beta.church", password: passwordHash, role: "VOLUNTEER", emailVerified: new Date() } }),
    prisma.user.create({ data: { id: "user-vol-6", name: "Julia Fernandes", email: "julia@beta.church", password: passwordHash, role: "VOLUNTEER", emailVerified: new Date() } }),
    prisma.user.create({ data: { id: "user-vol-7", name: "Gabriel Souza", email: "gabriel@beta.church", password: passwordHash, role: "VOLUNTEER", emailVerified: new Date() } }),
    prisma.user.create({ data: { id: "user-vol-8", name: "Isabela Lima", email: "isabela@beta.church", password: passwordHash, role: "VOLUNTEER", emailVerified: new Date() } }),
    prisma.user.create({ data: { id: "user-vol-9", name: "Rafael Martins", email: "rafael@beta.church", password: passwordHash, role: "VOLUNTEER", emailVerified: new Date() } }),
    prisma.user.create({ data: { id: "user-vol-10", name: "Camila Rocha", email: "camila@beta.church", password: passwordHash, role: "VOLUNTEER", emailVerified: new Date() } }),
  ])

  console.log("Criando ministerios...")
  const ministryLouvor = await prisma.ministry.create({ data: { id: "ministry-louvor", name: "Louvor", description: "Ministerio de louvor e adoracao", leaderId: leader1.id } })
  const ministryMidia = await prisma.ministry.create({ data: { id: "ministry-midia", name: "Midia", description: "Ministerio de midia e transmissao", leaderId: leader2.id } })
  const ministryRecepcao = await prisma.ministry.create({ data: { id: "ministry-recepcao", name: "Recepcao", description: "Acolhimento", leaderId: coordinator.id } })
  const ministryKids = await prisma.ministry.create({ data: { id: "ministry-kids", name: "Kids", description: "Ministerio infantil", leaderId: coordinator.id } })

  console.log("Criando posicoes...")
  const posLiderLouvor = await prisma.ministryPosition.create({ data: { id: "pos-lider-louvor", name: "Lider de Louvor", ministryId: ministryLouvor.id } })
  const posVocalista = await prisma.ministryPosition.create({ data: { id: "pos-vocalista", name: "Vocalista", ministryId: ministryLouvor.id } })
  const posGuitarra = await prisma.ministryPosition.create({ data: { id: "pos-guitarra", name: "Guitarra", ministryId: ministryLouvor.id } })
  const posBaixo = await prisma.ministryPosition.create({ data: { id: "pos-baixo", name: "Baixo", ministryId: ministryLouvor.id } })
  const posBateria = await prisma.ministryPosition.create({ data: { id: "pos-bateria", name: "Bateria", ministryId: ministryLouvor.id } })
  const posTeclado = await prisma.ministryPosition.create({ data: { id: "pos-teclado", name: "Teclado", ministryId: ministryLouvor.id } })
  const posOperadorSom = await prisma.ministryPosition.create({ data: { id: "pos-som", name: "Operador de Som", ministryId: ministryMidia.id } })
  const posOperadorProjetor = await prisma.ministryPosition.create({ data: { id: "pos-projetor", name: "Operador de Projetor", ministryId: ministryMidia.id } })
  const posTransmissao = await prisma.ministryPosition.create({ data: { id: "pos-transmissao", name: "Transmissao", ministryId: ministryMidia.id } })
  const posRecepcionista = await prisma.ministryPosition.create({ data: { id: "pos-recepcionista", name: "Recepcionista", ministryId: ministryRecepcao.id } })
  const posDiacono = await prisma.ministryPosition.create({ data: { id: "pos-diacono", name: "Diacono", ministryId: ministryRecepcao.id } })
  const posProfessorKids = await prisma.ministryPosition.create({ data: { id: "pos-professor-kids", name: "Professor", ministryId: ministryKids.id } })
  const posAuxiliarKids = await prisma.ministryPosition.create({ data: { id: "pos-auxiliar-kids", name: "Auxiliar", ministryId: ministryKids.id } })

  console.log("Adicionando membros...")
  await prisma.ministryMember.createMany({ data: [
    { id: "mm-1", userId: leader1.id, ministryId: ministryLouvor.id },
    { id: "mm-2", userId: volunteers[0].id, ministryId: ministryLouvor.id },
    { id: "mm-3", userId: volunteers[1].id, ministryId: ministryLouvor.id },
    { id: "mm-4", userId: volunteers[2].id, ministryId: ministryLouvor.id },
    { id: "mm-5", userId: volunteers[3].id, ministryId: ministryLouvor.id },
    { id: "mm-6", userId: volunteers[4].id, ministryId: ministryLouvor.id },
    { id: "mm-7", userId: volunteers[5].id, ministryId: ministryLouvor.id },
    { id: "mm-8", userId: leader2.id, ministryId: ministryMidia.id },
    { id: "mm-9", userId: volunteers[6].id, ministryId: ministryMidia.id },
    { id: "mm-10", userId: volunteers[7].id, ministryId: ministryMidia.id },
    { id: "mm-11", userId: volunteers[8].id, ministryId: ministryMidia.id },
    { id: "mm-12", userId: volunteers[9].id, ministryId: ministryRecepcao.id },
    { id: "mm-13", userId: volunteers[0].id, ministryId: ministryRecepcao.id },
    { id: "mm-14", userId: volunteers[2].id, ministryId: ministryRecepcao.id },
    { id: "mm-15", userId: volunteers[1].id, ministryId: ministryKids.id },
    { id: "mm-16", userId: volunteers[4].id, ministryId: ministryKids.id },
  ] })

  console.log("Associando posicoes aos membros...")
  await prisma.memberPosition.createMany({ data: [
    { id: "mp-1", memberId: "mm-1", positionId: posLiderLouvor.id },
    { id: "mp-2", memberId: "mm-2", positionId: posVocalista.id },
    { id: "mp-3", memberId: "mm-3", positionId: posVocalista.id },
    { id: "mp-4", memberId: "mm-4", positionId: posGuitarra.id },
    { id: "mp-5", memberId: "mm-5", positionId: posBaixo.id },
    { id: "mp-6", memberId: "mm-6", positionId: posBateria.id },
    { id: "mp-7", memberId: "mm-7", positionId: posTeclado.id },
    { id: "mp-8", memberId: "mm-8", positionId: posOperadorSom.id },
    { id: "mp-9", memberId: "mm-9", positionId: posOperadorSom.id },
    { id: "mp-10", memberId: "mm-10", positionId: posOperadorProjetor.id },
    { id: "mp-11", memberId: "mm-11", positionId: posTransmissao.id },
    { id: "mp-12", memberId: "mm-12", positionId: posRecepcionista.id },
    { id: "mp-13", memberId: "mm-13", positionId: posDiacono.id },
    { id: "mp-14", memberId: "mm-14", positionId: posRecepcionista.id },
    { id: "mp-15", memberId: "mm-15", positionId: posProfessorKids.id },
    { id: "mp-16", memberId: "mm-16", positionId: posAuxiliarKids.id },
  ] })

  console.log("Criando musicas...")
  await prisma.song.createMany({ data: [
    { id: "song-1", name: "Grande e o Senhor", artist: "Adhemar de Campos", defaultKey: "G", tags: ["adoracao"], playCount: 45 },
    { id: "song-2", name: "Nada Alem do Sangue", artist: "Fernandinho", defaultKey: "E", tags: ["adoracao"], playCount: 38 },
    { id: "song-3", name: "Bondade de Deus", artist: "Isaias Saad", defaultKey: "D", tags: ["adoracao"], playCount: 52 },
    { id: "song-4", name: "Lugar Secreto", artist: "Gabriela Rocha", defaultKey: "C", tags: ["adoracao"], playCount: 30 },
    { id: "song-5", name: "Vou Louvar", artist: "Preto no Branco", defaultKey: "A", tags: ["celebracao"], playCount: 41 },
    { id: "song-6", name: "Creio em Ti", artist: "Vocal Livre", defaultKey: "F", tags: ["adoracao"], playCount: 25 },
    { id: "song-7", name: "Eu Navegarei", artist: "Delino Marcal", defaultKey: "Bb", tags: ["avivamento"], playCount: 33 },
    { id: "song-8", name: "Porque Ele Vive", artist: "Andrea Fontes", defaultKey: "G", tags: ["classico"], playCount: 48 },
    { id: "song-9", name: "Quao Grande E o Meu Deus", artist: "Soraya Moraes", defaultKey: "G", tags: ["popular"], playCount: 55 },
    { id: "song-10", name: "Yeshua", artist: "Fernandinho", defaultKey: "E", tags: ["intimidade"], playCount: 60 },
  ] })

  console.log("Criando eventos...")
  const today = new Date()
  const nextSunday = new Date(today); nextSunday.setDate(today.getDate() + ((7 - today.getDay()) % 7 || 7)); nextSunday.setHours(10, 0, 0, 0)
  const nextSunday2 = new Date(nextSunday); nextSunday2.setDate(nextSunday2.getDate() + 7)
  const nextSunday3 = new Date(nextSunday2); nextSunday3.setDate(nextSunday3.getDate() + 7)

  // Criar DateTime para horas
  const time10 = new Date("1970-01-01T10:00:00.000Z")
  const time12 = new Date("1970-01-01T12:00:00.000Z")
  const time13 = new Date("1970-01-01T13:00:00.000Z")

  const event1 = await prisma.event.create({ data: { id: "event-culto-1", name: "Culto de Domingo", type: "CULTO", status: "PUBLISHED", date: nextSunday, startTime: time10, endTime: time12 } })
  const event2 = await prisma.event.create({ data: { id: "event-culto-2", name: "Culto de Domingo", type: "CULTO", status: "PUBLISHED", date: nextSunday2, startTime: time10, endTime: time12 } })
  const event3 = await prisma.event.create({ data: { id: "event-especial", name: "Culto Especial", type: "SPECIAL", status: "PUBLISHED", date: nextSunday3, startTime: time10, endTime: time13 } })

  console.log("Criando ordem do culto...")
  await prisma.eventItem.createMany({ data: [
    { id: "ei-1-1", eventId: event1.id, order: 1, type: "WELCOME", title: "Boas-vindas", durationMinutes: 5 },
    { id: "ei-1-2", eventId: event1.id, order: 2, type: "WORSHIP", title: "Bloco de Louvor", durationMinutes: 25, requiresMedia: true },
    { id: "ei-1-3", eventId: event1.id, order: 3, type: "PRAYER", title: "Oracao", durationMinutes: 5 },
    { id: "ei-1-4", eventId: event1.id, order: 4, type: "ANNOUNCEMENTS", title: "Avisos", durationMinutes: 5, requiresMedia: true },
    { id: "ei-1-5", eventId: event1.id, order: 5, type: "OFFERING", title: "Dizimos e Ofertas", durationMinutes: 10, requiresMedia: true },
    { id: "ei-1-6", eventId: event1.id, order: 6, type: "PREACHING", title: "Palavra", durationMinutes: 40, requiresMedia: true },
    { id: "ei-1-7", eventId: event1.id, order: 7, type: "WORSHIP", title: "Adoracao Final", durationMinutes: 10 },
  ] })

  console.log("Criando vagas...")
  const vac1 = await prisma.eventVacancy.create({ data: { id: "vac-1-1", eventId: event1.id, ministryId: ministryLouvor.id, positionId: posLiderLouvor.id, quantity: 1 } })
  const vac2 = await prisma.eventVacancy.create({ data: { id: "vac-1-2", eventId: event1.id, ministryId: ministryLouvor.id, positionId: posVocalista.id, quantity: 2 } })
  const vac3 = await prisma.eventVacancy.create({ data: { id: "vac-1-3", eventId: event1.id, ministryId: ministryLouvor.id, positionId: posGuitarra.id, quantity: 1 } })
  const vac4 = await prisma.eventVacancy.create({ data: { id: "vac-1-4", eventId: event1.id, ministryId: ministryMidia.id, positionId: posOperadorSom.id, quantity: 1 } })
  const vac5 = await prisma.eventVacancy.create({ data: { id: "vac-1-5", eventId: event1.id, ministryId: ministryRecepcao.id, positionId: posRecepcionista.id, quantity: 2 } })
  
  await prisma.eventVacancy.createMany({ data: [
    { id: "vac-2-1", eventId: event2.id, ministryId: ministryLouvor.id, positionId: posLiderLouvor.id, quantity: 1 },
    { id: "vac-2-2", eventId: event2.id, ministryId: ministryLouvor.id, positionId: posVocalista.id, quantity: 2 },
    { id: "vac-3-1", eventId: event3.id, ministryId: ministryLouvor.id, positionId: posLiderLouvor.id, quantity: 1 },
    { id: "vac-3-2", eventId: event3.id, ministryId: ministryLouvor.id, positionId: posVocalista.id, quantity: 3 },
  ] })

  console.log("Criando escalas...")
  await prisma.schedule.createMany({ data: [
    { id: "sch-1-1", userId: leader1.id, eventId: event1.id, ministryId: ministryLouvor.id, vacancyId: vac1.id, status: "CONFIRMED", position: "Lider de Louvor", confirmedAt: new Date() },
    { id: "sch-1-2", userId: volunteers[0].id, eventId: event1.id, ministryId: ministryLouvor.id, vacancyId: vac2.id, status: "CONFIRMED", position: "Vocalista", confirmedAt: new Date() },
    { id: "sch-1-3", userId: volunteers[1].id, eventId: event1.id, ministryId: ministryLouvor.id, vacancyId: vac2.id, status: "CONFIRMED", position: "Vocalista", confirmedAt: new Date() },
    { id: "sch-1-4", userId: volunteers[2].id, eventId: event1.id, ministryId: ministryLouvor.id, vacancyId: vac3.id, status: "CONFIRMED", position: "Guitarra", confirmedAt: new Date() },
    { id: "sch-1-5", userId: leader2.id, eventId: event1.id, ministryId: ministryMidia.id, vacancyId: vac4.id, status: "CONFIRMED", position: "Operador de Som", confirmedAt: new Date() },
    { id: "sch-1-6", userId: volunteers[9].id, eventId: event1.id, ministryId: ministryRecepcao.id, vacancyId: vac5.id, status: "CONFIRMED", position: "Recepcionista", confirmedAt: new Date() },
    { id: "sch-2-1", userId: leader1.id, eventId: event2.id, ministryId: ministryLouvor.id, status: "PENDING", position: "Lider de Louvor" },
    { id: "sch-2-2", userId: volunteers[0].id, eventId: event2.id, ministryId: ministryLouvor.id, status: "PENDING", position: "Vocalista" },
    { id: "sch-3-1", userId: leader1.id, eventId: event3.id, ministryId: ministryLouvor.id, status: "CONFIRMED", position: "Lider de Louvor", confirmedAt: new Date() },
    { id: "sch-3-2", userId: volunteers[1].id, eventId: event3.id, ministryId: ministryLouvor.id, status: "DECLINED", position: "Vocalista", declinedReason: "Estarei viajando" },
    { id: "sch-3-3", userId: volunteers[4].id, eventId: event3.id, ministryId: ministryLouvor.id, status: "PENDING", position: "Bateria" },
  ] })

  console.log("Criando template...")
  await prisma.eventTemplate.create({ data: { id: "template-culto", name: "Culto de Domingo Padrao", eventType: "CULTO", duration: 120, createdById: admin.id } })

  console.log("Criando banda...")
  const banda = await prisma.band.create({ data: { id: "band-principal", name: "Banda Principal" } })
  await prisma.bandMember.createMany({ data: [
    { id: "bm-1", bandId: banda.id, userId: leader1.id, instrument: "Vocal" },
    { id: "bm-2", bandId: banda.id, userId: volunteers[0].id, instrument: "Vocal" },
    { id: "bm-3", bandId: banda.id, userId: volunteers[2].id, instrument: "Guitarra" },
  ] })

  console.log("Criando setlist...")
  await prisma.setlist.createMany({ data: [
    { id: "sl-1", eventId: event1.id, songId: "song-5", order: 1, key: "A" },
    { id: "sl-2", eventId: event1.id, songId: "song-9", order: 2, key: "G" },
    { id: "sl-3", eventId: event1.id, songId: "song-3", order: 3, key: "D" },
    { id: "sl-4", eventId: event1.id, songId: "song-10", order: 4, key: "E" },
  ] })

  console.log("Criando notificacoes...")
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date(); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  await prisma.notification.createMany({ data: [
    { id: "notif-1", userId: volunteers[0].id, type: "SCHEDULE_CREATED", title: "Nova escala", message: "Voce foi escalado para Culto de Domingo como Vocalista", read: true, readAt: yesterday },
    { id: "notif-2", userId: volunteers[1].id, type: "SCHEDULE_CREATED", title: "Nova escala", message: "Voce foi escalado para Culto de Domingo como Vocalista", read: false },
    { id: "notif-3", userId: volunteers[2].id, type: "SCHEDULE_CREATED", title: "Nova escala", message: "Voce foi escalado para Culto de Domingo como Guitarra", read: false },
    { id: "notif-4", userId: leader1.id, type: "SCHEDULE_REMINDER", title: "Lembrete de escala", message: "Voce esta escalado para o Culto de Domingo deste fim de semana", read: false },
    { id: "notif-5", userId: volunteers[0].id, type: "SCHEDULE_REMINDER", title: "Lembrete de escala", message: "Nao esqueca do ensaio de sabado as 16h", read: false, createdAt: twoDaysAgo },
    { id: "notif-6", userId: admin.id, type: "SYSTEM", title: "Bem-vindo ao Contagie", message: "Sistema configurado com sucesso! Explore todas as funcionalidades disponíveis.", read: true, readAt: twoDaysAgo },
  ] })

  console.log("Criando audit logs...")
  await prisma.auditLog.createMany({ data: [
    { id: "audit-1", entityType: "Schedule", entityId: "sch-1-1", action: "created", userId: admin.id, userName: admin.name, userEmail: admin.email, changes: { status: { old: null, new: "PENDING" } } },
    { id: "audit-2", entityType: "Schedule", entityId: "sch-1-1", action: "confirmed", userId: leader1.id, userName: leader1.name, userEmail: leader1.email, changes: { status: { old: "PENDING", new: "CONFIRMED" } } },
    { id: "audit-3", entityType: "Schedule", entityId: "sch-3-2", action: "declined", userId: volunteers[1].id, userName: volunteers[1].name, userEmail: volunteers[1].email, changes: { status: { old: "PENDING", new: "DECLINED" }, declinedReason: { old: null, new: "Estarei viajando" } } },
    { id: "audit-4", entityType: "Event", entityId: event1.id, action: "created", userId: admin.id, userName: admin.name, userEmail: admin.email },
    { id: "audit-5", entityType: "Event", entityId: event2.id, action: "created", userId: admin.id, userName: admin.name, userEmail: admin.email },
    { id: "audit-6", entityType: "EventItem", entityId: "ei-1-1", action: "created", userId: admin.id, userName: admin.name, userEmail: admin.email },
  ] })

  console.log("Criando datas bloqueadas...")
  const nextMonth = new Date(); nextMonth.setMonth(nextMonth.getMonth() + 1)
  const nextMonth2 = new Date(nextMonth); nextMonth2.setDate(nextMonth2.getDate() + 1)
  await prisma.blockedDate.createMany({ data: [
    { id: "blocked-1", userId: volunteers[3].id, startDate: nextMonth, endDate: nextMonth2, reason: "Ferias" },
    { id: "blocked-2", userId: volunteers[5].id, startDate: nextSunday, endDate: nextSunday, reason: "Compromisso familiar" },
  ] })

  console.log("\nSeed concluido com sucesso!")
  console.log("Credenciais: admin@beta.church / 123456")
}

main().catch((e) => { console.error("Erro:", e); process.exit(1) }).finally(() => prisma.$disconnect())
