import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { searchMemory } from '@/lib/memory'

// GET /api/memoria?q=search&categoria=PERSONA
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const categoria = searchParams.get('categoria')

  if (q) {
    const results = await searchMemory(auth.userId, q)
    return NextResponse.json(results)
  }

  const where: Record<string, unknown> = { userId: auth.userId, activo: true }
  if (categoria) where.categoria = categoria

  const memorias = await db.memoriaProfesional.findMany({
    where,
    orderBy: [{ categoria: 'asc' }, { confianza: 'desc' }],
    select: {
      id: true, categoria: true, clave: true, contenido: true,
      confianza: true, ultimaVez: true, fuentes: true, createdAt: true,
    },
  })

  // Group by category
  const grouped: Record<string, typeof memorias> = {}
  for (const m of memorias) {
    const cat = m.categoria
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(m)
  }

  return NextResponse.json({ total: memorias.length, categorias: grouped })
}

// DELETE /api/memoria — clear a specific memory fact
export async function DELETE(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await db.memoriaProfesional.updateMany({
    where: { id, userId: auth.userId },
    data: { activo: false },
  })

  return NextResponse.json({ ok: true })
}
