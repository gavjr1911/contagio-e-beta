import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { bandUpdateSchema } from "@/lib/validations/music"

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id } = await params

    const band = await prisma.band.findUnique({
      where: { id },
      include: {
        members: {
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
        },
        _count: {
          select: { members: true },
        },
      },
    })

    if (!band) {
      return NextResponse.json({ error: "Banda nao encontrada" }, { status: 404 })
    }

    return NextResponse.json(band)
  } catch (error) {
    console.error("Erro ao buscar banda:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validationResult = bandUpdateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const existingBand = await prisma.band.findUnique({ where: { id } })
    if (!existingBand) {
      return NextResponse.json({ error: "Banda nao encontrada" }, { status: 404 })
    }

    const band = await prisma.band.update({
      where: { id },
      data: validationResult.data,
      include: {
        members: {
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
        },
      },
    })

    return NextResponse.json(band)
  } catch (error) {
    console.error("Erro ao atualizar banda:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id } = await params

    const existingBand = await prisma.band.findUnique({ where: { id } })
    if (!existingBand) {
      return NextResponse.json({ error: "Banda nao encontrada" }, { status: 404 })
    }

    // Desativar a banda ao inves de remover
    const band = await prisma.band.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ message: "Banda desativada com sucesso", band })
  } catch (error) {
    console.error("Erro ao desativar banda:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
