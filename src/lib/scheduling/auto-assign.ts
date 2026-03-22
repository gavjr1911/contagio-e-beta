import { prisma } from "@/lib/prisma"

// ============================================
// TYPES & INTERFACES
// ============================================

export interface AssignmentCandidate {
  memberId: string
  userId: string
  userName: string | null
  positionId: string
  positionName: string
  score: number
  factors: {
    availability: number // 0-100 (data bloqueada = 0)
    rotation: number // 0-100 (menos escalas recentes = maior)
    consecutive: number // 0 ou -20 (penalidade se escalado em evento anterior)
    positionMatch: number // 0 ou +10 (bonus se tem a posicao)
  }
}

export interface AutoAssignResult {
  assigned: Array<{
    vacancyId: string
    userId: string
    score: number
  }>
  unassigned: string[] // vacancyIds que nao puderam ser preenchidos
}

export interface VacancyPreview {
  vacancyId: string
  positionId: string
  positionName: string
  quantity: number
  filledCount: number
  candidates: AssignmentCandidate[]
}

export interface AutoAssignPreview {
  eventId: string
  ministryId: string
  vacancies: VacancyPreview[]
  totalVacancies: number
  fillableVacancies: number
}

interface CalculateScoreParams {
  userId: string
  memberId: string
  positionId: string
  eventId: string
  eventDate: Date
  ministryId: string
  hasPosition: boolean
}

// ============================================
// SCORE CALCULATION
// ============================================

/**
 * Calcula o score de um membro para uma vaga especifica
 *
 * Score Base: 50 pontos
 * - Disponibilidade: -50 se data bloqueada (score = 0)
 * - Rotacao: +0 a +30 baseado em quantas escalas teve (menos = mais pontos)
 * - Consecutivo: -20 se foi escalado no evento imediatamente anterior
 * - Position Match: +10 se membro tem a posicao definida
 */
export async function calculateCandidateScore(
  params: CalculateScoreParams
): Promise<AssignmentCandidate["factors"]> {
  const { userId, eventId, eventDate, ministryId, hasPosition } = params

  // 1. Verificar disponibilidade (datas bloqueadas)
  const availability = await calculateAvailability(userId, eventDate)

  // 2. Calcular rotacao (escalas nos ultimos 30 dias)
  const rotation = await calculateRotation(userId, ministryId, eventDate)

  // 3. Verificar se foi escalado no evento anterior
  const consecutive = await calculateConsecutivePenalty(
    userId,
    ministryId,
    eventId,
    eventDate
  )

  // 4. Bonus por position match
  const positionMatch = hasPosition ? 10 : 0

  return {
    availability,
    rotation,
    consecutive,
    positionMatch,
  }
}

/**
 * Verifica se o usuario tem alguma data bloqueada para o evento
 * Retorna 100 se disponivel, 0 se bloqueado
 */
async function calculateAvailability(
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

  return blockedDate ? 0 : 100
}

/**
 * Calcula pontuacao de rotacao baseada em escalas recentes
 * Menos escalas nos ultimos 30 dias = maior pontuacao
 *
 * 0 escalas = +30 pontos
 * 1 escala = +25 pontos
 * 2 escalas = +20 pontos
 * 3 escalas = +15 pontos
 * 4 escalas = +10 pontos
 * 5+ escalas = +0 pontos
 */
async function calculateRotation(
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
  const rotationPoints: Record<number, number> = {
    0: 30,
    1: 25,
    2: 20,
    3: 15,
    4: 10,
  }

  return rotationPoints[recentSchedulesCount] ?? 0
}

/**
 * Verifica se o usuario foi escalado no evento imediatamente anterior
 * Retorna -20 se consecutivo, 0 caso contrario
 */
async function calculateConsecutivePenalty(
  userId: string,
  ministryId: string,
  currentEventId: string,
  eventDate: Date
): Promise<number> {
  // Buscar o evento anterior mais proximo
  const previousEvent = await prisma.event.findFirst({
    where: {
      id: { not: currentEventId },
      date: { lt: eventDate },
    },
    orderBy: { date: "desc" },
    select: { id: true },
  })

  if (!previousEvent) {
    return 0
  }

  // Verificar se o usuario estava escalado nesse evento anterior
  const wasScheduledInPrevious = await prisma.schedule.findFirst({
    where: {
      userId,
      ministryId,
      eventId: previousEvent.id,
    },
  })

  return wasScheduledInPrevious ? -20 : 0
}

/**
 * Calcula o score total a partir dos fatores
 * Score base: 50, com modificadores
 */
