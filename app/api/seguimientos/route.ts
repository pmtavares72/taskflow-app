import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

const CreateSchema = z.object({
  titulo: z.string().min(1).max(300),
  descripcion: z.string().optional(),
  contexto: z.enum(['TRABAJO', 'PERSONAL', 'AMBOS']).optional().default('TRABAJO'),
  prioridad: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  proyectoId: z.string().optional(),
  itemIds: z.array(z.string()).optional().default([]),
})

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const estado = searchParams.get('estado')
  const proyectoId = searchParams.get('proyectoId')

  const where: Record<string, unknown> = { userId: auth.userId }
  if (estado) where.estado = estado
  if (proyectoId) where.proyectoId = proyectoId

  const seguimientos = await db.seguimiento.findMany({
    where,
    include: {
      proyecto: { select: { id: true, nombre: true, color: true } },
      items: {
        include: { item: { select: { id: true, titulo: true, estado: true, prioridad: true, tipo: true } } },
      },
      entradas: { select: { id: true, tipo: true, titulo: true, resumen: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 3 },
      recordatorios: { where: { activo: true }, select: { id: true, mensaje: true, proximoDisparo: true, activo: true, tipoRecurrencia: true } },
      _count: { select: { items: true, entradas: true } },
    },
    orderBy: { ultimaActividad: 'desc' },
  })

  return NextResponse.json(seguimientos)
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { itemIds, ...data } = parsed.data

  const seguimiento = await db.seguimiento.create({
    data: {
      ...data,
      userId: auth.userId,
      ...(itemIds.length > 0 ? {
        items: { create: itemIds.map(itemId => ({ itemId })) },
      } : {}),
    },
    include: {
      proyecto: { select: { id: true, nombre: true, color: true } },
      items: { include: { item: { select: { id: true, titulo: true, estado: true, prioridad: true, tipo: true } } } },
      _count: { select: { items: true, entradas: true } },
    },
  })

  return NextResponse.json(seguimiento, { status: 201 })
}
