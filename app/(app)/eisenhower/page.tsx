import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { EisenhowerMatrix } from '@/components/views/EisenhowerMatrix'
import type { ItemWithRelations } from '@/types'

export default async function EisenhowerPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const items = await db.item.findMany({
    where: {
      userId: session.user.id,
      estado: { not: 'DONE' },
      NOT: { estado: 'ARCHIVED' },
    },
    include: {
      proyecto: { select: { id: true, nombre: true, color: true } },
      adjuntos: { select: { id: true, nombre: true, url: true, tipo: true, tamanio: true } },
      actividad: { select: { id: true, descripcion: true, autor: true, createdAt: true }, take: 0 },
    },
    orderBy: { prioridad: 'desc' },
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', background: 'rgba(26,27,46,0.8)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </svg>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Matriz Eisenhower
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
          {items.length} items activos
        </div>
      </div>

      {/* Matrix */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '16px 20px 20px' }}>
        <EisenhowerMatrix items={items as unknown as ItemWithRelations[]} />
      </div>
    </div>
  )
}
