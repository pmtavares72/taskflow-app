import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  inboundEmail: z.string().email().optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = UpdateProfileSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const user = await db.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: { name: true, email: true, inboundEmail: true },
  })

  return NextResponse.json(user)
}
