import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// Rate limiting in-memory
const rateMap = new Map<string, { count: number; resetAt: number }>()

const WebhookSchema = z.object({
  tipo: z.enum(['sugerencia', 'accion', 'digest', 'completado']),
  titulo: z.string().min(1).max(200),
  descripcion: z.string().max(2000),
  payload: z.record(z.string(), z.unknown()),
  prioridad: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  itemId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  // IP allowlist — solo localhost en producción
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1'
  if (process.env.NODE_ENV === 'production' && !['127.0.0.1', '::1'].includes(ip)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Auth
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.TASKFLOW_AGENT_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting — 100 req/min por IP
  const now = Date.now()
  const rl = rateMap.get(ip) ?? { count: 0, resetAt: now + 60_000 }
  if (now > rl.resetAt) { rl.count = 0; rl.resetAt = now + 60_000 }
  if (++rl.count > 100) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  rateMap.set(ip, rl)

  // Validate
  const body = await req.json().catch(() => null)
  const parsed = WebhookSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const feed = await db.agenteFeed.create({
    data: {
      ...parsed.data,
      payload: parsed.data.payload as object,
      estado: 'pendiente',
    },
  })

  return NextResponse.json({ id: feed.id }, { status: 201 })
}
