import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ items: [], projects: [] })

  const [items, projects] = await Promise.all([
    db.item.findMany({
      where: {
        userId: authResult.userId,
        estado: { not: 'ARCHIVED' },
        OR: [
          { titulo: { contains: q, mode: 'insensitive' } },
          { contenido: { contains: q, mode: 'insensitive' } },
          { etiquetas: { hasSome: [q] } },
        ],
      },
      select: {
        id: true, titulo: true, tipo: true, estado: true, prioridad: true,
        proyecto: { select: { id: true, nombre: true, color: true } },
      },
      take: 10,
      orderBy: [{ prioridad: 'desc' }, { updatedAt: 'desc' }],
    }),
    db.project.findMany({
      where: {
        userId: authResult.userId,
        nombre: { contains: q, mode: 'insensitive' },
      },
      select: { id: true, nombre: true, color: true, estado: true },
      take: 5,
    }),
  ])

  return NextResponse.json({ items, projects })
}
