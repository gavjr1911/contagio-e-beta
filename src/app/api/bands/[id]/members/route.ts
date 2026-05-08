import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { bandMemberCreateSchema } from "@/lib/validations/music"
import { z } from "zod"

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: bandId } = await params

    const band = await prisma.band.findUnique({ where: { id: bandId } })
    if (!band) {
      return Response.json({ error: "Banda nao encontrada" }, { status: 404 })
    }

    const members = await prisma.bandMember.findMany({
      where: { bandId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return Response.json({ data: members })
  } catch (error) {
    console.error("Erro ao listar membros:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: bandId } = await params
    const body = await request.json()
    const validationResult = bandMemberCreateSchema.safeParse(body)

    if (!validationResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { userId, instrument } = validationResult.data

    // Verificar se a banda existe
    const band = await prisma.band.findUnique({ where: { id: bandId } })
    if (!band) {
      return Response.json({ error: "Banda nao encontrada" }, { status: 404 })
    }

    // Verificar se o usuario existe
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return Response.json({ error: "Usuario nao encontrado" }, { status: 404 })
    }

    // Verificar se o usuario ja e membro da banda
    const existingMember = await prisma.bandMember.findUnique({
      where: { bandId_userId: { bandId, userId } },
    })
    if (existingMember) {
      return Response.json(
        { error: "Usuario ja e membro desta banda" },
        { status: 400 }
      )
    }

    const member = await prisma.bandMember.create({
      data: {
        bandId,
        userId,
        instrument,
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
      },
    })

    return Response.json({ data: member }, { status: 201 })
  } catch (error) {
    console.error("Erro ao adicionar membro:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

const deleteMemberSchema = z.object({
  userId: z.string().min(1, "ID do usuario e obrigatorio"),
})

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id: bandId } = await params
    const body = await request.json()
    const validationResult = deleteMemberSchema.safeParse(body)

    if (!validationResult.success) {
      return Response.json(
        { error: "Dados invalidos", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { userId } = validationResult.data

    // Verificar se o membro existe
    const member = await prisma.bandMember.findUnique({
      where: { bandId_userId: { bandId, userId } },
    })
    if (!member) {
      return Response.json({ error: "Membro nao encontrado" }, { status: 404 })
    }

    await prisma.bandMember.delete({
      where: { bandId_userId: { bandId, userId } },
    })

    return Response.json({ message: "Membro removido com sucesso" })
  } catch (error) {
    console.error("Erro ao remover membro:", error)
    return Response.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
