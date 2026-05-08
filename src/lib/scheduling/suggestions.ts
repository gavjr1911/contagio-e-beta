import { prisma } from "@/lib/prisma"

// ============================================
// TYPES & INTERFACES
// ============================================

export interface SuggestionFactors {
  availability: number // 0-30 (data bloqueada = 0)
  frequency: number // 0-25 (menos escalado recentemente = maior)
  history: number // 0-20 (ja participou do ministerio = bonus)
  timeConflict: number // 0-15 (sem evento proximo = bonus)
  positionMatch: number // 0-10 (tem a posicao requerida = bonus)
}

export interface VolunteerSuggestion {
  userId: string
  userName: string | null
  userEmail: string
  userImage: string | null
  memberId: string
  score: number
  factors: SuggestionFactors
  reason: string
  positions: string[]
  lastScheduledAt: Date | null
  totalSchedules: number
  ministrySchedules: number
}

export interface SuggestionsResult {
  suggestions: VolunteerSuggestion[]
  eventId: string
  ministryId: string
  positionId: string | null
  positionName: string | null
}

interface GetSuggestionsParams {
  eventId: string
  ministryId: string
  positionId?: string
  limit?: number
}

// ============================================
// FACTOR WEIGHTS (configurable)
// ============================================

const WEIGHTS = {
  availability: 30, // 30% - Disponibilidade (nao bloqueado)
  frequency: 25, // 25% - Frequencia (menos escalado = prioridade)
  history: 20, // 20% - Historico no ministerio
  timeConflict: 15, // 15% - Sem conflito de horario
  positionMatch: 10, // 10% - Tem a posicao/skill
}

// ============================================
// SUGGESTION ALGORITHM
// ============================================

/**
 * Algoritmo principal de sugestao de voluntarios
 * Considera:
 * 1. Disponibilidade (nao esta em data bloqueada)
 * 2. Frequencia (menos escalado recentemente = prioridade)
 * 3. Historico no ministerio (ja participou antes)
 * 4. Conflitos de horario (nao tem outro evento proximo)
 * 5. Skills/posicoes que ja exerceu
 */
export async function getVolunteerSuggestions(
  params: GetSuggestionsParams
): Promise<SuggestionsResult> {
  const { eventId, ministryId, positionId, limit = 10 } = params

  // Buscar dados do evento
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, date: true, startTime: true, endTime: true },
  })

  if (!event) {
    throw new Error(`Evento nao encontrado: ${eventId}`)
  }

  // Buscar posicao se especificada
  let positionName: string | null = null
  if (positionId) {
    const position = await prisma.ministryPosition.findUnique({
      where: { id: positionId },
      select: { name: true },
    })
    positionName = position?.name || null
  }

  // Buscar membros ativos do ministerio
  const members = await prisma.ministryMember.findMany({
    where: {
      ministryId,
      active: true,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      positions: {
        include: {
          position: { select: { id: true, name: true } },
        },
      },
    },
  })

  // Buscar usuarios ja escalados para este evento (qualquer ministerio)
  const existingSchedules = await prisma.schedule.findMany({
    where: { eventId },
    select: { userId: true },
  })
  const scheduledUserIds = new Set(existingSchedules.map((s) => s.userId))

  // Calcular sugestoes para cada membro
  const suggestions: VolunteerSuggestion[] = []

  for (const member of members) {
    // Pular se ja esta escalado neste evento
    if (scheduledUserIds.has(member.userId)) {
      continue
    }

    // Calcular fatores
    const factors = await calculateSuggestionFactors({
      userId: member.userId,
      memberId: member.id,
      ministryId,
      eventDate: event.date,
      eventStartTime: event.startTime,
      eventEndTime: event.endTime,
      positionId,
      memberPositions: member.positions.map((p) => p.position.id),
    })

    // Calcular score total (0-100)
    const score = calculateTotalScore(factors)

    // Pular se score = 0 (indisponivel)
    if (score === 0) {
      continue
    }

    // Gerar razao/justificativa
    const reason = generateSuggestionReason(factors, score)

    // Buscar estatisticas do membro
    const stats = await getMemberStats(member.userId, ministryId)

    suggestions.push({
      userId: member.userId,
      userName: member.user.name,
      userEmail: member.user.email,
      userImage: member.user.image,
      memberId: member.id,
      score,
      factors,
      reason,
      positions: member.positions.map((p) => p.position.name),
      lastScheduledAt: stats.lastScheduledAt,
      totalSchedules: stats.totalSchedules,
      ministrySchedules: stats.ministrySchedules,
    })
  }

  // Ordenar por score (maior primeiro)
  suggestions.sort((a, b) => b.score - a.score)

  // Limitar resultados
  const limitedSuggestions = suggestions.slice(0, limit)

  return {
    suggestions: limitedSuggestions,
    eventId,
    ministryId,
    positionId: positionId || null,
    positionName,
  }
}

