import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

const Schema = z.object({
  agentAutonomy: z.number().int().min(0).max(100),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const user = await db.user.update({
    where: { id: session.user.id },
    data: { agentAutonomy: parsed.data.agentAutonomy },
    select: { agentAutonomy: true },
  })

  return NextResponse.json(user)
}
