import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

const UpdateItemSchema = z.object({
  titulo: z.string().min(1).max(500).optional(),
  tipo: z.enum(['TASK', 'NOTE', 'LINK', 'FILE', 'EMAIL', 'IDEA']).optional(),
  contenido: z.string().optional(),
  estado: z.enum(['INBOX', 'TODO', 'IN_PROGRESS', 'WAITING', 'DONE', 'ARCHIVED']).optional(),
  prioridad: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  eisenhowerUrgente: z.boolean().optional(),
  eisenhowerImportante: z.boolean().optional(),
  contexto: z.enum(['TRABAJO', 'PERSONAL', 'AMBOS']).optional(),
  etiquetas: z.array(z.string()).optional(),
  fechaLimite: z.string().datetime().nullable().optional(),
  fechaRecordatorio: z.string().datetime().nullable().optional(),
  proyectoId: z.string().nullable().optional(),
  notasAgente: z.string().optional(),
  modificadoPor: z.string().optional(),
})

async function getItem(id: string, userId: string) {
  return db.item.findFirst({ where: { id, userId } })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const item = await db.item.findFirst({
    where: { id, userId: authResult.userId },
    include: {
      proyecto: { select: { id: true, nombre: true, color: true } },
      adjuntos: true,
      actividad: { orderBy: { createdAt: 'desc' } },
      relaciones: { include: { destino: { select: { id: true, titulo: true, estado: true, tipo: true } } } },
      relacionesDe: { include: { origen: { select: { id: true, titulo: true, estado: true, tipo: true } } } },
    },
  })

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await getItem(id, authResult.userId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = UpdateItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { fechaLimite, fechaRecordatorio, ...rest } = parsed.data

  const updated = await db.item.update({
    where: { id },
    data: {
      ...rest,
      ...(fechaLimite !== undefined ? { fechaLimite: fechaLimite ? new Date(fechaLimite) : null } : {}),
      ...(fechaRecordatorio !== undefined ? { fechaRecordatorio: fechaRecordatorio ? new Date(fechaRecordatorio) : null } : {}),
    },
    include: {
      proyecto: { select: { id: true, nombre: true, color: true } },
    },
  })

  // Registrar actividad si cambió el estado
  if (rest.estado && rest.estado !== existing.estado) {
    const autor = authResult.type === 'api_key' ? 'agente' : 'usuario'
    await db.actividad.create({
      data: {
        descripcion: `Estado cambiado de ${existing.estado} a ${rest.estado}`,
        autor,
        itemId: id,
      },
    })
  }

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await getItem(id, authResult.userId)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.item.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
