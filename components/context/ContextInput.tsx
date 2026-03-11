'use client'

import { useState } from 'react'

const TIPOS = [
  { value: 'EMAIL', label: 'Email', icon: '✉' },
  { value: 'NOTAS_REUNION', label: 'Notas reunión', icon: '📋' },
  { value: 'CONVERSACION', label: 'Conversación', icon: '💬' },
  { value: 'DOCUMENTO', label: 'Documento', icon: '📄' },
  { value: 'NOTA_LIBRE', label: 'Nota libre', icon: '📝' },
] as const

interface Props {
  seguimientoId?: string
  itemId?: string
  onCreated?: (entrada: Record<string, unknown>) => void
  onCancel?: () => void
}

export function ContextInput({ seguimientoId, itemId, onCreated, onCancel }: Props) {
  const [tipo, setTipo] = useState<string>('EMAIL')
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim() || !contenido.trim()) return

    setLoading(true)
    try {
      const url = seguimientoId
        ? `/api/seguimientos/${seguimientoId}/entradas`
        : '/api/entradas'

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, titulo, contenido, seguimientoId, itemId }),
      })

      if (res.ok) {
        const entrada = await res.json()
        setProcessing(true)
        setTitulo('')
        setContenido('')
        onCreated?.(entrada)
        // Show processing state briefly
        setTimeout(() => setProcessing(false), 3000)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--card)', border: '1px solid rgba(167,139,250,0.15)',
      borderRadius: 12, overflow: 'hidden',
      animation: 'fade-up 0.3s ease both',
    }}>
      <div style={{ padding: '14px 14px 0' }}>
        {/* Type selector */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
          {TIPOS.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTipo(t.value)}
              style={{
                padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 500,
                background: tipo === t.value ? 'rgba(167,139,250,0.15)' : 'var(--elevated)',
                color: tipo === t.value ? 'var(--accent-purple)' : 'var(--text-muted)',
                border: tipo === t.value ? '1px solid rgba(167,139,250,0.25)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Title */}
        <input
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          placeholder="Título (ej: Email de Juan sobre propuesta)"
          style={{
            width: '100%', background: 'var(--elevated)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 12px', fontSize: 13,
            fontFamily: "'Outfit', sans-serif", color: 'var(--text)', outline: 'none',
            marginBottom: 8,
          }}
        />

        {/* Content textarea */}
        <textarea
          value={contenido}
          onChange={e => setContenido(e.target.value)}
          placeholder="Pega aquí el contenido del email, notas de reunión, etc..."
          rows={8}
          style={{
            width: '100%', background: 'var(--elevated)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.55,
            fontFamily: "'Outfit', sans-serif", color: 'var(--text)', outline: 'none',
            resize: 'vertical', minHeight: 120,
          }}
        />
      </div>

      {/* Processing indicator */}
      {processing && (
        <div style={{
          margin: '0 14px', padding: '8px 12px', borderRadius: 8,
          background: 'rgba(47,212,170,0.08)', border: '1px solid rgba(47,212,170,0.15)',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: 'var(--accent)',
          animation: 'fade-up 0.2s ease both',
        }}>
          <div style={{
            width: 14, height: 14, border: '2px solid var(--border)',
            borderTopColor: 'var(--accent)', borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
          Nexus está analizando el contenido...
        </div>
      )}

      {/* Actions */}
      <div style={{
        padding: '10px 14px', display: 'flex', gap: 8, justifyContent: 'flex-end',
        borderTop: '1px solid var(--border)', marginTop: 10,
      }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
              fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600,
              cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)',
            }}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading || !titulo.trim() || !contenido.trim()}
          style={{
            padding: '6px 16px', borderRadius: 8, border: 'none',
            fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600,
            cursor: 'pointer', background: '#a5b4fc', color: '#13141f',
            boxShadow: '0 0 10px rgba(165,180,252,0.2)',
            opacity: loading || !titulo.trim() || !contenido.trim() ? 0.5 : 1,
          }}
        >
          {loading ? 'Guardando...' : 'Añadir contexto'}
        </button>
      </div>
    </form>
  )
}
