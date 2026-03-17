import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

const UpdateEventoSchema = z.object({
  titulo: z.string().min(1).max(500).optional(),
  descripcion: z.string().optional(),
  fecha: z.string().datetime().optional(),
  fechaFin: z.string().datetime().nullable().optional(),
  todoElDia: z.boolean().optional(),
  contexto: z.enum(['TRABAJO', 'PERSONAL', 'AMBOS']).optional(),
  seguimientoId: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await db.evento.findFirst({ where: { id, userId: authResult.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = UpdateEventoSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { fecha, fechaFin, ...rest } = parsed.data

  const updated = await db.evento.update({
    where: { id },
    data: {
      ...rest,
      ...(fecha ? { fecha: new Date(fecha) } : {}),
      ...(fechaFin !== undefined ? { fechaFin: fechaFin ? new Date(fechaFin) : null } : {}),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await db.evento.findFirst({ where: { id, userId: authResult.userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.evento.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
