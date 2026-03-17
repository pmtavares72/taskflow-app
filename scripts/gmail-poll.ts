/**
 * Gmail Poller — Solo para desarrollo local
 *
 * Hace polling a Gmail cada N minutos, lee emails no leídos,
 * y los envía a TaskFlow /api/inbound-email para procesarlos.
 *
 * SETUP:
 * 1. Ve a https://console.cloud.google.com
 * 2. Crea un proyecto (o usa uno existente)
 * 3. Habilita "Gmail API"
 * 4. Crea credenciales OAuth2 (tipo "Desktop app")
 * 5. Descarga el JSON y guárdalo como scripts/gmail-credentials.json
 * 6. Ejecuta: npx tsx --env-file=.env.local scripts/gmail-poll.ts
 * 7. La primera vez abrirá el navegador para autorizar — después guarda el token
 *
 * Variables de entorno necesarias (en .env.local):
 *   TASKFLOW_URL=http://127.0.0.1:3000
 *   TASKFLOW_INBOUND_KEY=...
 *   GMAIL_POLL_INTERVAL=120  (segundos, default 120 = 2 min)
 *   GMAIL_QUERY=is:unread     (query de Gmail, default: no leídos)
 */

import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http'
import * as url from 'url'

const SCRIPTS_DIR = path.dirname(new URL(import.meta.url).pathname)
const CREDENTIALS_PATH = path.join(SCRIPTS_DIR, 'gmail-credentials.json')
const TOKEN_PATH = path.join(SCRIPTS_DIR, 'gmail-token.json')

const TASKFLOW_URL = process.env.TASKFLOW_URL || 'http://127.0.0.1:3000'
const INBOUND_KEY = process.env.TASKFLOW_INBOUND_KEY
const POLL_INTERVAL = parseInt(process.env.GMAIL_POLL_INTERVAL || '120', 10) * 1000
const GMAIL_QUERY = process.env.GMAIL_QUERY || 'is:unread'

if (!INBOUND_KEY) {
  console.error('❌ TASKFLOW_INBOUND_KEY no está definido en .env.local')
  process.exit(1)
}

if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error(`❌ No se encontró ${CREDENTIALS_PATH}`)
  console.error('   Descarga las credenciales OAuth2 de Google Cloud Console')
  console.error('   y guárdalas como scripts/gmail-credentials.json')
  process.exit(1)
}

// ─── Auth ───

async function getAuthClient(): Promise<OAuth2Client> {
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'))
  const { client_id, client_secret, redirect_uris } = creds.installed || creds.web
  // Use the redirect URI from credentials, with fallback port
  const redirect_uri = redirect_uris?.[0] === 'http://localhost'
    ? 'http://localhost:3847'
    : (redirect_uris?.[0] || 'http://localhost:3847')

  const oauth2 = new google.auth.OAuth2(client_id, client_secret, redirect_uri)

  // Check for saved token
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))
    oauth2.setCredentials(token)

    // Refresh if expired
    if (token.expiry_date && token.expiry_date < Date.now()) {
      console.log('🔄 Refrescando token...')
      const { credentials } = await oauth2.refreshAccessToken()
      oauth2.setCredentials(credentials)
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2))
    }

    return oauth2
  }

  // First time: open browser for authorization
  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.modify'],
  })

  console.log('🔐 Abriendo navegador para autorizar Gmail...')
  const { exec } = await import('child_process')
  exec(`open "${authUrl}"`)

  // Local server to catch the redirect
  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const query = url.parse(req.url!, true).query
      if (query.code) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end('<h2>Autorizado. Puedes cerrar esta pestaña.</h2>')
        server.close()
        resolve(query.code as string)
      } else {
        res.writeHead(400)
        res.end('No code')
        server.close()
        reject(new Error('No auth code received'))
      }
    })
    server.listen(3847, () => {
      console.log('   Esperando autorización en http://localhost:3847 ...')
    })
  })

  const { tokens } = await oauth2.getToken(code)
  oauth2.setCredentials(tokens)
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2))
  console.log('✅ Token guardado en', TOKEN_PATH)

  return oauth2
}

