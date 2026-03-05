import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { QuickCapture } from '@/components/items/QuickCapture'
import { InboxClient } from './InboxClient'
import type { ItemWithRelations, AgenteFeedItem } from '@/types'

export default async function InboxPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  const [items, agenteFeed] = await Promise.all([
    db.item.findMany({
      where: { userId, estado: 'INBOX' },
      include: {
        proyecto: { select: { id: true, nombre: true, color: true } },
        adjuntos: { select: { id: true, nombre: true, url: true, tipo: true, tamanio: true } },
        actividad: { select: { id: true, descripcion: true, autor: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 3 },
      },
      orderBy: [{ prioridad: 'desc' }, { createdAt: 'desc' }],
    }),
    db.agenteFeed.findFirst({
      where: { estado: 'pendiente', tipo: { in: ['sugerencia', 'digest'] } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Top bar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 18px 12px', background: 'var(--surface)',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Task<em style={{ color: 'var(--accent)', fontStyle: 'normal' }}>Flow</em>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, background: 'var(--elevated)', border: '1px solid var(--border)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {agenteFeed && (
              <div style={{
                position: 'absolute', top: 5, right: 5,
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--accent-orange)', border: '1.5px solid var(--surface)',
              }} />
            )}
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
          }}>
            PT
          </div>
        </div>
      </header>

      {/* Quick capture */}
      <QuickCapture />

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        <InboxClient
          items={items as unknown as ItemWithRelations[]}
          agenteFeed={agenteFeed as AgenteFeedItem | null}
        />
      </div>
    </div>
  )
}
