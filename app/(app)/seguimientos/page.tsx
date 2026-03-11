'use client'

import { useState, useEffect, useCallback } from 'react'
import { SeguimientoCard } from '@/components/seguimientos/SeguimientoCard'
import { NewSeguimientoModal } from '@/components/seguimientos/NewSeguimientoModal'
import { ReminderInput } from '@/components/reminders/ReminderInput'
import { ReminderList } from '@/components/reminders/ReminderList'

type SeguimientoData = {
  id: string; titulo: string; estado: string; prioridad: string
  ultimaActividad: string; proyecto: { id: string; nombre: string; color: string } | null
  _count: { items: number; entradas: number }
  recordatorios: { id: string; proximoDisparo: string; activo: boolean; tipoRecurrencia: string; mensaje: string }[]
}

type RecordatorioData = {
  id: string; mensaje: string; proximoDisparo: string; activo: boolean; tipoRecurrencia: string
  seguimiento?: { id: string; titulo: string } | null; item?: { id: string; titulo: string } | null
}

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'ACTIVO', label: 'Activos' },
  { key: 'NECESITA_ATENCION', label: 'Atención' },
  { key: 'EN_ESPERA', label: 'En espera' },
  { key: 'COMPLETADO', label: 'Completados' },
] as const

export default function SeguimientosPage() {
  const [seguimientos, setSeguimientos] = useState<SeguimientoData[]>([])
  const [recordatorios, setRecordatorios] = useState<RecordatorioData[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [segRes, recRes] = await Promise.all([
        fetch(filter === 'all' ? '/api/seguimientos' : `/api/seguimientos?estado=${filter}`),
        fetch('/api/recordatorios'),
      ])
      if (segRes.ok) setSeguimientos(await segRes.json())
      if (recRes.ok) setRecordatorios(await recRes.json())
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchData() }, [fetchData])

  const needsAttention = seguimientos.filter(s => s.estado === 'NECESITA_ATENCION').length
  const active = seguimientos.filter(s => s.estado === 'ACTIVO').length

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
        padding: '18px 0 12px', borderBottom: '1px solid var(--border)', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
              Seguimientos
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Nexus sigue estos temas por ti y te recuerda cuando hay novedades
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600,
              cursor: 'pointer', background: '#a5b4fc', color: '#13141f',
              boxShadow: '0 0 16px rgba(165,180,252,0.2)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#13141f" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo seguimiento
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{
            padding: '8px 14px', borderRadius: 10, background: 'rgba(47,212,170,0.06)',
            border: '1px solid rgba(47,212,170,0.12)', fontSize: 12, color: 'var(--accent)',
          }}>
            <span style={{ fontWeight: 700, fontSize: 16, marginRight: 4 }}>{active}</span> activos
          </div>
          {needsAttention > 0 && (
            <div style={{
              padding: '8px 14px', borderRadius: 10, background: 'rgba(251,146,60,0.08)',
              border: '1px solid rgba(251,146,60,0.15)', fontSize: 12, color: 'var(--accent-orange)',
            }}>
              <span style={{ fontWeight: 700, fontSize: 16, marginRight: 4 }}>{needsAttention}</span> necesitan atención
            </div>
          )}
          <div style={{
            padding: '8px 14px', borderRadius: 10, background: 'rgba(165,180,252,0.06)',
            border: '1px solid rgba(165,180,252,0.12)', fontSize: 12, color: 'var(--accent-purple)',
          }}>
            <span style={{ fontWeight: 700, fontSize: 16, marginRight: 4 }}>{recordatorios.length}</span> recordatorios
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif", fontSize: 11.5, fontWeight: 600,
                background: filter === f.key ? 'var(--accent)' : 'var(--card)',
                color: filter === f.key ? '#13141f' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              {f.label}
              {f.key === 'NECESITA_ATENCION' && needsAttention > 0 && (
                <span style={{ marginLeft: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '1px 5px', fontSize: 10 }}>
                  {needsAttention}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout on desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}
        className="seguimientos-grid"
      >
        {/* Main: seguimiento cards */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Cargando...
            </div>
          ) : seguimientos.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px',
              gap: 12, textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 4 }}>📌</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Sin seguimientos</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 280, lineHeight: 1.5 }}>
                Crea un seguimiento para que Nexus monitoree un tema, te recuerde y te mantenga al día.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {seguimientos.map((seg, i) => (
                <SeguimientoCard key={seg.id} data={seg} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: reminders */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
          padding: 14, position: 'sticky', top: 160,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Recordatorios
          </div>
          <ReminderInput onCreated={() => fetchData()} />
          <div style={{ marginTop: 12 }}>
            <ReminderList recordatorios={recordatorios} />
          </div>
        </div>
      </div>

      <NewSeguimientoModal open={showNew} onClose={() => { setShowNew(false); fetchData() }} />

      <style>{`
        @media (max-width: 900px) {
          .seguimientos-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