// ============================================
// FACTOR CALCULATIONS
// ============================================

interface CalculateFactorsParams {
  userId: string
  memberId: string
  ministryId: string
  eventDate: Date
  eventStartTime: Date
  eventEndTime: Date | null
  positionId?: string
  memberPositions: string[]
}

async function calculateSuggestionFactors(
  params: CalculateFactorsParams
): Promise<SuggestionFactors> {
  const {
    userId,
    ministryId,
    eventDate,
    eventStartTime,
    eventEndTime,
    positionId,
    memberPositions,
  } = params

  // 1. DISPONIBILIDADE - Verificar datas bloqueadas
  const availability = await calculateAvailabilityFactor(userId, eventDate)

  // Se indisponivel, retorna todos os fatores como 0
  if (availability === 0) {
    return {
      availability: 0,
      frequency: 0,
      history: 0,
      timeConflict: 0,
      positionMatch: 0,
    }
  }

  // 2. FREQUENCIA - Quantas vezes foi escalado nos ultimos 30 dias
  const frequency = await calculateFrequencyFactor(userId, ministryId, eventDate)

  // 3. HISTORICO - Ja participou do ministerio antes?
  const history = await calculateHistoryFactor(userId, ministryId)

  // 4. CONFLITO DE HORARIO - Tem outro evento no mesmo dia/horario?
  const timeConflict = await calculateTimeConflictFactor(
    userId,
    eventDate,
    eventStartTime,
    eventEndTime
  )

  // 5. POSITION MATCH - Tem a posicao/skill requerida?
  const positionMatch = calculatePositionMatchFactor(positionId, memberPositions)

  return {
    availability,
    frequency,
    history,
    timeConflict,
    positionMatch,
  }
}

/**
 * Verifica se o usuario tem data bloqueada para o evento
 * Retorna WEIGHTS.availability se disponivel, 0 se bloqueado
 */
async function calculateAvailabilityFactor(
  userId: string,
  eventDate: Date
): Promise<number> {
  const blockedDate = await prisma.blockedDate.findFirst({
    where: {
      userId,
      startDate: { lte: eventDate },
      endDate: { gte: eventDate },
    },
  })

  return blockedDate ? 0 : WEIGHTS.availability
}

/**
 * Calcula pontuacao baseada na frequencia de escalas recentes
 * Menos escalas = maior pontuacao
 *
 * 0 escalas nos ultimos 30 dias = 25 pontos (maximo)
 * 1 escala = 20 pontos
 * 2 escalas = 15 pontos
 * 3 escalas = 10 pontos
 * 4+ escalas = 5 pontos
 * 5+ escalas = 0 pontos
 */
async function calculateFrequencyFactor(
  userId: string,
  ministryId: string,
  eventDate: Date
): Promise<number> {
  const thirtyDaysAgo = new Date(eventDate)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentSchedulesCount = await prisma.schedule.count({
    where: {
      userId,
      ministryId,
      event: {
        date: {
          gte: thirtyDaysAgo,
          lt: eventDate,
        },
      },
    },
  })

  // Mapeamento de contagem para pontos
  const frequencyPoints: Record<number, number> = {
    0: WEIGHTS.frequency, // 25
    1: 20,
    2: 15,
    3: 10,
    4: 5,
  }

  return frequencyPoints[recentSchedulesCount] ?? 0
}

