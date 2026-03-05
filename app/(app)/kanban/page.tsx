import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { KanbanView } from '@/components/views/KanbanView'
import type { ItemWithRelations } from '@/types'

export default async function KanbanPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const items = await db.item.findMany({
    where: {
      userId: session.user.id,
      estado: { in: ['TODO', 'IN_PROGRESS', 'WAITING', 'DONE'] },
    },
    include: {
      proyecto: { select: { id: true, nombre: true, color: true } },
      adjuntos: { select: { id: true, nombre: true, url: true, tipo: true, tamanio: true } },
      actividad: { select: { id: true, descripcion: true, autor: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 3 },
    },
    orderBy: { createdAt: 'desc' },
  })

  const PRIO_ORDER: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 }
  items.sort((a, b) => (PRIO_ORDER[b.prioridad] ?? 0) - (PRIO_ORDER[a.prioridad] ?? 0))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', background: 'rgba(26,27,46,0.8)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-blue)' }} />
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Kanban
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            background: '#a5b4fc', color: '#13141f', border: 'none', borderRadius: 8,
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 0 16px rgba(165,180,252,0.2)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#13141f" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nueva tarea
          </button>
        </div>
      </div>

      {/* Board */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '16px 16px 0' }}>
        <KanbanView initialItems={items as unknown as ItemWithRelations[]} />
      </div>
    </div>
  )
}
