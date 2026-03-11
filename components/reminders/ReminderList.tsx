'use client'

import { useState } from 'react'

interface RecordatorioData {
  id: string
  mensaje: string
  proximoDisparo: string | Date
  activo: boolean
  tipoRecurrencia: string
  seguimiento?: { id: string; titulo: string } | null
  item?: { id: string; titulo: string } | null
}

const recurrenciaLabel: Record<string, string> = {
  UNA_VEZ: 'Una vez', DIARIO: 'Diario', CADA_N_DIAS: 'Cada N días', SEMANAL: 'Semanal',
}

export function ReminderList({ recordatorios: initial }: { recordatorios: RecordatorioData[] }) {
  const [items, setItems] = useState(initial)

  async function handleDismiss(id: string) {
    await fetch(`/api/recordatorios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: false }),
    })
    setItems(prev => prev.filter(r => r.id !== id))
  }

  async function handleDelete(id: string) {
    await fetch(`/api/recordatorios/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(r => r.id !== id))
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>
        No hay recordatorios activos
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((rec, i) => {
        const isOverdue = new Date(rec.proximoDisparo) < new Date()
        return (
          <div key={rec.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 8,
            background: isOverdue ? 'rgba(248,113,113,0.06)' : 'var(--elevated)',
            border: `1px solid ${isOverdue ? 'rgba(248,113,113,0.15)' : 'var(--border)'}`,
            animation: `fade-up 0.3s ease ${i * 0.04}s both`,
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>🔔</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500 }}>{rec.mensaje}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                <span style={{ fontFamily: "'DM Mono', monospace" }}>
                  {new Date(rec.proximoDisparo).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{
                  padding: '0 5px', borderRadius: 10,
                  background: 'var(--card)', fontSize: 9.5,
                }}>
                  {recurrenciaLabel[rec.tipoRecurrencia] ?? rec.tipoRecurrencia}
                </span>
                {rec.seguimiento && (
                  <span style={{ color: 'var(--accent-purple)' }}>→ {rec.seguimiento.titulo}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDismiss(rec.id)}
              title="Pausar"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--text-muted)', padding: '2px 6px',
              }}
            >
              ⏸
            </button>
            <button
              onClick={() => handleDelete(rec.id)}
              title="Eliminar"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--text-muted)', padding: '2px 6px',
              }}
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
