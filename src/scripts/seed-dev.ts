import "dotenv/config";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seed de desenvolvimento...");

  const passwordHash = await hash("123456", 12);

  // 1. Usuários
  console.log("👥 Criando usuários...");
  const admin = await prisma.user.create({
    data: {
      id: "user-admin",
      name: "Gilson Vila",
      email: "admin@beta.church",
      password: passwordHash,
      role: "ADMIN",
      phone: "11999990001",
      emailVerified: new Date(),
      active: true,
    },
  });

  const leader1 = await prisma.user.create({
    data: {
      id: "user-leader-louvor",
      name: "Carlos Eduardo",
      email: "carlos@beta.church",
      password: passwordHash,
      role: "LEADER",
      phone: "11999990003",
      emailVerified: new Date(),
      active: true,
    },
  });

  const leader2 = await prisma.user.create({
    data: {
      id: "user-leader-midia",
      name: "Fernanda Costa",
      email: "fernanda@beta.church",
      password: passwordHash,
      role: "LEADER",
      phone: "11999990004",
      emailVerified: new Date(),
      active: true,
    },
  });

  const volunteers = await Promise.all(
    [
      { id: "user-vol-1", name: "João Pedro Santos", email: "joao@beta.church", phone: "11988880001" },
      { id: "user-vol-2", name: "Maria Clara Oliveira", email: "maria@beta.church", phone: "11988880002" },
      { id: "user-vol-3", name: "Lucas Mendes", email: "lucas@beta.church", phone: "11988880003" },
      { id: "user-vol-4", name: "Beatriz Almeida", email: "beatriz@beta.church", phone: "11988880004" },
      { id: "user-vol-5", name: "Pedro Henrique", email: "pedro@beta.church", phone: "11988880005" },
      { id: "user-vol-6", name: "Julia Fernandes", email: "julia@beta.church", phone: "11988880006" },
      { id: "user-vol-7", name: "Gabriel Souza", email: "gabriel@beta.church", phone: "11988880007" },
      { id: "user-vol-8", name: "Isabela Lima", email: "isabela@beta.church", phone: "11988880008" },
      // Voluntário sem ministério (para testar guard)
      { id: "user-vol-orphan", name: "Ana Sem Ministerio", email: "ana@beta.church", phone: "11988880099" },
    ].map((u) =>
      prisma.user.create({
        data: { ...u, password: passwordHash, role: "VOLUNTEER", emailVerified: new Date(), active: true },
      })
    )
  );

  // 2. Ministérios com permissões
  console.log("🎵 Criando ministérios...");
  const ministryLouvor = await prisma.ministry.create({
    data: {
      id: "ministry-louvor",
      name: "Louvor",
      description: "Ministério de louvor e adoração",
      leaderId: leader1.id,
      permissions: {
        leader: {
          events: "edit", schedules: "edit", songs: "edit",
          orderOfService: "edit", media: "view", reports: "view",
          ministries: "view", checklists: "none", templates: "view",
        },
        member: {
          events: "view", schedules: "view", songs: "view",
          orderOfService: "view", media: "none", reports: "none",
          ministries: "none", checklists: "none", templates: "none",
        },
      },
    },
  });

  const ministryMidia = await prisma.ministry.create({
    data: {
      id: "ministry-midia",
      name: "Mídia",
      description: "Ministério de mídia e transmissão",
      leaderId: leader2.id,
      permissions: {
        leader: {
          events: "edit", schedules: "edit", songs: "none",
          orderOfService: "view", media: "edit", reports: "view",
          ministries: "view", checklists: "edit", templates: "view",
        },
        member: {
          events: "view", schedules: "view", songs: "none",
          orderOfService: "none", media: "view", reports: "none",
          ministries: "none", checklists: "none", templates: "none",
        },
      },
    },
  });

  const ministryRecepcao = await prisma.ministry.create({
    data: {
      id: "ministry-recepcao",
      name: "Recepção",
      description: "Ministério de acolhimento e recepção",
      leaderId: null,
      // Sem permissions definidas — usará defaults
    },
  });

  // 3. Posições
  console.log("📋 Criando posições...");
  await Promise.all([
    prisma.ministryPosition.create({ data: { name: "Líder de Louvor", icon: "Mic", ministryId: ministryLouvor.id } }),
    prisma.ministryPosition.create({ data: { name: "Vocalista", icon: "Mic2", ministryId: ministryLouvor.id } }),
    prisma.ministryPosition.create({ data: { name: "Guitarra", icon: "Guitar", ministryId: ministryLouvor.id } }),
    prisma.ministryPosition.create({ data: { name: "Baixo", icon: "Guitar", ministryId: ministryLouvor.id } }),
    prisma.ministryPosition.create({ data: { name: "Bateria", icon: "Drum", ministryId: ministryLouvor.id } }),
    prisma.ministryPosition.create({ data: { name: "Teclado", icon: "Piano", ministryId: ministryLouvor.id } }),
    prisma.ministryPosition.create({ data: { name: "Operador de Som", icon: "Monitor", ministryId: ministryMidia.id } }),
    prisma.ministryPosition.create({ data: { name: "Operador de Projetor", icon: "MonitorPlay", ministryId: ministryMidia.id } }),
    prisma.ministryPosition.create({ data: { name: "Transmissão", icon: "Camera", ministryId: ministryMidia.id } }),
    prisma.ministryPosition.create({ data: { name: "Recepcionista", icon: "Handshake", ministryId: ministryRecepcao.id } }),
  ]);

  // 4. Membros
  console.log("👥 Adicionando membros aos ministérios...");
  // Louvor: líder já é leaderId, adicionar voluntários 1-5
  await Promise.all([
    prisma.ministryMember.create({ data: { userId: leader1.id, ministryId: ministryLouvor.id, active: true } }),
    prisma.ministryMember.create({ data: { userId: volunteers[0].id, ministryId: ministryLouvor.id, active: true } }),
    prisma.ministryMember.create({ data: { userId: volunteers[1].id, ministryId: ministryLouvor.id, active: true } }),
    prisma.ministryMember.create({ data: { userId: volunteers[2].id, ministryId: ministryLouvor.id, active: true } }),
    prisma.ministryMember.create({ data: { userId: volunteers[3].id, ministryId: ministryLouvor.id, active: true } }),
    prisma.ministryMember.create({ data: { userId: volunteers[4].id, ministryId: ministryLouvor.id, active: true } }),
  ]);

  // Mídia: líder + voluntários 5-7
  await Promise.all([
    prisma.ministryMember.create({ data: { userId: leader2.id, ministryId: ministryMidia.id, active: true } }),
    prisma.ministryMember.create({ data: { userId: volunteers[4].id, ministryId: ministryMidia.id, active: true } }),
    prisma.ministryMember.create({ data: { userId: volunteers[5].id, ministryId: ministryMidia.id, active: true } }),
    prisma.ministryMember.create({ data: { userId: volunteers[6].id, ministryId: ministryMidia.id, active: true } }),
  ]);

  // Recepção: voluntários 6-7
  await Promise.all([
    prisma.ministryMember.create({ data: { userId: volunteers[5].id, ministryId: ministryRecepcao.id, active: true } }),
    prisma.ministryMember.create({ data: { userId: volunteers[6].id, ministryId: ministryRecepcao.id, active: true } }),
    prisma.ministryMember.create({ data: { userId: volunteers[7].id, ministryId: ministryRecepcao.id, active: true } }),
  ]);

  // 5. Músicas
  console.log("🎶 Criando músicas...");
  await Promise.all([
    prisma.song.create({ data: { name: "Goodness of God", artist: "Bethel Music", defaultKey: "G", tags: ["adoracao", "lento"] } }),
    prisma.song.create({ data: { name: "Way Maker", artist: "Sinach", defaultKey: "E", tags: ["adoracao", "rapido"] } }),
    prisma.song.create({ data: { name: "Build My Life", artist: "Housefires", defaultKey: "G", tags: ["adoracao"] } }),
    prisma.song.create({ data: { name: "Reckless Love", artist: "Cory Asbury", defaultKey: "C", tags: ["adoracao", "lento"] } }),
    prisma.song.create({ data: { name: "O Praise The Name", artist: "Hillsong Worship", defaultKey: "D", tags: ["louvor", "rapido"] } }),
  ]);

  // 6. Eventos
  console.log("📅 Criando eventos...");
  const today = new Date();
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + (7 - today.getDay()));

  await prisma.event.create({
    data: {
      name: "Culto de Domingo",
      type: "CULTO",
      date: nextSunday,
      startTime: new Date("1970-01-01T06:00:00"),
      endTime: new Date("1970-01-01T08:00:00"),
      status: "PUBLISHED",
    },
  });

  const nextSunday2 = new Date(nextSunday);
  nextSunday2.setDate(nextSunday.getDate() + 7);
  await prisma.event.create({
    data: {
      name: "Culto de Domingo",
      type: "CULTO",
      date: nextSunday2,
      startTime: new Date("1970-01-01T06:00:00"),
      endTime: new Date("1970-01-01T08:00:00"),
      status: "PUBLISHED",
    },
  });

  console.log("\n✅ Seed concluído!");
  console.log("\n📋 Contas de teste:");
  console.log("   Admin:     admin@beta.church / 123456");
  console.log("   Líder:     carlos@beta.church / 123456 (Louvor)");
  console.log("   Líder:     fernanda@beta.church / 123456 (Mídia)");
  console.log("   Voluntário: joao@beta.church / 123456 (Louvor)");
  console.log("   Sem ministério: ana@beta.church / 123456 (guard test)");
  console.log("\n   Todos usam senha: 123456");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
