import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, inboundEmail: true,
      agentAutonomy: true, createdAt: true,
      _count: { select: { items: true, seguimientos: true, memorias: true, entradas: true } },
    },
  })

  // Estado del sistema — verificar qué keys están configuradas
  const system = {
    xaiApiKey: !!process.env.XAI_API_KEY && process.env.XAI_API_KEY.length > 0,
    llmModel: process.env.LLM_MODEL || 'grok-4-fast',
    openclawUrl: process.env.OPENCLAW_URL || null,
    openclawConfigured: !!process.env.OPENCLAW_URL,
    smtpDomain: process.env.SMTP_DOMAIN || 'hyper-nexus.com',
    taskflowAgentKey: !!process.env.TASKFLOW_AGENT_KEY,
    taskflowInboundKey: !!process.env.TASKFLOW_INBOUND_KEY,
  }

  return NextResponse.json({ user, system })
}
