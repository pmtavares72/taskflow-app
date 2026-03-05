'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ItemWithRelations } from '@/types'

interface Quadrant {
  id: string
  label: string
  hint: string
  num: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  color: string
  bg: string
  urgente: boolean
  importante: boolean
}

const QUADRANTS: Quadrant[] = [
  {
    id: 'q1', label: 'Urgente + Importante', hint: 'Hacer ahora', num: 'Q1',
    color: 'var(--urgent)', bg: 'rgba(248,113,113,0.12)',
    urgente: true, importante: true,
  },
  {
    id: 'q2', label: 'No urgente + Importante', hint: 'Planificar', num: 'Q2',
    color: 'var(--accent-blue)', bg: 'rgba(96,165,250,0.12)',
    urgente: false, importante: true,
  },
  {
    id: 'q3', label: 'Urgente + No importante', hint: 'Delegar', num: 'Q3',
    color: 'var(--accent-orange)', bg: 'rgba(251,146,60,0.12)',
    urgente: true, importante: false,
  },
  {
    id: 'q4', label: 'No urgente + No importante', hint: 'Eliminar', num: 'Q4',
    color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)',
    urgente: false, importante: false,
  },
]

function projectChipStyle(color: string) {
  if (color === '#60a5fa') return { color: 'var(--accent-blue)', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.15)' }
  if (color === '#4ade80') return { color: 'var(--accent-green)', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.15)' }
  if (color === '#a78bfa') return { color: 'var(--accent-purple)', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.15)' }
  return { color: 'var(--accent)', bg: 'rgba(47,212,170,0.08)', border: 'rgba(47,212,170,0.15)' }
}

function formatDate(date: Date | string | null) {
  if (!date) return null
  const d = new Date(date)
  const diff = d.getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return { label: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), overdue: true }
  if (days === 0) return { label: 'Hoy', overdue: false }
  return { label: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), overdue: false }
}

interface Props {
  items: ItemWithRelations[]
}