/**
 * Verifica historico de participacao no ministerio
 * Mais participacoes = maior pontuacao (ate um limite)
 */
async function calculateHistoryFactor(
  userId: string,
  ministryId: string
): Promise<number> {
  const totalSchedules = await prisma.schedule.count({
    where: {
      userId,
      ministryId,
      status: "CONFIRMED",
    },
  })

  // 0 participacoes = 0 pontos
  // 1-2 participacoes = 10 pontos
  // 3-5 participacoes = 15 pontos
  // 6+ participacoes = 20 pontos (maximo)
  if (totalSchedules === 0) return 0
  if (totalSchedules <= 2) return 10
  if (totalSchedules <= 5) return 15
  return WEIGHTS.history // 20
}

/**
 * Verifica conflitos de horario com outros eventos no mesmo dia
 * Sem conflitos = 15 pontos (maximo)
 * Conflito proximo (menos de 1h) = 5 pontos
 * Conflito direto (sobreposto) = 0 pontos
 */
async function calculateTimeConflictFactor(
  userId: string,
  eventDate: Date,
  eventStartTime: Date,
  eventEndTime: Date | null
): Promise<number> {
  const dateStart = new Date(eventDate)
  dateStart.setHours(0, 0, 0, 0)
  const dateEnd = new Date(eventDate)
  dateEnd.setHours(23, 59, 59, 999)

  // Buscar escalas do usuario no mesmo dia
  const sameDaySchedules = await prisma.schedule.findMany({
    where: {
      userId,
      event: {
        date: {
          gte: dateStart,
          lte: dateEnd,
        },
      },
    },
    include: {
      event: {
        select: { startTime: true, endTime: true },
      },
    },
  })

  if (sameDaySchedules.length === 0) {
    return WEIGHTS.timeConflict // 15 - sem conflitos
  }

  // Verificar cada escala existente
  const eventStartMs = eventStartTime.getTime()
  const eventEndMs = eventEndTime
    ? eventEndTime.getTime()
    : eventStartMs + 2 * 60 * 60 * 1000 // 2 horas default

  for (const schedule of sameDaySchedules) {
    const scheduleStartMs = schedule.event.startTime.getTime()
    const scheduleEndMs = schedule.event.endTime
      ? schedule.event.endTime.getTime()
      : scheduleStartMs + 2 * 60 * 60 * 1000

    // Verificar sobreposicao direta
    if (eventStartMs < scheduleEndMs && eventEndMs > scheduleStartMs) {
      return 0 // Conflito direto
    }

    // Verificar proximidade (menos de 1 hora)
    const oneHour = 60 * 60 * 1000
    const timeDiff = Math.min(
      Math.abs(eventStartMs - scheduleEndMs),
      Math.abs(scheduleStartMs - eventEndMs)
    )

    if (timeDiff < oneHour) {
      return 5 // Conflito proximo
    }
  }

  return WEIGHTS.timeConflict // 15 - sem conflitos significativos
}

/**
 * Verifica se o membro tem a posicao/skill requerida
 */
function calculatePositionMatchFactor(
  positionId: string | undefined,
  memberPositions: string[]
): number {
  // Se nao ha posicao requerida, dar pontuacao media
  if (!positionId) {
    return WEIGHTS.positionMatch / 2 // 5 pontos
  }

  // Se membro tem a posicao, dar pontuacao maxima
  if (memberPositions.includes(positionId)) {
    return WEIGHTS.positionMatch // 10 pontos
  }

  return 0
}

// ============================================
// SCORE CALCULATION
// ============================================

function calculateTotalScore(factors: SuggestionFactors): number {
  // Se indisponivel, score = 0
  if (factors.availability === 0) {
    return 0
  }

  // Somar todos os fatores (ja estao ponderados)
  const total =
    factors.availability +
    factors.frequency +
    factors.history +
    factors.timeConflict +
    factors.positionMatch

  // Normalizar para 0-100
  return Math.round(total)
}

// ============================================
// REASON GENERATION
// ============================================

