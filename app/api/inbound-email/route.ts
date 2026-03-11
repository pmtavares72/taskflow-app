import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { onEntradaCreated } from '@/lib/agent-events'

const InboundEmailSchema = z.object({
  from: z.string(),
  to: z.string().optional(),
  subject: z.string(),
  body: z.string(),
  html: z.string().optional(),
  date: z.string().optional(),
  seguimientoId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedKey = process.env.TASKFLOW_INBOUND_KEY
  if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = InboundEmailSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const email = parsed.data

  // Match user by inboundEmail (the "to" address)
  // Supports: ptavares@hyper-nexus.com, <seg-id>@hyper-nexus.com, inbox@hyper-nexus.com
  let user = null
  if (email.to) {
    // Extract all email addresses from the "to" field
    const addresses = email.to.match(/[\w.-]+@[\w.-]+/g) ?? []
    for (const addr of addresses) {
      // Try direct match on inboundEmail
      const found = await db.user.findFirst({ where: { inboundEmail: addr.toLowerCase() } })
      if (found) { user = found; break }
    }
    // If no match by inboundEmail, try matching by domain (any @hyper-nexus.com goes to the domain owner)
    if (!user) {
      const domain = process.env.SMTP_DOMAIN ?? 'hyper-nexus.com'
      const domainAddr = addresses.find(a => a.toLowerCase().endsWith(`@${domain}`))
      if (domainAddr) {
        // Find any user with an inboundEmail on this domain
        user = await db.user.findFirst({
          where: { inboundEmail: { endsWith: `@${domain}` } },
        })
      }
    }
  }

  // Fallback: first user (single-user mode)
  if (!user) {
    user = await db.user.findFirst()
  }
  if (!user) return NextResponse.json({ error: 'No user found' }, { status: 500 })

  // Auto-detect seguimiento from subject: [TF-xxx] or [SEG-xxx]
  let seguimientoId = email.seguimientoId ?? null
  if (!seguimientoId) {
    const segMatch = email.subject.match(/\[(?:TF|SEG)-([a-z0-9]+)\]/i)
    if (segMatch) {
      const seg = await db.seguimiento.findFirst({
        where: { id: { startsWith: segMatch[1] }, userId: user.id },
      })
      if (seg) seguimientoId = seg.id
    }
  }

  // Also check if the "to" address local part is a seguimiento ID
  if (!seguimientoId && email.to) {
    const domain = process.env.SMTP_DOMAIN ?? 'hyper-nexus.com'
    const addresses = email.to.match(/[\w.-]+@[\w.-]+/g) ?? []
    for (const addr of addresses) {
      if (!addr.toLowerCase().endsWith(`@${domain}`)) continue
      const local = addr.split('@')[0].toLowerCase()
      // Skip known aliases
      if (['inbox', 'nexus', 'taskflow'].includes(local)) continue
      if (local === user.inboundEmail?.split('@')[0]?.toLowerCase()) continue
      // Try as seguimiento ID
      const seg = await db.seguimiento.findFirst({
        where: { id: { startsWith: local }, userId: user.id },
      })
      if (seg) { seguimientoId = seg.id; break }
    }
  }

  const contenido = [
    `De: ${email.from}`,
    email.to ? `Para: ${email.to}` : '',
    email.date ? `Fecha: ${email.date}` : '',
    '---',
    email.body,
  ].filter(Boolean).join('\n')

  const entrada = await db.entradaContexto.create({
    data: {
      tipo: 'EMAIL',
      titulo: email.subject,
      contenido,
      seguimientoId,
      userId: user.id,
    },
  })

  if (seguimientoId) {
    await db.seguimiento.update({
      where: { id: seguimientoId },
      data: { ultimaActividad: new Date() },
    }).catch(() => {})
  }

  onEntradaCreated(entrada.id).catch(console.error)

  return NextResponse.json({
    id: entrada.id,
    seguimientoId,
    user: user.inboundEmail,
    message: 'Email recibido y procesado por Nexus',
  }, { status: 201 })
}