export function EisenhowerMatrix({ items: initialItems }: Props) {
  const [items, setItems] = useState(initialItems)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const router = useRouter()

  async function archive(itemId: string) {
    setItems(prev => prev.filter(i => i.id !== itemId))
    await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'ARCHIVED' }),
    })
    router.refresh()
  }

  // Items not yet classified go to the backlog tray
  const unclassifiedItems = items.filter(item => !item.eisenhowerUrgente && !item.eisenhowerImportante)
  // Items classified into quadrants
  const classifiedItems = items.filter(item => item.eisenhowerUrgente || item.eisenhowerImportante)

  // Q4 (neither urgent nor important) only shows explicitly classified items
  // Since we can't distinguish "never classified" from "explicitly Q4" without a schema change,
  // we use: if item was dragged to Q4, it stays in grid; unclassified items go to tray.
  // We track this via a local set of "intentionally Q4" items (items dragged to q4 this session).
  const [intentionalQ4, setIntentionalQ4] = useState<Set<string>>(new Set())

  function getQuadrantItems(q: Quadrant) {
    if (q.id === 'q4') {
      // Q4 shows only items that were intentionally placed there this session,
      // or items that were explicitly set (both urgente=false, importante=false) but came from classified state
      return classifiedItems.filter(i => !i.eisenhowerUrgente && !i.eisenhowerImportante)
        .concat(unclassifiedItems.filter(i => intentionalQ4.has(i.id)))
    }
    return classifiedItems.filter(i => i.eisenhowerUrgente === q.urgente && i.eisenhowerImportante === q.importante)
  }

  // Tray shows unclassified items NOT intentionally placed in Q4
  const trayItems = unclassifiedItems.filter(i => !intentionalQ4.has(i.id))

  async function moveToQuadrant(itemId: string, quadrantId: string) {
    const q = QUADRANTS.find(q => q.id === quadrantId)!

    if (quadrantId === 'q4') {
      setIntentionalQ4(prev => new Set(prev).add(itemId))
    }

    await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eisenhowerUrgente: q.urgente, eisenhowerImportante: q.importante }),
    })
    router.refresh()
  }

  async function unclassify(itemId: string) {
    setIntentionalQ4(prev => { const s = new Set(prev); s.delete(itemId); return s })
    await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eisenhowerUrgente: false, eisenhowerImportante: false }),
    })
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>

      {/* Sin clasificar tray */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver('tray') }}
        onDragLeave={() => setDragOver(null)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(null)
          const id = e.dataTransfer.getData('itemId')
          if (id) unclassify(id)
        }}
        style={{
          background: 'var(--surface)',
          border: `1px solid ${dragOver === 'tray' ? 'rgba(165,180,252,0.4)' : 'var(--border)'}`,
          borderRadius: 10, padding: '10px 12px', flexShrink: 0,
          transition: 'border-color 0.15s',
          boxShadow: dragOver === 'tray' ? '0 0 16px rgba(165,180,252,0.1)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: trayItems.length > 0 ? 8 : 0 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, color: 'rgba(165,180,252,0.8)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Sin clasificar
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20,
            background: 'rgba(165,180,252,0.08)', color: 'rgba(165,180,252,0.6)',
            border: '1px solid rgba(165,180,252,0.12)',
          }}>
            {trayItems.length}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>
            — arrastra a un cuadrante para clasificar
          </span>
        </div>

        {trayItems.length > 0 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {trayItems.map(item => (
              <TrayCard
                key={item.id}
                item={item}
                isDragging={dragging === item.id}
                onDragStart={() => setDragging(item.id)}
                onDragEnd={() => setDragging(null)}
                onArchive={() => archive(item.id)}
              />
            ))}
          </div>
        )}

        {trayItems.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Todos los items están clasificados · arrastra aquí para desclasificar
          </div>
        )}
      </div>

      {/* 2×2 grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr',
        gap: 12, flex: 1, minHeight: 0,
      }}>
        {QUADRANTS.map((q, qi) => {
          const qItems = getQuadrantItems(q)
          const isOver = dragOver === q.id

          return (
            <div
              key={q.id}
              onDragOver={e => { e.preventDefault(); setDragOver(q.id) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(null)
                const id = e.dataTransfer.getData('itemId')
                if (id) moveToQuadrant(id, q.id)
              }}
              style={{
                background: 'var(--surface)', border: `1px solid ${isOver ? q.color + '40' : 'var(--border)'}`,
                borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                animation: `fade-up 0.4s ease ${0.08 * qi}s both`,
                opacity: q.num === 'Q4' ? 0.75 : 1,
                transition: 'border-color 0.15s',
                boxShadow: isOver ? `0 0 20px ${q.color}20` : 'none',
              }}
            >
              {/* Quad color strip */}
              <div style={{ height: 3, background: q.color, flexShrink: 0 }} />

              {/* Quad header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px 8px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: q.color }}>
                  {q.num}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{q.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{q.hint}</div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: q.bg, color: q.color,
                }}>
                  {qItems.length}
                </span>
              </div>

              {/* Items list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {qItems.map(item => (
                  <QuadrantCard
                    key={item.id}
                    item={item}
                    isDragging={dragging === item.id}
                    onDragStart={() => setDragging(item.id)}
                    onDragEnd={() => setDragging(null)}
                    onArchive={() => archive(item.id)}
                  />
                ))}

                {qItems.length === 0 && (
                  <div style={{
                    textAlign: 'center', padding: '20px 10px',
                    border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 8,
                    color: 'var(--text-muted)', fontSize: 11,
                  }}>
                    Arrastra items aquí
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function QuadrantCard({ item, isDragging, onDragStart, onDragEnd, onArchive }: {
  item: ItemWithRelations
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onArchive: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const date = formatDate(item.fechaLimite)
  const proj = item.proyecto
  const projStyle = proj ? projectChipStyle(proj.color) : null

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('itemId', item.id); onDragStart() }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: 'var(--card)', border: `1px solid ${hovered ? 'var(--border-hover)' : 'var(--border)'}`,
        borderRadius: 8, padding: '9px 10px', cursor: 'grab',
        transition: 'border-color 0.15s, opacity 0.15s',
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4, marginBottom: 5, paddingRight: hovered ? 20 : 0 }}>
        {item.titulo}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        {proj && projStyle && (
          <span style={{
            fontSize: 10.5, padding: '1px 6px', borderRadius: 20,
            color: projStyle.color, background: projStyle.bg, border: `1px solid ${projStyle.border}`,
          }}>
            {proj.nombre}
          </span>
        )}
        {date && (
          <span style={{ fontSize: 10.5, color: date.overdue ? 'var(--urgent)' : 'var(--text-muted)' }}>
            {date.label}
          </span>
        )}
        {item.modificadoPor === 'agente' && (
          <span style={{ fontSize: 10.5, color: 'var(--accent-purple)', marginLeft: 'auto' }}>✦ Nexus</span>
        )}
      </div>
      {hovered && (
        <button
          onClick={e => { e.stopPropagation(); onArchive() }}
          title="Archivar"
          style={{
            position: 'absolute', top: 6, right: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 13, lineHeight: 1,
            padding: '2px 4px', borderRadius: 4,
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--urgent)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
        >
          ×
        </button>
      )}
    </div>
  )
}

function TrayCard({ item, isDragging, onDragStart, onDragEnd, onArchive }: {
  item: ItemWithRelations
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onArchive: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const proj = item.proyecto

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('itemId', item.id); onDragStart() }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', flexShrink: 0,
        background: 'var(--card)', border: `1px solid ${hovered ? 'rgba(165,180,252,0.3)' : 'var(--border)'}`,
        borderRadius: 8, padding: '7px 10px', cursor: 'grab',
        opacity: isDragging ? 0.5 : 1, transition: 'border-color 0.15s, opacity 0.15s',
        maxWidth: 200,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: hovered ? 18 : 0 }}>
        {item.titulo}
      </div>
      {proj && (
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {proj.nombre}
        </div>
      )}
      {hovered && (
        <button
          onClick={e => { e.stopPropagation(); onArchive() }}
          title="Archivar"
          style={{
            position: 'absolute', top: 5, right: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 13, lineHeight: 1,
            padding: '2px 4px', borderRadius: 4,
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--urgent)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
        >
          ×
        </button>
      )}
    </div>
  )
}
