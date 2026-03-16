import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const entrada = await db.entradaContexto.findFirst({
    where: { id, userId: auth.userId },
  })
  if (!entrada) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  await db.entradaContexto.delete({ where: { id } })

  return NextResponse.json({ deleted: true })
}
