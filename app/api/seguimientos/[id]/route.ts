import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

const UpdateSchema = z.object({
  titulo: z.string().min(1).max(300).optional(),
  descripcion: z.string().optional(),
  estado: z.enum(['ACTIVO', 'EN_ESPERA', 'NECESITA_ATENCION', 'COMPLETADO', 'ARCHIVADO']).optional(),
  contexto: z.enum(['TRABAJO', 'PERSONAL', 'AMBOS']).optional(),
  prioridad: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  proyectoId: z.string().nullable().optional(),
  proximaRevision: z.string().datetime().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const seguimiento = await db.seguimiento.findFirst({
    where: { id, userId: auth.userId },
    include: {
      proyecto: { select: { id: true, nombre: true, color: true } },
      items: {
        include: { item: { select: { id: true, titulo: true, estado: true, prioridad: true, tipo: true, fechaLimite: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
      },
      entradas: { orderBy: { createdAt: 'desc' } },
      recordatorios: { orderBy: { proximoDisparo: 'asc' } },
      feedEntries: { orderBy: { createdAt: 'desc' }, take: 10 },
      contactos: {
        include: {
          contacto: { select: { id: true, nombre: true, email: true, telefono: true, empresa: true, cargo: true, confianza: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { items: true, entradas: true } },
    },
  })

  if (!seguimiento) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(seguimiento)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await db.seguimiento.findFirst({ where: { id, userId: auth.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { proximaRevision, ...rest } = parsed.data
  const seguimiento = await db.seguimiento.update({
    where: { id },
    data: {
      ...rest,
      ultimaActividad: new Date(),
      ...(proximaRevision ? { proximaRevision: new Date(proximaRevision) } : {}),
    },
  })

  return NextResponse.json(seguimiento)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await db.seguimiento.findFirst({ where: { id, userId: auth.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.seguimiento.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