function generateSuggestionReason(
  factors: SuggestionFactors,
  score: number
): string {
  const reasons: string[] = []

  // Disponibilidade
  if (factors.availability > 0) {
    reasons.push("Disponivel")
  }

  // Frequencia
  if (factors.frequency >= 20) {
    reasons.push("Pouco escalado recentemente")
  } else if (factors.frequency >= 10) {
    reasons.push("Rotacao equilibrada")
  }

  // Historico
  if (factors.history >= 15) {
    reasons.push("Experiente no ministerio")
  } else if (factors.history >= 10) {
    reasons.push("Conhece o ministerio")
  }

  // Conflito de horario
  if (factors.timeConflict === WEIGHTS.timeConflict) {
    reasons.push("Sem conflitos de horario")
  }

  // Position match
  if (factors.positionMatch === WEIGHTS.positionMatch) {
    reasons.push("Tem a funcao requerida")
  }

  // Gerar texto final baseado no score
  if (score >= 80) {
    return `Excelente opcao: ${reasons.slice(0, 2).join(", ")}`
  } else if (score >= 60) {
    return `Boa opcao: ${reasons.slice(0, 2).join(", ")}`
  } else if (score >= 40) {
    return `Opcao viavel: ${reasons[0] || "Disponivel"}`
  } else {
    return reasons[0] || "Disponivel"
  }
}

// ============================================
// MEMBER STATISTICS
// ============================================

interface MemberStats {
  totalSchedules: number
  ministrySchedules: number
  lastScheduledAt: Date | null
}

