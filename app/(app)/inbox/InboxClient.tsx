'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SparkleIcon } from '@/components/ui/SparkleIcon'
import { ItemDetailPanel } from '@/components/items/ItemDetailPanel'
import type { ItemWithRelations, AgenteFeedItem } from '@/types'

const CONTEXT_PILLS = ['Todos', 'Trabajo', 'Personal', 'Nexus'] as const
const FILTER_CHIPS = ['Todo', 'Urgente', 'Alta', 'Media'] as const

type ContextPill = typeof CONTEXT_PILLS[number]
type FilterChip = typeof FILTER_CHIPS[number]

const PRIORITY_ORDER: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 }

function priorityColor(p: string) {
  if (p === 'URGENT') return 'var(--urgent)'
  if (p === 'HIGH') return 'var(--high)'
  if (p === 'MEDIUM') return 'var(--medium)'
  return 'transparent'
}

function priorityBadge(p: string) {
  if (p === 'URGENT') return { label: '!!', bg: 'rgba(248,113,113,0.15)', color: 'var(--urgent)' }
  if (p === 'HIGH') return { label: '!', bg: 'rgba(251,146,60,0.15)', color: 'var(--high)' }
  if (p === 'MEDIUM') return { label: '·', bg: 'rgba(96,165,250,0.15)', color: 'var(--medium)' }
  return null
}

function formatDate(date: Date | string | null) {
  if (!date) return null
  const d = new Date(date)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return { label: 'Vencida', overdue: true }
  if (days === 0) return { label: 'Hoy', overdue: false }
  if (days === 1) return { label: 'Mañana', overdue: false }
  return { label: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), overdue: false }
}

function projectChipColor(color: string) {
  // Map project color to chip style
  if (color === '#60a5fa') return { color: 'var(--accent-blue)', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.15)' }
  if (color === '#4ade80') return { color: 'var(--accent-green)', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.15)' }
  if (color === '#a78bfa') return { color: 'var(--accent-purple)', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.15)' }
  return { color: 'var(--accent)', bg: 'rgba(47,212,170,0.08)', border: 'rgba(47,212,170,0.15)' }
}

interface Props {
  items: ItemWithRelations[]
  agenteFeed: AgenteFeedItem | null
}

export function InboxClient({ items, agenteFeed }: Props) {
  const [context, setContext] = useState<ContextPill>('Todos')
  const [filter, setFilter] = useState<FilterChip>('Todo')
  const [dismissed, setDismissed] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ItemWithRelations | null>(null)
  const router = useRouter()

  // Filter items
  const filtered = items.filter(item => {
    if (context === 'Trabajo' && item.contexto !== 'TRABAJO') return false
    if (context === 'Personal' && item.contexto !== 'PERSONAL') return false
    if (context === 'Nexus' && item.modificadoPor !== 'agente') return false
    if (filter === 'Urgente' && item.prioridad !== 'URGENT') return false
    if (filter === 'Alta' && item.prioridad !== 'HIGH') return false
    if (filter === 'Media' && item.prioridad !== 'MEDIUM') return false
    return true
  })

  // Group: overdue/today vs rest
  const now = new Date()
  const urgent = filtered.filter(i => {
    if (!i.fechaLimite) return PRIORITY_ORDER[i.prioridad] >= 3
    return new Date(i.fechaLimite) <= now || PRIORITY_ORDER[i.prioridad] >= 3
  })
  const rest = filtered.filter(i => !urgent.includes(i))

  async function markDone(id: string) {
    await fetch(`/api/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'DONE' }),
    })
    router.refresh()
  }

  async function moveToKanban(id: string) {
    await fetch(`/api/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'TODO' }),
    })
    router.refresh()
  }

  async function acceptAgentFeed(feedId: string) {
    await fetch(`/api/agent/feed/${feedId}/accept`, { method: 'PATCH' })
    setDismissed(true)
    router.refresh()
  }

  return (
    <>
      {/* Context pills */}
      <div style={{
        padding: '10px 16px', background: 'var(--surface)',
        display: 'flex', gap: 7, overflowX: 'auto', scrollbarWidth: 'none',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        {CONTEXT_PILLS.map(pill => (
          <button
            key={pill}
            onClick={() => setContext(pill)}
            style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s', border: '1px solid',
              fontFamily: "'Outfit', sans-serif",
              background: context === pill
                ? (pill === 'Nexus' ? 'rgba(167,139,250,0.1)' : 'var(--accent)')
                : 'var(--elevated)',
              borderColor: context === pill
                ? (pill === 'Nexus' ? 'rgba(167,139,250,0.2)' : 'var(--accent)')
                : 'var(--border)',
              color: context === pill
                ? (pill === 'Nexus' ? 'var(--accent-purple)' : '#13141f')
                : 'var(--text-muted)',
              boxShadow: context === pill && pill !== 'Nexus' ? '0 0 12px rgba(47,212,170,0.25)' : 'none',
            }}
          >
            {pill === 'Nexus' ? '✦ Nexus' : pill}
          </button>
        ))}
      </div>

      <div style={{ padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Agent strip */}
        {agenteFeed && !dismissed && (
          <div style={{
            background: 'var(--sidebar-ai)', border: '1px solid var(--border)',
            borderLeft: '3px solid var(--accent-purple)', borderRadius: '0 10px 10px 0',
            padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
            animation: 'fade-up 0.4s ease both',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: 'var(--card)',
              border: '1.5px solid rgba(47,212,170,0.35)', color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 0 8px rgba(47,212,170,0.12)',
            }}>
              <SparkleIcon size={14} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10.5, fontWeight: 600, color: 'var(--accent-purple)',
                letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                Nexus
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-dot 2s ease-in-out infinite', display: 'inline-block' }} />
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {agenteFeed.descripcion}
              </div>
            </div>
          </div>
        )}

        {/* Suggestion card (pendiente) */}
        {agenteFeed && !dismissed && agenteFeed.tipo === 'sugerencia' && (
          <div style={{
            background: 'var(--card)', border: '1px solid rgba(167,139,250,0.2)',
            borderRadius: 12, overflow: 'hidden', animation: 'fade-up 0.4s ease 0.1s both',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(167,139,250,0.08), transparent)',
              padding: '12px 14px 10px', display: 'flex', alignItems: 'flex-start', gap: 10,
              borderBottom: '1px solid rgba(167,139,250,0.1)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--card)',
                border: '1.5px solid rgba(167,139,250,0.35)', color: 'var(--accent-purple)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 0 10px rgba(167,139,250,0.3)',
              }}>
                <SparkleIcon size={14} />
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--accent-purple)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 3 }}>
                  Nexus · Sugerencia
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                  {agenteFeed.descripcion}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px' }}>
              <button
                onClick={() => acceptAgentFeed(agenteFeed.id)}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', background: '#a5b4fc', color: '#13141f',
                  boxShadow: '0 0 10px rgba(165,180,252,0.2)',
                }}
              >
                Aceptar
              </button>
              <button
                onClick={() => setDismissed(true)}
                style={{
                  padding: '6px 14px', borderRadius: 8,
                  fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                Ignorar
              </button>
            </div>
          </div>
        )}

        {/* Filter row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 2px' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 2 }}>
            Filtrar
          </span>
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => setFilter(chip)}
              style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                color: filter === chip ? 'var(--accent)' : 'var(--text-muted)',
                background: filter === chip ? 'rgba(47,212,170,0.08)' : 'none',
                border: 'none', transition: 'all 0.15s',
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Section: urgent/overdue */}
        {urgent.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Hoy & Vencidas
              </span>
              <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px' }}>
                {urgent.length}
              </span>
            </div>
            {urgent.map((item, i) => (
              <InboxItem key={item.id} item={item} index={i} onMarkDone={markDone} onMoveToKanban={moveToKanban} onOpen={setSelectedItem} />
            ))}
          </>
        )}

        {/* Section: rest */}
        {rest.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Esta semana
              </span>
              <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px' }}>
                {rest.length}
              </span>
            </div>
            {rest.map((item, i) => (
              <InboxItem key={item.id} item={item} index={i + urgent.length} onMarkDone={markDone} onMoveToKanban={moveToKanban} onOpen={setSelectedItem} />
            ))}
          </>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Inbox vacío</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Captura algo nuevo arriba</div>
          </div>
        )}
      </div>

      {selectedItem && (
        <ItemDetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={() => router.refresh()}
        />
      )}
    </>
  )
}

