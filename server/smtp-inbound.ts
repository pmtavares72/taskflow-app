/**
 * ─── SMTP Inbound Server para hyper-nexus.com ───
 *
 * Recibe emails en inbox@hyper-nexus.com (o cualquier @hyper-nexus.com)
 * y los envía al endpoint /api/inbound-email para que Nexus los procese.
 *
 * Direcciones especiales:
 *   inbox@hyper-nexus.com          → va al inbox general
 *   <seguimiento-id>@hyper-nexus.com → se vincula automáticamente al seguimiento
 *
 * Ejecutar:
 *   npx tsx server/smtp-inbound.ts
 *
 * En producción (PM2):
 *   pm2 start server/smtp-inbound.ts --interpreter="npx tsx" --name smtp
 *
 * Variables de entorno:
 *   SMTP_PORT            — puerto SMTP (default: 2525)
 *   SMTP_DOMAIN          — dominio aceptado (default: hyper-nexus.com)
 *   TASKFLOW_URL         — URL de TaskFlow (default: http://127.0.0.1:3000)
 *   TASKFLOW_INBOUND_KEY — token auth compartido con /api/inbound-email
 *
 * DNS requerido en hyper-nexus.com:
 *   MX   10   hyper-nexus.com.       (o mail.hyper-nexus.com.)
 *   A         <IP-del-VPS>
 *
 * Nginx stream proxy (puerto 25 → 2525):
 *   stream { server { listen 25; proxy_pass 127.0.0.1:2525; } }
 */

import { SMTPServer } from 'smtp-server'
import { simpleParser } from 'mailparser'

const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? '2525')
const SMTP_DOMAIN = process.env.SMTP_DOMAIN ?? 'hyper-nexus.com'
const TASKFLOW_URL = process.env.TASKFLOW_URL ?? 'http://127.0.0.1:3000'
const TASKFLOW_INBOUND_KEY = process.env.TASKFLOW_INBOUND_KEY ?? ''

// Extract the local part of an email address (before @)
function extractLocalPart(address: string): string {
  return address.split('@')[0]?.toLowerCase() ?? ''
}

// Check if the local part looks like a seguimiento ID (cuid format)
function isSeguimientoAddress(local: string): string | null {
  // cuid looks like: cm1abc2def3ghi...  (starts with 'c', 25+ chars)
  if (/^c[a-z0-9]{24,}$/i.test(local)) return local
  // Also accept seg-<id> prefix
  const match = local.match(/^seg-(.+)$/)
  return match ? match[1] : null
}

const server = new SMTPServer({
  authOptional: true,
  banner: `TaskFlow Nexus SMTP — ${SMTP_DOMAIN}`,
  size: 10 * 1024 * 1024, // 10MB max

  // Validate recipient: only accept @hyper-nexus.com (or configured domain)
  onRcptTo(address, _session, callback) {
    const domain = address.address?.split('@')[1]?.toLowerCase()
    if (domain !== SMTP_DOMAIN) {
      return callback(new Error(`Only accepting mail for @${SMTP_DOMAIN}`))
    }
    callback()
  },

  onData(stream, session, callback) {
    const chunks: Buffer[] = []

    stream.on('data', (chunk: Buffer) => chunks.push(chunk))

    stream.on('end', async () => {
      try {
        const raw = Buffer.concat(chunks)
        const parsed = await simpleParser(raw)

        // Determine seguimientoId from recipient address
        let seguimientoId: string | undefined
        const recipients = session.envelope.rcptTo ?? []
        for (const rcpt of recipients) {
          const local = extractLocalPart(rcpt.address)
          const segId = isSeguimientoAddress(local)
          if (segId) {
            seguimientoId = segId
            break
          }
        }

        // Also check subject for [TF-xxx] or [SEG-xxx] tags
        if (!seguimientoId && parsed.subject) {
          const match = parsed.subject.match(/\[(?:TF|SEG)-([a-z0-9]+)\]/i)
          if (match) seguimientoId = match[1]
        }

        const payload = {
          from: parsed.from?.text ?? 'unknown',
          to: parsed.to
            ? (Array.isArray(parsed.to) ? parsed.to.map(t => t.text).join(', ') : parsed.to.text)
            : recipients.map(r => r.address).join(', '),
          subject: parsed.subject ?? '(sin asunto)',
          body: parsed.text ?? '',
          html: parsed.html || undefined,
          date: parsed.date?.toISOString(),
          seguimientoId,
        }

        console.log(`[SMTP] ← "${payload.subject}" de ${payload.from}${seguimientoId ? ` → seguimiento ${seguimientoId}` : ''}`)

        const res = await fetch(`${TASKFLOW_URL}/api/inbound-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(TASKFLOW_INBOUND_KEY ? { 'Authorization': `Bearer ${TASKFLOW_INBOUND_KEY}` } : {}),
          },
          body: JSON.stringify(payload),
        })

        if (res.ok) {
          const result = await res.json()
          console.log(`[SMTP] ✓ entrada ${result.id}${result.seguimientoId ? ` (seg: ${result.seguimientoId})` : ''}`)
        } else {
          console.error(`[SMTP] ✗ API error: ${res.status} ${await res.text()}`)
        }

        callback()
      } catch (err) {
        console.error('[SMTP] Error procesando email:', err)
        callback(new Error('Error processing email'))
      }
    })
  },

  onAuth(auth, _session, callback) {
    callback(null, { user: auth.username ?? 'anonymous' })
  },
})

server.listen(SMTP_PORT, '0.0.0.0', () => {
  console.log(`
┌─────────────────────────────────────────────────────┐
│  TaskFlow SMTP Inbound · ${SMTP_DOMAIN.padEnd(26)}│
│  Puerto: ${String(SMTP_PORT).padEnd(42)}│
│  API:    ${TASKFLOW_URL.padEnd(42)}│
│                                                     │
│  Direcciones:                                       │
│    inbox@${SMTP_DOMAIN.padEnd(43)}│
│    <seg-id>@${SMTP_DOMAIN.padEnd(39)}│
│                                                     │
│  Reenvía cualquier email a inbox@${SMTP_DOMAIN.padEnd(18)}│
│  y Nexus lo procesará automáticamente.              │
│                                                     │
│  Para vincular a un seguimiento, reenvía a:         │
│    <id-del-seguimiento>@${SMTP_DOMAIN.padEnd(27)}│
│  o pon [TF-<id>] en el asunto.                      │
└─────────────────────────────────────────────────────┘
`)
})

server.on('error', (err) => {
  console.error('[SMTP] Error:', err)
})
