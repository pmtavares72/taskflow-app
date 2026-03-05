'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SparkleIcon } from '@/components/ui/SparkleIcon'
import type { ItemWithRelations } from '@/types'

const ESTADOS = ['INBOX', 'TODO', 'IN_PROGRESS', 'WAITING', 'DONE', 'ARCHIVED'] as const
const ESTADO_LABELS: Record<string, string> = {
  INBOX: 'Inbox', TODO: 'Por hacer', IN_PROGRESS: 'En progreso',
  WAITING: 'Esperando', DONE: 'Hecho', ARCHIVED: 'Archivado',
}
const PRIORIDADES = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const
const PRIORIDAD_LABELS: Record<string, string> = {
  NONE: 'Sin prioridad', LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente',
}
const TABS = ['Descripción', 'Adjuntos', 'Actividad'] as const

function priorityChipStyle(p: string, active: boolean) {
  if (!active) return { bg: 'var(--elevated)', border: 'var(--border)', color: 'var(--text-muted)' }
  if (p === 'URGENT') return { bg: 'var(--urgent)', border: 'var(--urgent)', color: '#13141f' }
  if (p === 'HIGH') return { bg: 'var(--high)', border: 'var(--high)', color: '#13141f' }
  if (p === 'MEDIUM') return { bg: 'var(--accent-blue)', border: 'var(--accent-blue)', color: '#13141f' }
  return { bg: 'var(--accent)', border: 'var(--accent)', color: '#13141f' }
}

function formatDate(d: Date | string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(d: Date | string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

interface Props {
  item: ItemWithRelations
}

export function ItemDetail({ item: initialItem }: Props) {
  const [item, setItem] = useState(initialItem)
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Descripción')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function updateField(data: Record<string, unknown>) {
    setSaving(true)
    const res = await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setItem(prev => ({ ...prev, ...updated }))
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--surface)' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
          <h2 style={{ flex: 1, fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
            {item.titulo}
          </h2>
          {saving && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: "'DM Mono', monospace" }}>guardando…</span>}
        </div>

        {/* Estado chips */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
          {ESTADOS.map(e => (
            <button
              key={e}
              onClick={() => updateField({ estado: e })}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: item.estado === e ? 600 : 500,
                cursor: 'pointer', transition: 'all 0.15s', border: '1px solid',
                fontFamily: "'Outfit', sans-serif",
                background: item.estado === e ? 'var(--accent)' : 'var(--elevated)',
                borderColor: item.estado === e ? 'var(--accent)' : 'var(--border)',
                color: item.estado === e ? '#13141f' : 'var(--text-muted)',
              }}
            >
              {ESTADO_LABELS[e]}
            </button>
          ))}
        </div>

        {/* Prioridad chips */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {PRIORIDADES.filter(p => p !== 'NONE' && p !== 'LOW').map(p => {
            const active = item.prioridad === p
            const s = priorityChipStyle(p, active)
            return (
              <button
                key={p}
                onClick={() => updateField({ prioridad: p })}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: active ? 600 : 500,
                  cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${s.border}`,
                  fontFamily: "'Outfit', sans-serif", background: s.bg, color: s.color,
                }}
              >
                {PRIORIDAD_LABELS[p]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif", background: 'none', border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {activeTab === 'Descripción' && (
          <>
            {/* Content */}
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                Descripción
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.65 }}>
                {item.contenido || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Sin descripción</span>}
              </div>
            </div>

            {/* Fechas */}
            {(item.fechaLimite || item.fechaRecordatorio) && (
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Fechas
                </div>
                {item.fechaLimite && (
                  <div style={{ fontSize: 12, color: 'var(--text-sub)', marginBottom: 4, display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Límite:</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{formatDate(item.fechaLimite)}</span>
                  </div>
                )}
                {item.fechaRecordatorio && (
                  <div style={{ fontSize: 12, color: 'var(--text-sub)', display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Recordatorio:</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{formatDate(item.fechaRecordatorio)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Nexus analysis */}
            {item.notasAgente && (
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Análisis IA
                </div>
                <div style={{
                  background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)',
                  borderLeft: '3px solid var(--accent-purple)', borderRadius: '0 10px 10px 0',
                  padding: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
                      color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <SparkleIcon size={10} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-purple)', letterSpacing: '0.04em' }}>
                      Nexus · Análisis
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.6 }}>{item.notasAgente}</div>
                </div>
              </div>
            )}

            {/* Proyecto */}
            {item.proyecto && (
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Proyecto
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.proyecto.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-sub)' }}>{item.proyecto.nombre}</span>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'Adjuntos' && (
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              Adjuntos ({item.adjuntos.length})
            </div>
            {item.adjuntos.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin adjuntos</div>
            ) : item.adjuntos.map(adj => (
              <a
                key={adj.id}
                href={adj.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                  background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 8,
                  marginBottom: 6, cursor: 'pointer', textDecoration: 'none', transition: 'border-color 0.15s',
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(248,113,113,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                  📄
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adj.nombre}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                    {(adj.tamanio / 1024).toFixed(0)} KB
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </a>
            ))}
          </div>
        )}

        {activeTab === 'Actividad' && (
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              Actividad
            </div>
            {item.actividad.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin actividad registrada</div>
            ) : item.actividad.map(act => (
              <div key={act.id} style={{ display: 'flex', gap: 9, marginBottom: 12 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 1,
                  ...(act.autor === 'agente'
                    ? { background: 'rgba(47,212,170,0.1)', border: '1px solid rgba(47,212,170,0.2)', color: 'var(--accent)' }
                    : { background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: 'var(--accent-purple)' }),
                }}>
                  {act.autor === 'agente' ? <SparkleIcon size={10} /> : act.autor.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11.5, color: 'var(--text-sub)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text)', fontWeight: 500 }}>
                      {act.autor === 'agente' ? 'Nexus' : act.autor}
                    </strong>
                    {' '}
                    {act.descripcion}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: "'DM Mono', monospace" }}>
                    {formatTime(act.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
