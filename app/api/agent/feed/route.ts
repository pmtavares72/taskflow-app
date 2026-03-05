import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const estado = searchParams.get('estado')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)

  const feed = await db.agenteFeed.findMany({
    where: estado ? { estado } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return NextResponse.json(feed)
}
