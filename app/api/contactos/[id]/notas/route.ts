import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

const CreateNotaSchema = z.object({
  contenido: z.string().min(1).max(2000),
})

const UpdateNotaSchema = z.object({
  contenido: z.string().min(1).max(2000),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: contactoId } = await params

  // Verificar que el contacto pertenece al usuario
  const contacto = await db.contacto.findFirst({
    where: { id: contactoId, userId: auth.userId },
  })
  if (!contacto) return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = CreateNotaSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const nota = await db.notaContacto.create({
    data: {
      contenido: parsed.data.contenido,
      autor: 'usuario',
      contactoId,
    },
  })

  return NextResponse.json(nota, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: contactoId } = await params

  const body = await req.json().catch(() => null)
  const notaId = body?.notaId
  if (!notaId) return NextResponse.json({ error: 'notaId requerido' }, { status: 400 })

  const parsed = UpdateNotaSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Verificar ownership
  const nota = await db.notaContacto.findFirst({
    where: { id: notaId, contactoId },
    include: { contacto: { select: { userId: true } } },
  })
  if (!nota || nota.contacto.userId !== auth.userId) {
    return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
  }

  const updated = await db.notaContacto.update({
    where: { id: notaId },
    data: { contenido: parsed.data.contenido },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: contactoId } = await params
  const notaId = req.nextUrl.searchParams.get('notaId')
  if (!notaId) return NextResponse.json({ error: 'notaId requerido' }, { status: 400 })

  // Verificar ownership
  const nota = await db.notaContacto.findFirst({
    where: { id: notaId, contactoId },
    include: { contacto: { select: { userId: true } } },
  })
  if (!nota || nota.contacto.userId !== auth.userId) {
    return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
  }

  await db.notaContacto.delete({ where: { id: notaId } })

  return NextResponse.json({ ok: true })
}
