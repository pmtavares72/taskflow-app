'use client'

import type { ItemWithRelations } from '@/types'

function priorityBarColor(p: string) {
  if (p === 'URGENT') return 'var(--urgent)'
  if (p === 'HIGH') return 'var(--high)'
  if (p === 'MEDIUM') return 'var(--medium)'
  return 'transparent'
}

function priorityLabel(p: string): { label: string; color: string; bg: string } | null {
  if (p === 'URGENT') return { label: '!! Urgente', color: 'var(--urgent)', bg: 'rgba(248,113,113,0.1)' }
  if (p === 'HIGH') return { label: '! Alta', color: 'var(--high)', bg: 'rgba(251,146,60,0.1)' }
  if (p === 'MEDIUM') return { label: 'Media', color: 'var(--accent-blue)', bg: 'rgba(96,165,250,0.1)' }
  return null
}

function formatCardDate(date: Date | string | null) {
  if (!date) return null
  const d = new Date(date)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return { label: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), overdue: true }
  if (days === 0) return { label: 'Hoy', overdue: true }
  if (days <= 3) return { label: `${days}d`, overdue: false, soon: true }
  return { label: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), overdue: false, soon: false }
}

function projectChipStyle(color: string) {
  if (color === '#60a5fa') return { color: 'var(--accent-blue)', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.15)' }
  if (color === '#4ade80') return { color: 'var(--accent-green)', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.15)' }
  if (color === '#a78bfa') return { color: 'var(--accent-purple)', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.15)' }
  return { color: 'var(--accent)', bg: 'rgba(47,212,170,0.08)', border: 'rgba(47,212,170,0.15)' }
}

function tipoIcon(tipo: string) {
  if (tipo === 'EMAIL') return '✉'
  if (tipo === 'IDEA') return '💡'
  if (tipo === 'LINK') return '🔗'
  if (tipo === 'FILE') return '📎'
  if (tipo === 'NOTE') return '📝'
  return null // TASK — no icon
}

interface Props {
  item: ItemWithRelations
  index?: number
  onClick?: () => void
  onDelete?: () => void
  isDragging?: boolean
}

export function ItemCard({ item, index = 0, onClick, onDelete, isDragging }: Props) {
  const date = formatCardDate(item.fechaLimite)
  const barColor = priorityBarColor(item.prioridad)
  const prio = priorityLabel(item.prioridad)
  const icon = tipoIcon(item.tipo)
  const proj = item.proyecto
  const projStyle = proj ? projectChipStyle(proj.color) : null
  const isDone = item.estado === 'DONE'
  const delay = `${0.1 + index * 0.05}s`
  const isPersonal = item.contexto === 'PERSONAL'

  return (
    <div
      onClick={onClick}
      style={{
        background: isDragging ? '#1e2035' : 'var(--card)',
        border: isDragging ? '1px solid rgba(47,212,170,0.3)' : '1px solid var(--border)',
        borderRadius: 10, padding: '11px 12px', cursor: 'pointer',
        transition: isDragging ? 'none' : 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
        position: 'relative', overflow: 'hidden', flexShrink: 0,
        opacity: isDone && !isDragging ? 0.55 : 1,
        animation: isDragging ? 'none' : `col-in 0.5s cubic-bezier(0.16,1,0.3,1) ${delay} both`,
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.5)' : 'none',
        transform: isDragging ? 'rotate(2deg)' : 'none',
      }}
      onMouseEnter={e => {
        if (!isDragging) {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'var(--border-hover)'
          el.style.transform = 'translateY(-1px)'
          el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)'
          const del = el.querySelector('.item-card-delete') as HTMLElement
          if (del) del.style.opacity = '0.5'
        }
      }}
      onMouseLeave={e => {
        if (!isDragging) {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'var(--border)'
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = 'none'
          const del = el.querySelector('.item-card-delete') as HTMLElement
          if (del) del.style.opacity = '0'
        }
      }}
    >
      {/* Priority left bar */}
      {barColor !== 'transparent' && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: barColor, borderRadius: '10px 0 0 10px' }} />
      )}

      {/* Title row */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 5,
        marginBottom: 8,
        paddingLeft: barColor !== 'transparent' ? 4 : 0,
      }}>
        {icon && (
          <span style={{ fontSize: 11, flexShrink: 0, marginTop: 1, opacity: 0.7 }}>{icon}</span>
        )}
        <div style={{
          fontSize: 12.5, fontWeight: 500, color: 'var(--text)', lineHeight: 1.45,
          textDecoration: isDone ? 'line-through' : 'none', flex: 1,
        }}>
          {item.titulo}
        </div>
      </div>

      {/* Tags row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        {/* Priority badge */}
        {prio && (
          <span style={{
            fontSize: 9.5, fontWeight: 600, padding: '1px 6px', borderRadius: 5,
            background: prio.bg, color: prio.color, flexShrink: 0,
          }}>
            {prio.label}
          </span>
        )}

        {/* Project */}
        {proj && projStyle && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '1px 6px', borderRadius: 5, fontSize: 10, fontWeight: 500,
            color: projStyle.color, background: projStyle.bg, border: `1px solid ${projStyle.border}`,
            flexShrink: 0,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: proj.color, flexShrink: 0 }} />
            {proj.nombre}
          </span>
        )}

        {/* Context — only show Personal to distinguish from default Trabajo */}
        {isPersonal && (
          <span style={{
            fontSize: 9.5, fontWeight: 500, padding: '1px 6px', borderRadius: 5,
            background: 'rgba(167,139,250,0.08)', color: 'var(--accent-purple)',
            border: '1px solid rgba(167,139,250,0.15)', flexShrink: 0,
          }}>
            Personal
          </span>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Date */}
        {date && (
          <span style={{
            fontSize: 10, fontWeight: date.overdue ? 600 : 400,
            color: date.overdue ? 'var(--urgent)' : (date.soon ? 'var(--high)' : 'var(--text-sub)'),
            flexShrink: 0,
          }}>
            {date.overdue ? `⚠ ${date.label}` : date.label}
          </span>
        )}

        {/* Nexus note indicator */}
        {item.notasAgente && (
          <span style={{ fontSize: 9.5, color: 'var(--accent-purple)', flexShrink: 0 }} title="Nota de Nexus">✦</span>
        )}

        {/* Delete */}
        {onDelete && (
          <div
            onClick={e => { e.stopPropagation(); onDelete() }}
            title="Eliminar"
            style={{
              width: 18, height: 18, borderRadius: 4, cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.15s',
            }}
            className="item-card-delete"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--urgent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