function calculateTotalScore(factors: AssignmentCandidate["factors"]): number {
  const baseScore = 50

  // Se nao esta disponivel (data bloqueada), score = 0
  if (factors.availability === 0) {
    return 0
  }

  // Calcula score final
  // Rotation: adiciona ate +30
  // Consecutive: subtrai -20 se aplicavel
  // PositionMatch: adiciona +10 se aplicavel
  const totalScore =
    baseScore +
    (factors.rotation / 100) * 30 + // Normaliza rotation para contribuir ate +30
    factors.consecutive +
    factors.positionMatch

  // Garante que o score esta entre 0 e 100
  return Math.max(0, Math.min(100, Math.round(totalScore)))
}

// ============================================
// CANDIDATE LISTING
// ============================================

/**
 * Lista candidatos para uma vaga especifica, ordenados por score
 */
export async function getCandidatesForVacancy(
  eventId: string,
  vacancyId: string
): Promise<AssignmentCandidate[]> {
  // Buscar a vaga com suas informacoes
  const vacancy = await prisma.eventVacancy.findUnique({
    where: { id: vacancyId },
    include: {
      event: { select: { date: true } },
      position: { select: { id: true, name: true } },
      ministry: { select: { id: true } },
    },
  })

  if (!vacancy) {
    throw new Error(`Vacancy not found: ${vacancyId}`)
  }

  // Buscar membros ativos do ministerio
  const members = await prisma.ministryMember.findMany({
    where: {
      ministryId: vacancy.ministry.id,
      active: true,
    },
    include: {
      user: { select: { id: true, name: true } },
      positions: {
        include: {
          position: { select: { id: true, name: true } },
        },
      },
    },
  })

  // Calcular score para cada membro
  const candidates: AssignmentCandidate[] = []

  for (const member of members) {
    // Verificar se o membro tem a posicao requerida
    const hasPosition = member.positions.some(
      (mp) => mp.position.id === vacancy.positionId
    )

    // Calcular fatores de score
    const factors = await calculateCandidateScore({
      userId: member.userId,
      memberId: member.id,
      positionId: vacancy.positionId,
      eventId,
      eventDate: vacancy.event.date,
      ministryId: vacancy.ministryId,
      hasPosition,
    })

    const score = calculateTotalScore(factors)

    candidates.push({
      memberId: member.id,
      userId: member.userId,
      userName: member.user.name,
      positionId: vacancy.positionId,
      positionName: vacancy.position.name,
      score,
      factors,
    })
  }

  // Ordenar por score descendente
  candidates.sort((a, b) => b.score - a.score)

  return candidates
}

// ============================================
// PREVIEW AUTO-ASSIGN
// ============================================

/**
 * Preview das atribuicoes sugeridas sem criar escalas
 */
export async function previewAutoAssign(
  eventId: string,
  ministryId: string
): Promise<AutoAssignPreview> {
  // Buscar todas as vagas do ministerio para o evento
  const vacancies = await prisma.eventVacancy.findMany({
    where: {
      eventId,
      ministryId,
    },
    include: {
      position: { select: { id: true, name: true } },
      schedules: { select: { userId: true } },
    },
  })

  const vacancyPreviews: VacancyPreview[] = []
  let totalVacancies = 0
  let fillableVacancies = 0

  for (const vacancy of vacancies) {
    // Quantidade ja preenchida
    const filledCount = vacancy.schedules.length

    // Quantidade restante necessaria
    const remainingCount = Math.max(0, vacancy.quantity - filledCount)
    totalVacancies += remainingCount

    // Buscar candidatos para esta vaga
    const candidates = await getCandidatesForVacancy(eventId, vacancy.id)

    // Filtrar candidatos ja escalados nesta vaga
    const alreadyScheduledUserIds = new Set(
      vacancy.schedules.map((s) => s.userId)
    )
    const availableCandidates = candidates.filter(
      (c) => !alreadyScheduledUserIds.has(c.userId) && c.score > 0
    )

    // Contar quantas vagas podem ser preenchidas
    const canFill = Math.min(remainingCount, availableCandidates.length)
    fillableVacancies += canFill

    vacancyPreviews.push({
      vacancyId: vacancy.id,
      positionId: vacancy.positionId,
      positionName: vacancy.position.name,
      quantity: vacancy.quantity,
      filledCount,
      candidates: availableCandidates,
    })
  }

  return {
    eventId,
    ministryId,
    vacancies: vacancyPreviews,
    totalVacancies,
    fillableVacancies,
  }
}

// ============================================
// EXECUTE AUTO-ASSIGN
// ============================================

/**
 * Executa a distribuicao automatica de escalas
 * - Preenche vagas com melhores candidatos
 * - Evita escalar mesma pessoa em multiplas vagas
 * - Cria registros em Schedule e AssignmentLog
 */