async function getMemberStats(
  userId: string,
  ministryId: string
): Promise<MemberStats> {
  // Total de escalas do usuario (todos os ministerios)
  const totalSchedules = await prisma.schedule.count({
    where: { userId },
  })

  // Escalas neste ministerio especifico
  const ministrySchedules = await prisma.schedule.count({
    where: { userId, ministryId },
  })

  // Ultima escala
  const lastSchedule = await prisma.schedule.findFirst({
    where: { userId, ministryId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })

  return {
    totalSchedules,
    ministrySchedules,
    lastScheduledAt: lastSchedule?.createdAt || null,
  }
}

// ============================================
// DISTRIBUTION STATISTICS
// ============================================

export interface DistributionStats {
  ministry: {
    id: string
    name: string
  }
  members: Array<{
    userId: string
    userName: string | null
    scheduleCount: number
    confirmedCount: number
    declinedCount: number
    pendingCount: number
    lastScheduledAt: Date | null
  }>
  totalSchedules: number
  averagePerMember: number
  mostScheduled: {
    userId: string
    userName: string | null
    count: number
  } | null
  leastScheduled: {
    userId: string
    userName: string | null
    count: number
  } | null
}

/**
 * Obtem estatisticas de distribuicao de escalas por ministerio
 */
export async function getDistributionStats(
  ministryId: string,
  days: number = 30
): Promise<DistributionStats> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Buscar ministerio
  const ministry = await prisma.ministry.findUnique({
    where: { id: ministryId },
    select: { id: true, name: true },
  })

  if (!ministry) {
    throw new Error(`Ministerio nao encontrado: ${ministryId}`)
  }

  // Buscar membros ativos
  const members = await prisma.ministryMember.findMany({
    where: { ministryId, active: true },
    include: {
      user: { select: { id: true, name: true } },
    },
  })

  // Buscar todas as escalas dos membros em uma unica query (evita N+1)
  const memberIds = members.map((m) => m.userId)
  const allSchedules = await prisma.schedule.findMany({
    where: {
      userId: { in: memberIds },
      ministryId,
      event: { date: { gte: startDate } },
    },
    select: { userId: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  // Agrupar escalas por userId
  const schedulesByUser = new Map<string, typeof allSchedules>()
  for (const s of allSchedules) {
    const list = schedulesByUser.get(s.userId) ?? []
    list.push(s)
    schedulesByUser.set(s.userId, list)
  }

  // Calcular estatisticas para cada membro
  const memberStats = members.map((member) => {
    const schedules = schedulesByUser.get(member.userId) ?? []
    return {
      userId: member.userId,
      userName: member.user.name,
      scheduleCount: schedules.length,
      confirmedCount: schedules.filter((s) => s.status === "CONFIRMED").length,
      declinedCount: schedules.filter((s) => s.status === "DECLINED").length,
      pendingCount: schedules.filter((s) => s.status === "PENDING").length,
      lastScheduledAt: schedules[0]?.createdAt || null,
    }
  })

  // Ordenar por quantidade de escalas
  memberStats.sort((a, b) => b.scheduleCount - a.scheduleCount)

  // Calcular totais
  const totalSchedules = memberStats.reduce((acc, m) => acc + m.scheduleCount, 0)
  const averagePerMember =
    memberStats.length > 0 ? totalSchedules / memberStats.length : 0

  return {
    ministry,
    members: memberStats,
    totalSchedules,
    averagePerMember: Math.round(averagePerMember * 10) / 10,
    mostScheduled:
      memberStats.length > 0
        ? {
            userId: memberStats[0].userId,
            userName: memberStats[0].userName,
            count: memberStats[0].scheduleCount,
          }
        : null,
    leastScheduled:
      memberStats.length > 0
        ? {
            userId: memberStats[memberStats.length - 1].userId,
            userName: memberStats[memberStats.length - 1].userName,
            count: memberStats[memberStats.length - 1].scheduleCount,
          }
        : null,
  }
}

export interface GlobalDistributionStats {
  totalMembers: number
  totalSchedules: number
  averagePerMember: number
  ministries: Array<{
    id: string
    name: string
    memberCount: number
    scheduleCount: number
    averagePerMember: number
  }>
  topVolunteers: Array<{
    userId: string
    userName: string | null
    totalSchedules: number
    ministryBreakdown: Array<{
      ministryId: string
      ministryName: string
      count: number
    }>
  }>
}

/**
 * Obtem estatisticas globais de distribuicao
 */
export async function getGlobalDistributionStats(
  days: number = 30
): Promise<GlobalDistributionStats> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Buscar todos os ministerios
  const ministries = await prisma.ministry.findMany({
    select: { id: true, name: true },
  })

  // Calcular stats por ministerio
  const ministryStats = await Promise.all(
    ministries.map(async (ministry) => {
      const memberCount = await prisma.ministryMember.count({
        where: { ministryId: ministry.id, active: true },
      })

      const scheduleCount = await prisma.schedule.count({
        where: {
          ministryId: ministry.id,
          event: { date: { gte: startDate } },
        },
      })

      return {
        id: ministry.id,
        name: ministry.name,
        memberCount,
        scheduleCount,
        averagePerMember:
          memberCount > 0
            ? Math.round((scheduleCount / memberCount) * 10) / 10
            : 0,
      }
    })
  )

  // Top voluntarios
  const topVolunteersRaw = await prisma.schedule.groupBy({
    by: ["userId"],
    where: { event: { date: { gte: startDate } } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  })

  const topVolunteers = await Promise.all(
    topVolunteersRaw.map(async (v) => {
      const user = await prisma.user.findUnique({
        where: { id: v.userId },
        select: { name: true },
      })

      // Breakdown por ministerio
      const breakdown = await prisma.schedule.groupBy({
        by: ["ministryId"],
        where: {
          userId: v.userId,
          event: { date: { gte: startDate } },
        },
        _count: { id: true },
      })

      const ministryBreakdown = await Promise.all(
        breakdown.map(async (b) => {
          const ministry = await prisma.ministry.findUnique({
            where: { id: b.ministryId },
            select: { name: true },
          })
          return {
            ministryId: b.ministryId,
            ministryName: ministry?.name || "Desconhecido",
            count: b._count.id,
          }
        })
      )

      return {
        userId: v.userId,
        userName: user?.name || null,
        totalSchedules: v._count.id,
        ministryBreakdown,
      }
    })
  )

  // Totais
  const totalMembers = await prisma.ministryMember.count({ where: { active: true } })
  const totalSchedules = await prisma.schedule.count({
    where: { event: { date: { gte: startDate } } },
  })

  return {
    totalMembers,
    totalSchedules,
    averagePerMember:
      totalMembers > 0 ? Math.round((totalSchedules / totalMembers) * 10) / 10 : 0,
    ministries: ministryStats,
    topVolunteers,
  }
}
