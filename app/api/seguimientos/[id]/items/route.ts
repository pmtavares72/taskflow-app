import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

const LinkSchema = z.object({ itemId: z.string() })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const seguimiento = await db.seguimiento.findFirst({ where: { id, userId: auth.userId } })
  if (!seguimiento) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = LinkSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const link = await db.seguimientoItem.create({
    data: { seguimientoId: id, itemId: parsed.data.itemId },
  })

  await db.seguimiento.update({ where: { id }, data: { ultimaActividad: new Date() } })

  return NextResponse.json(link, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const { searchParams } = req.nextUrl
  const itemId = searchParams.get('itemId')
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

  await db.seguimientoItem.deleteMany({ where: { seguimientoId: id, itemId } })
  return NextResponse.json({ ok: true })
}
