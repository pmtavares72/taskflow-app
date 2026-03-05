import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { pathname } = req.nextUrl
  const action = pathname.endsWith('/accept') ? 'aceptado' : 'rechazado'

  const feed = await db.agenteFeed.findUnique({ where: { id } })
  if (!feed) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.agenteFeed.update({
    where: { id },
    data: { estado: action },
  })

  return NextResponse.json(updated)
}
