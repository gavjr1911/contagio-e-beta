import { NextRequest } from "next/server"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { apiSuccess, apiError, validateBody, withRole } from "@/lib/api-utils"
import { inviteUserSchema } from "@/lib/validations/user"
import { sendUserInvite } from "@/lib/email/send"

export async function POST(request: NextRequest) {
  return withRole(["ADMIN", "LEADER"], async () => {
    // Validar body
    const validation = await validateBody(request, inviteUserSchema)
    if (!validation.success) {
      return validation.response
    }

    const { name, email, cpf, phone, birthDate, ministryId, positionIds } = validation.data

    try {
      // Verificar se email ja existe
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      })
      if (existingEmail) {
        return apiError("Este email ja esta cadastrado no sistema", 409)
      }

      // Verificar se CPF ja existe
      const existingCPF = await prisma.user.findUnique({
        where: { cpf },
      })
      if (existingCPF) {
        return apiError("Este CPF ja esta cadastrado no sistema", 409)
      }

      // Verificar se ministerio existe
      const ministry = await prisma.ministry.findUnique({
        where: { id: ministryId },
      })
      if (!ministry) {
        return apiError("Ministerio nao encontrado", 404)
      }

      // Gerar token de convite
      const inviteToken = randomUUID()
      const inviteExpires = new Date()
      inviteExpires.setDate(inviteExpires.getDate() + 7) // 7 dias

      // Criar usuario e membro em transacao
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Criar usuario
        const user = await tx.user.create({
          data: {
            name,
            email,
            cpf,
            phone,
            birthDate,
            role: "VOLUNTEER",
            inviteToken,
            inviteExpires,
          },
        })

        // Adicionar como membro do ministerio
        const member = await tx.ministryMember.create({
          data: {
            userId: user.id,
            ministryId,
            positions: positionIds && positionIds.length > 0
              ? {
                  create: positionIds.map((positionId: string) => ({
                    positionId,
                  })),
                }
              : undefined,
          },
          include: {
            user: true,
            positions: {
              include: {
                position: true,
              },
            },
          },
        })

        return { user, member }
      })

      // Buscar nomes das posicoes para o email
      let positionNames: string | undefined
      if (positionIds && positionIds.length > 0) {
        const positions = await prisma.ministryPosition.findMany({
          where: { id: { in: positionIds } },
          select: { name: true },
        })
        positionNames = positions.map(p => p.name).join(", ")
      }

      // Enviar email de convite
      try {
        await sendUserInvite(
          {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            inviteToken: result.user.inviteToken!,
            inviteExpires: result.user.inviteExpires!,
          },
          {
            id: ministry.id,
            name: ministry.name,
          },
          positionNames
        )
      } catch (emailError) {
        console.error("[Invite] Erro ao enviar email:", emailError)
        // Nao falha a operacao se o email nao for enviado
      }

      return apiSuccess(
        {
          user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            cpf: result.user.cpf,
            phone: result.user.phone,
            birthDate: result.user.birthDate,
          },
          member: result.member,
        },
        201
      )
    } catch (error) {
      console.error("[Invite] Erro ao criar usuario:", error)
      return apiError("Erro ao criar usuario", 500)
    }
  })
}
