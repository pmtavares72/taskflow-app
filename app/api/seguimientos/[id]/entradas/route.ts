import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { onEntradaCreated } from '@/lib/agent-events'

const CreateEntradaSchema = z.object({
  tipo: z.enum(['EMAIL', 'NOTAS_REUNION', 'CONVERSACION', 'DOCUMENTO', 'NOTA_LIBRE']),
  titulo: z.string().min(1).max(300),
  contenido: z.string().min(1),
  itemId: z.string().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const entradas = await db.entradaContexto.findMany({
    where: { seguimientoId: id, userId: auth.userId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(entradas)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const seguimiento = await db.seguimiento.findFirst({ where: { id, userId: auth.userId } })
  if (!seguimiento) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = CreateEntradaSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const entrada = await db.entradaContexto.create({
    data: {
      ...parsed.data,
      seguimientoId: id,
      userId: auth.userId,
    },
  })

  await db.seguimiento.update({ where: { id }, data: { ultimaActividad: new Date() } })

  // Trigger Nexus context processing in background
  onEntradaCreated(entrada.id).catch(console.error)

  return NextResponse.json(entrada, { status: 201 })
}