export async function executeAutoAssign(
  eventId: string,
  ministryId: string
): Promise<AutoAssignResult> {
  const result: AutoAssignResult = {
    assigned: [],
    unassigned: [],
  }

  // Conjunto de usuarios ja atribuidos neste evento/ministerio
  const assignedUserIds = new Set<string>()

  // Buscar usuarios ja escalados para este evento/ministerio
  const existingSchedules = await prisma.schedule.findMany({
    where: { eventId, ministryId },
    select: { userId: true },
  })
  existingSchedules.forEach((s) => assignedUserIds.add(s.userId))

  // Obter preview das vagas
  const preview = await previewAutoAssign(eventId, ministryId)

  // Ordenar vagas por menor quantidade de candidatos disponiveis (mais dificeis primeiro)
  const sortedVacancies = [...preview.vacancies].sort(
    (a, b) => a.candidates.length - b.candidates.length
  )

  // Processar cada vaga
  for (const vacancy of sortedVacancies) {
    const remainingSlots = vacancy.quantity - vacancy.filledCount

    if (remainingSlots <= 0) {
      continue
    }

    let filledThisVacancy = 0

    // Tentar preencher cada slot da vaga
    for (let i = 0; i < remainingSlots; i++) {
      // Encontrar melhor candidato disponivel (nao ja atribuido)
      const bestCandidate = vacancy.candidates.find(
        (c) => !assignedUserIds.has(c.userId) && c.score > 0
      )

      if (!bestCandidate) {
        // Nao ha mais candidatos disponiveis para esta vaga
        break
      }

      // Criar a escala usando transacao
      try {
        await prisma.$transaction(async (tx) => {
          // Criar Schedule
          await tx.schedule.create({
            data: {
              eventId,
              ministryId,
              userId: bestCandidate.userId,
              vacancyId: vacancy.vacancyId,
              status: "PENDING",
            },
          })

          // Criar AssignmentLog
          await tx.assignmentLog.create({
            data: {
              eventId,
              ministryId,
              userId: bestCandidate.userId,
              vacancyId: vacancy.vacancyId,
              score: bestCandidate.score,
              scoreDetails: bestCandidate.factors as object,
              reason: "auto",
            },
          })
        })

        // Marcar usuario como atribuido
        assignedUserIds.add(bestCandidate.userId)
        filledThisVacancy++

        result.assigned.push({
          vacancyId: vacancy.vacancyId,
          userId: bestCandidate.userId,
          score: bestCandidate.score,
        })
      } catch (error) {
        // Pode ocorrer conflito de unique constraint se ja existir
        // Nesse caso, continuar para o proximo candidato
        console.error(
          `Failed to assign ${bestCandidate.userId} to ${vacancy.vacancyId}:`,
          error
        )
      }
    }

    // Se nao conseguiu preencher todas as vagas
    if (filledThisVacancy < remainingSlots) {
      // Adicionar vacancyId para cada slot nao preenchido
      for (let i = 0; i < remainingSlots - filledThisVacancy; i++) {
        result.unassigned.push(vacancy.vacancyId)
      }
    }
  }

  return result
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Remove atribuicoes automaticas de um evento/ministerio
 * Util para refazer a distribuicao
 */
export async function clearAutoAssignments(
  eventId: string,
  ministryId: string
): Promise<number> {
  // Buscar logs de atribuicao automatica
  const autoAssignedLogs = await prisma.assignmentLog.findMany({
    where: {
      eventId,
      ministryId,
      reason: "auto",
    },
    select: { userId: true },
  })

  const userIds = autoAssignedLogs.map((l) => l.userId)

  if (userIds.length === 0) {
    return 0
  }

  // Remover schedules correspondentes
  const { count } = await prisma.schedule.deleteMany({
    where: {
      eventId,
      ministryId,
      userId: { in: userIds },
    },
  })

  // Remover logs
  await prisma.assignmentLog.deleteMany({
    where: {
      eventId,
      ministryId,
      reason: "auto",
    },
  })

  return count
}

/**
 * Obtem estatisticas de escalas de um membro
 */
export async function getMemberScheduleStats(
  userId: string,
  ministryId: string,
  days: number = 30
): Promise<{
  totalSchedules: number
  confirmedSchedules: number
  declinedSchedules: number
  pendingSchedules: number
}> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const schedules = await prisma.schedule.findMany({
    where: {
      userId,
      ministryId,
      event: {
        date: { gte: startDate },
      },
    },
    select: { status: true },
  })

  return {
    totalSchedules: schedules.length,
    confirmedSchedules: schedules.filter((s) => s.status === "CONFIRMED").length,
    declinedSchedules: schedules.filter((s) => s.status === "DECLINED").length,
    pendingSchedules: schedules.filter((s) => s.status === "PENDING").length,
  }
}
