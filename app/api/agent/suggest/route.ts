import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { requestItemAnalysis } from '@/lib/agent'
import { z } from 'zod'

const SuggestSchema = z.object({
  itemId: z.string(),
  question: z.string().min(1).max(500).optional().default('Analiza este item y sugiere una acción.'),
})

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = SuggestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  requestItemAnalysis(parsed.data.itemId, parsed.data.question).catch(console.error)

  return NextResponse.json({ queued: true }, { status: 202 })
}