function InboxItem({
  item,
  index,
  onMarkDone,
  onMoveToKanban,
  onOpen,
}: {
  item: ItemWithRelations
  index: number
  onMarkDone: (id: string) => void
  onMoveToKanban: (id: string) => void
  onOpen: (item: ItemWithRelations) => void
}) {
  const date = formatDate(item.fechaLimite)
  const badge = priorityBadge(item.prioridad)
  const leftColor = priorityColor(item.prioridad)
  const proj = item.proyecto
  const projStyle = proj ? projectChipColor(proj.color) : null
  const delay = `${0.05 + index * 0.05}s`

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '13px 14px', display: 'flex', gap: 10, cursor: 'pointer',
      transition: 'border-color 0.15s, transform 0.15s',
      animation: `fade-up 0.4s ease ${delay} both`,
      position: 'relative', overflow: 'hidden',
    }}
      onClick={() => onOpen(item)}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-hover)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateX(2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)' }}
    >
      {/* Priority left bar */}
      {leftColor !== 'transparent' && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: leftColor, borderRadius: '12px 0 0 12px' }} />
      )}

      {/* Checkbox */}
      <div
        onClick={e => { e.stopPropagation(); onMarkDone(item.id) }}
        style={{
          width: 18, height: 18, borderRadius: 6, border: '1.5px solid var(--border-hover)',
          flexShrink: 0, marginTop: 1, cursor: 'pointer', transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(47,212,170,0.08)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-hover)'; (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
      />

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4, marginBottom: 6 }}>
          {item.titulo}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          {proj && projStyle && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500,
              color: projStyle.color, background: projStyle.bg, border: `1px solid ${projStyle.border}`,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: proj.color, flexShrink: 0 }} />
              {proj.nombre}
            </span>
          )}
          {date && (
            <span style={{
              fontSize: 11, fontWeight: date.overdue ? 500 : 400,
              color: date.overdue ? 'var(--urgent)' : 'var(--text-muted)',
            }}>
              {date.overdue ? `Vencida · ${date.label}` : date.label}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={e => { e.stopPropagation(); onMoveToKanban(item.id) }}
          title="Mover a Kanban"
          style={{
            padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
            background: 'rgba(165,180,252,0.1)', border: '1px solid rgba(165,180,252,0.2)',
            color: '#a5b4fc', cursor: 'pointer', transition: 'all 0.15s',
            fontFamily: "'Outfit', sans-serif",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(165,180,252,0.2)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(165,180,252,0.1)' }}
        >
          → Kanban
        </button>
        {badge && (
          <span style={{
            width: 20, height: 20, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, background: badge.bg, color: badge.color,
          }}>
            {badge.label}
          </span>
        )}
      </div>
    </div>
  )
}
