'use client'

import { useState } from 'react'

interface Props {
  seguimientoId?: string
  itemId?: string
  onCreated?: (rec: Record<string, unknown>) => void
}

export function ReminderInput({ seguimientoId, itemId, onCreated }: Props) {
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ mensaje: string; proximoDisparo: string; tipoRecurrencia: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mensaje.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/recordatorios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje, seguimientoId, itemId }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult({
          mensaje: data.mensaje,
          proximoDisparo: data.proximoDisparo,
          tipoRecurrencia: data.tipoRecurrencia,
        })
        setMensaje('')
        onCreated?.(data)
        setTimeout(() => setResult(null), 4000)
      }
    } finally {
      setLoading(false)
    }
  }

  const recurrenciaLabel: Record<string, string> = {
    UNA_VEZ: 'Una vez', DIARIO: 'Diario', CADA_N_DIAS: 'Recurrente', SEMANAL: 'Semanal', PERSONALIZADO: 'Personalizado',
  }

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13 }}>🔔</span>
          <input
            value={mensaje}
            onChange={e => setMensaje(e.target.value)}
            placeholder='Ej: "recuérdame el martes" o "cada 3 días pregúntame"'
            style={{
              width: '100%', background: 'var(--elevated)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 12px 8px 32px', fontSize: 12.5,
              fontFamily: "'Outfit', sans-serif", color: 'var(--text)', outline: 'none',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !mensaje.trim()}
          style={{
            padding: '8px 14px', borderRadius: 8, border: 'none',
            fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600,
            cursor: 'pointer', background: '#a5b4fc', color: '#13141f',
            opacity: loading || !mensaje.trim() ? 0.5 : 1, flexShrink: 0,
          }}
        >
          {loading ? '...' : 'Crear'}
        </button>
      </form>

      {/* Success confirmation */}
      {result && (
        <div style={{
          marginTop: 8, padding: '8px 12px', borderRadius: 8,
          background: 'rgba(47,212,170,0.08)', border: '1px solid rgba(47,212,170,0.15)',
          fontSize: 11.5, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fade-up 0.2s ease both',
        }}>
          <span>✓</span>
          <span>
            Recordatorio creado: {result.mensaje} — {new Date(result.proximoDisparo).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {result.tipoRecurrencia !== 'UNA_VEZ' && ` (${recurrenciaLabel[result.tipoRecurrencia] ?? result.tipoRecurrencia})`}
          </span>
        </div>
      )}
    </div>
  )
}
