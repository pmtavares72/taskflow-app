import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const contacto = await db.contacto.findFirst({ where: { id, userId: auth.userId } })
  if (!contacto) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const allowedFields = ['nombre', 'email', 'telefono', 'empresa', 'cargo']
  const data: Record<string, string> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) data[field] = body[field]
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const updated = await db.contacto.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const contacto = await db.contacto.findFirst({ where: { id, userId: auth.userId } })
  if (!contacto) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.contacto.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
