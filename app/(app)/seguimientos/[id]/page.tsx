'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ContextInput } from '@/components/context/ContextInput'
import { ContextEntry } from '@/components/context/ContextEntry'
import { ReminderInput } from '@/components/reminders/ReminderInput'
import { ReminderList } from '@/components/reminders/ReminderList'
import { SparkleIcon } from '@/components/ui/SparkleIcon'

type SeguimientoDetail = {
  id: string; titulo: string; descripcion: string | null; estado: string
  prioridad: string; contexto: string; ultimaActividad: string
  proximaRevision: string | null; createdAt: string
  proyecto: { id: string; nombre: string; color: string } | null
  items: { id: string; item: { id: string; titulo: string; estado: string; prioridad: string; tipo: string; fechaLimite: string | null } }[]
  entradas: { id: string; tipo: string; titulo: string; contenido: string; resumen: string | null; metadatos: Record<string, unknown> | null; createdAt: string }[]
  recordatorios: { id: string; mensaje: string; proximoDisparo: string; activo: boolean; tipoRecurrencia: string }[]
  feedEntries: { id: string; tipo: string; titulo: string; descripcion: string; createdAt: string }[]
  _count: { items: number; entradas: number }
}

const estadoLabels: Record<string, { label: string; color: string }> = {
  ACTIVO: { label: 'Activo', color: 'var(--accent)' },
  EN_ESPERA: { label: 'En espera', color: 'var(--accent-blue)' },
  NECESITA_ATENCION: { label: 'Necesita atención', color: 'var(--accent-orange)' },
  COMPLETADO: { label: 'Completado', color: 'var(--text-muted)' },
  ARCHIVADO: { label: 'Archivado', color: 'var(--text-muted)' },
}

const TABS = ['timeline', 'items', 'recordatorios', 'nexus'] as const

export default function SeguimientoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<SeguimientoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<typeof TABS[number]>('timeline')
  const [showContextInput, setShowContextInput] = useState(false)

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/seguimientos/${id}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleStatusChange(estado: string) {
    await fetch(`/api/seguimientos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    fetchData()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No encontrado</div>

  const est = estadoLabels[data.estado] ?? estadoLabels.ACTIVO

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
      {/* Header */}
      <div style={{ padding: '18px 0 14px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        <button
          onClick={() => router.push('/seguimientos')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: 'var(--text-muted)', marginBottom: 8,
            fontFamily: "'Outfit', sans-serif", padding: 0, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          ← Seguimientos
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
              {data.titulo}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10.5, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                background: `${est.color}15`, border: `1px solid ${est.color}30`, color: est.color,
              }}>
                {est.label}
              </span>
              {data.proyecto && (
                <span style={{
                  fontSize: 10.5, padding: '2px 8px', borderRadius: 20,
                  background: `${data.proyecto.color}18`, color: data.proyecto.color,
                }}>
                  {data.proyecto.nombre}
                </span>
              )}
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                {data._count.items} items · {data._count.entradas} entradas
              </span>
            </div>
            {data.descripcion && (
              <p style={{ fontSize: 12.5, color: 'var(--text-sub)', lineHeight: 1.55, marginTop: 6 }}>
                {data.descripcion}
              </p>
            )}
          </div>

          {/* Status actions */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {data.estado !== 'COMPLETADO' && (
              <button
                onClick={() => handleStatusChange('COMPLETADO')}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(47,212,170,0.2)',
                  background: 'rgba(47,212,170,0.08)', fontSize: 11, fontWeight: 600,
                  color: 'var(--accent)', cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                }}
              >
                ✓ Completar
              </button>
            )}
            {data.estado === 'ACTIVO' && (
              <button
                onClick={() => handleStatusChange('EN_ESPERA')}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', fontSize: 11, fontWeight: 600,
                  color: 'var(--text-muted)', cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                }}
              >
                Pausar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[
          { key: 'timeline', label: 'Timeline', count: data.entradas.length },
          { key: 'items', label: 'Items', count: data.items.length },
          { key: 'recordatorios', label: 'Recordatorios', count: data.recordatorios.filter(r => r.activo).length },
          { key: 'nexus', label: 'Nexus', count: data.feedEntries.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof TABS[number])}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600,
              background: tab === t.key ? 'var(--accent)' : 'var(--card)',
              color: tab === t.key ? '#13141f' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span style={{
                marginLeft: 5, background: tab === t.key ? 'rgba(255,255,255,0.2)' : 'var(--elevated)',
                borderRadius: 10, padding: '1px 5px', fontSize: 10,
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'timeline' && (
        <div>
          {/* Add context button */}
          <div style={{ marginBottom: 16 }}>
            {showContextInput ? (
              <ContextInput
                seguimientoId={data.id}
                onCreated={() => { setShowContextInput(false); fetchData() }}
                onCancel={() => setShowContextInput(false)}
              />
            ) : (
              <button
                onClick={() => setShowContextInput(true)}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 10,
                  background: 'var(--card)', border: '1px dashed rgba(167,139,250,0.25)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: "'Outfit', sans-serif", fontSize: 13, color: 'var(--accent-purple)',
                  transition: 'all 0.15s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Añadir contexto (email, notas de reunión, etc.)
              </button>
            )}
          </div>

          {/* Timeline entries */}
          {data.entradas.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13,
            }}>
              Sin entradas de contexto. Pega un email o notas de reunión para que Nexus analice.
            </div>
          ) : (
            data.entradas.map((entrada, i) => (
              <ContextEntry key={entrada.id} data={entrada} index={i} />
            ))
          )}
        </div>
      )}

      {tab === 'items' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
              No hay items vinculados a este seguimiento
            </div>
          ) : (
            data.items.map(({ item }, i) => {
              const prioColors: Record<string, string> = { URGENT: 'var(--urgent)', HIGH: 'var(--accent-orange)', MEDIUM: 'var(--accent-blue)', LOW: 'var(--text-muted)' }
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(`/items/${item.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 14px', borderRadius: 10, background: 'var(--card)',
                    border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
                    animation: `fade-up 0.3s ease ${i * 0.04}s both`,
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: prioColors[item.prioridad] ?? 'var(--border)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: 'var(--text)', flex: 1, fontFamily: "'Outfit', sans-serif" }}>{item.titulo}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 6,
                    background: 'var(--elevated)', color: 'var(--text-muted)',
                  }}>
                    {item.estado.replace('_', ' ')}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}

      {tab === 'recordatorios' && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <ReminderInput seguimientoId={data.id} onCreated={() => fetchData()} />
          </div>
          <ReminderList recordatorios={data.recordatorios.filter(r => r.activo)} />
        </div>
      )}

      {tab === 'nexus' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.feedEntries.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px',
              gap: 10, textAlign: 'center',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
                color: 'var(--accent-purple)',
              }}>
                <SparkleIcon size={16} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Nexus aún no ha generado observaciones para este seguimiento
              </div>
            </div>
          ) : (
            data.feedEntries.map((entry, i) => (
              <div key={entry.id} style={{
                padding: '10px 14px', borderRadius: 10, background: 'var(--card)',
                border: '1px solid var(--border)',
                animation: `fade-up 0.3s ease ${i * 0.04}s both`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent-purple)',
                  }}>
                    <SparkleIcon size={9} />
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--accent-purple)' }}>Nexus</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", marginLeft: 'auto' }}>
                    {new Date(entry.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{entry.titulo}</div>
                <div style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.5 }}>{entry.descripcion}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
