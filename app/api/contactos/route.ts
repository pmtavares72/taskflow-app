import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim()
  const orderBy = url.searchParams.get('order') ?? 'nombre' // nombre | empresa | confianza | updatedAt
  const dir = url.searchParams.get('dir') === 'desc' ? 'desc' as const : 'asc' as const

  const where: Record<string, unknown> = { userId: auth.userId }

  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { empresa: { contains: q, mode: 'insensitive' } },
      { cargo: { contains: q, mode: 'insensitive' } },
    ]
  }

  const validOrderFields = ['nombre', 'empresa', 'confianza', 'updatedAt', 'createdAt']
  const orderField = validOrderFields.includes(orderBy) ? orderBy : 'nombre'

  const contactos = await db.contacto.findMany({
    where,
    orderBy: { [orderField]: dir },
    include: {
      seguimientos: {
        include: {
          seguimiento: { select: { id: true, titulo: true, estado: true } },
        },
      },
    },
  })

  return NextResponse.json(contactos)
}