// ─── Parse email ───

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''
}

function extractBody(payload: any): { text: string; html: string } {
  let text = ''
  let html = ''

  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data)
    if (payload.mimeType === 'text/html') html = decoded
    else text = decoded
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        text = decodeBase64Url(part.body.data)
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html = decodeBase64Url(part.body.data)
      } else if (part.mimeType?.startsWith('multipart/') && part.parts) {
        const nested = extractBody(part)
        if (nested.text) text = nested.text
        if (nested.html) html = nested.html
      }
    }
  }

  return { text, html }
}

// ─── Send to TaskFlow ───

async function sendToTaskFlow(email: {
  from: string; to: string; subject: string; body: string; html?: string
}): Promise<boolean> {
  try {
    const res = await fetch(`${TASKFLOW_URL}/api/inbound-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${INBOUND_KEY}`,
      },
      body: JSON.stringify(email),
    })

    if (res.ok) {
      const data = await res.json().catch(() => null)
      if (data?.duplicate) {
        console.log(`   ⏭️  Ya procesado: "${email.subject}"`)
      } else {
        console.log(`   ✅ Procesado: "${email.subject}"`)
      }
      return true
    } else {
      const err = await res.text()
      console.error(`   ❌ Error ${res.status}: ${err.slice(0, 200)}`)
      return false
    }
  } catch (err) {
    console.error(`   ❌ Error enviando a TaskFlow:`, err)
    return false
  }
}

// ─── Poll loop ───

async function pollGmail(auth: OAuth2Client) {
  const gmail = google.gmail({ version: 'v1', auth })

  console.log(`📬 Buscando emails: "${GMAIL_QUERY}"`)

  const list = await gmail.users.messages.list({
    userId: 'me',
    q: GMAIL_QUERY,
    maxResults: 10,
  })

  const messages = list.data.messages || []

  if (messages.length === 0) {
    console.log('   Sin emails nuevos')
    return
  }

  console.log(`   ${messages.length} email(s) encontrado(s)`)

  for (const msg of messages) {
    try {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      })

      const headers = full.data.payload?.headers || []
      const from = getHeader(headers as any, 'From')
      const to = getHeader(headers as any, 'To')
      const subject = getHeader(headers as any, 'Subject')
      const { text, html } = extractBody(full.data.payload)

      const body = text || html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '(sin contenido)'

      console.log(`   📧 De: ${from}`)
      console.log(`      Asunto: ${subject}`)

      const sent = await sendToTaskFlow({
        from,
        to,
        subject,
        body,
        html: html || undefined,
      })

      // Mark as read only if successfully sent
      if (sent) {
        await gmail.users.messages.modify({
          userId: 'me',
          id: msg.id!,
          requestBody: {
            removeLabelIds: ['UNREAD'],
          },
        })
      }
    } catch (err) {
      console.error(`   ❌ Error procesando mensaje ${msg.id}:`, err)
    }
  }
}

// ─── Main ───

async function main() {
  console.log('╔══════════════════════════════════════╗')
  console.log('║   Gmail Poller → TaskFlow (local)    ║')
  console.log('╚══════════════════════════════════════╝')
  console.log(`  TaskFlow: ${TASKFLOW_URL}`)
  console.log(`  Intervalo: ${POLL_INTERVAL / 1000}s`)
  console.log(`  Query: ${GMAIL_QUERY}`)
  console.log('')

  const auth = await getAuthClient()

  // First poll immediately
  await pollGmail(auth)

  // Then poll on interval
  setInterval(async () => {
    try {
      await pollGmail(auth)
    } catch (err) {
      console.error('❌ Error en poll:', err)
    }
  }, POLL_INTERVAL)

  console.log(`\n⏰ Polling cada ${POLL_INTERVAL / 1000}s... (Ctrl+C para parar)\n`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
