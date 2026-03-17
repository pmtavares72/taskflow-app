import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

const CreateEventoSchema = z.object({
  titulo: z.string().min(1).max(500),
  descripcion: z.string().optional(),
  fecha: z.string().datetime(),
  fechaFin: z.string().datetime().optional(),
  todoElDia: z.boolean().optional(),
  contexto: z.enum(['TRABAJO', 'PERSONAL', 'AMBOS']).optional(),
  seguimientoId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: Record<string, unknown> = { userId: authResult.userId }
  if (from || to) {
    where.fecha = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }

  const eventos = await db.evento.findMany({
    where,
    include: {
      seguimiento: { select: { id: true, titulo: true } },
    },
    orderBy: { fecha: 'asc' },
  })

  // Also fetch items with fechaLimite and recordatorios in range
  const itemsWhere: Record<string, unknown> = {
    userId: authResult.userId,
    fechaLimite: { not: null },
    estado: { notIn: ['ARCHIVED', 'DONE'] },
  }
  if (from || to) {
    itemsWhere.fechaLimite = {
      not: null,
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }

  const items = await db.item.findMany({
    where: itemsWhere,
    select: { id: true, titulo: true, fechaLimite: true, estado: true, prioridad: true, contexto: true },
    orderBy: { fechaLimite: 'asc' },
  })

  const recordatorios = await db.recordatorio.findMany({
    where: {
      userId: authResult.userId,
      activo: true,
      ...(from || to ? {
        proximoDisparo: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
    },
    select: { id: true, mensaje: true, proximoDisparo: true, seguimientoId: true },
    orderBy: { proximoDisparo: 'asc' },
  })

  return NextResponse.json({ eventos, items, recordatorios })
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = CreateEventoSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const evento = await db.evento.create({
    data: {
      titulo: parsed.data.titulo,
      descripcion: parsed.data.descripcion,
      fecha: new Date(parsed.data.fecha),
      fechaFin: parsed.data.fechaFin ? new Date(parsed.data.fechaFin) : null,
      todoElDia: parsed.data.todoElDia ?? false,
      contexto: parsed.data.contexto ?? 'TRABAJO',
      seguimientoId: parsed.data.seguimientoId,
      userId: authResult.userId,
    },
  })

  return NextResponse.json(evento, { status: 201 })
}
