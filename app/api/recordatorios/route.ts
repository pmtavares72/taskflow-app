import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { parseReminderFromNaturalLanguage } from '@/lib/agent'

const CreateSchema = z.object({
  mensaje: z.string().min(1).max(500),
  seguimientoId: z.string().optional(),
  itemId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const recordatorios = await db.recordatorio.findMany({
    where: { userId: auth.userId, activo: true },
    include: {
      seguimiento: { select: { id: true, titulo: true } },
      item: { select: { id: true, titulo: true } },
    },
    orderBy: { proximoDisparo: 'asc' },
  })

  return NextResponse.json(recordatorios)
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Parse natural language with LLM
  const reminderData = await parseReminderFromNaturalLanguage(parsed.data.mensaje)

  const recordatorio = await db.recordatorio.create({
    data: {
      mensaje: reminderData.mensaje,
      regla: reminderData.regla,
      proximoDisparo: new Date(reminderData.proximoDisparo),
      tipoRecurrencia: reminderData.tipoRecurrencia,
      seguimientoId: parsed.data.seguimientoId ?? null,
      itemId: parsed.data.itemId ?? null,
      userId: auth.userId,
    },
  })

  return NextResponse.json(recordatorio, { status: 201 })
}
