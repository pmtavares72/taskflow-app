import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { onItemCreated } from '@/lib/agent-events'

const CreateItemSchema = z.object({
  titulo: z.string().min(1).max(500),
  tipo: z.enum(['TASK', 'NOTE', 'LINK', 'FILE', 'EMAIL', 'IDEA']).optional().default('IDEA'),
  contenido: z.string().optional(),
  estado: z.enum(['INBOX', 'TODO', 'IN_PROGRESS', 'WAITING', 'DONE', 'ARCHIVED']).optional().default('INBOX'),
  prioridad: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('NONE'),
  eisenhowerUrgente: z.boolean().optional().default(false),
  eisenhowerImportante: z.boolean().optional().default(false),
  contexto: z.enum(['TRABAJO', 'PERSONAL', 'AMBOS']).optional().default('TRABAJO'),
  etiquetas: z.array(z.string()).optional().default([]),
  fechaLimite: z.string().datetime().optional(),
  fechaRecordatorio: z.string().datetime().optional(),
  proyectoId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const estado = searchParams.get('estado')
  const proyectoId = searchParams.get('proyectoId')
  const contexto = searchParams.get('contexto')
  const vencidos = searchParams.get('vencidos') === 'true'
  const estancados = searchParams.get('estancados') === 'true'
  const q = searchParams.get('q')

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const where: Record<string, unknown> = { userId: authResult.userId }

  if (estado) where.estado = estado
  if (proyectoId) where.proyectoId = proyectoId
  if (contexto) where.contexto = contexto
  if (vencidos) where.fechaLimite = { lt: now }
  if (estancados) where.updatedAt = { lt: sevenDaysAgo }
  if (q) {
    where.OR = [
      { titulo: { contains: q, mode: 'insensitive' } },
      { contenido: { contains: q, mode: 'insensitive' } },
    ]
  }

  const items = await db.item.findMany({
    where,
    include: {
      proyecto: { select: { id: true, nombre: true, color: true } },
      adjuntos: { select: { id: true, nombre: true, url: true, tipo: true, tamanio: true } },
      actividad: { select: { id: true, descripcion: true, autor: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 5 },
    },
    orderBy: { createdAt: 'desc' },
  })

  const PRIO_ORDER: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 }
  items.sort((a, b) => (PRIO_ORDER[b.prioridad] ?? 0) - (PRIO_ORDER[a.prioridad] ?? 0))

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = CreateItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { fechaLimite, fechaRecordatorio, ...rest } = parsed.data

  const item = await db.item.create({
    data: {
      ...rest,
      userId: authResult.userId,
      ...(fechaLimite ? { fechaLimite: new Date(fechaLimite) } : {}),
      ...(fechaRecordatorio ? { fechaRecordatorio: new Date(fechaRecordatorio) } : {}),
    },
    include: {
      proyecto: { select: { id: true, nombre: true, color: true } },
    },
  })

  // Disparar agente en background (no bloquear respuesta)
  onItemCreated(item.id).catch(console.error)

  return NextResponse.json(item, { status: 201 })
}
