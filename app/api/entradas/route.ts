import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { onEntradaCreated } from '@/lib/agent-events'

const CreateEntradaSchema = z.object({
  tipo: z.enum(['EMAIL', 'NOTAS_REUNION', 'CONVERSACION', 'DOCUMENTO', 'NOTA_LIBRE']),
  titulo: z.string().min(1).max(300),
  contenido: z.string().min(1),
  seguimientoId: z.string().optional(),
  itemId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo')

  const where: Record<string, unknown> = { userId: auth.userId }
  if (tipo) where.tipo = tipo

  const entradas = await db.entradaContexto.findMany({
    where,
    include: {
      seguimiento: { select: { id: true, titulo: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(entradas)
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = CreateEntradaSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const entrada = await db.entradaContexto.create({
    data: { ...parsed.data, userId: auth.userId },
  })

  if (parsed.data.seguimientoId) {
    await db.seguimiento.update({
      where: { id: parsed.data.seguimientoId },
      data: { ultimaActividad: new Date() },
    })
  }

  onEntradaCreated(entrada.id).catch(console.error)

  return NextResponse.json(entrada, { status: 201 })
}
