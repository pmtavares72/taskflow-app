'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  nombre: string
  color: string
}

interface Props {
  open: boolean
  onClose: () => void
  initialItemId?: string
}

export function NewSeguimientoModal({ open, onClose, initialItemId }: Props) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [proyectoId, setProyectoId] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      fetch('/api/projects').then(r => r.json()).then(setProjects).catch(() => {})
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/seguimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          descripcion: descripcion || undefined,
          proyectoId: proyectoId || undefined,
          itemIds: initialItemId ? [initialItemId] : [],
        }),
      })
      if (res.ok) {
        const seg = await res.json()
        onClose()
        router.push(`/seguimientos/${seg.id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(13,14,31,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
        animation: 'fade-up 0.15s ease both',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%', maxWidth: 480, background: 'var(--surface)',
          border: '1px solid rgba(167,139,250,0.2)', borderRadius: 16,
          overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          animation: 'fade-up 0.2s ease both',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            Nuevo Seguimiento
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Nombre del tema a seguir..."
            autoFocus
            style={{
              width: '100%', background: 'var(--elevated)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 14px', fontSize: 14,
              fontFamily: "'Outfit', sans-serif", color: 'var(--text)', outline: 'none',
            }}
          />

          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Descripción / contexto inicial (opcional)"
            rows={3}
            style={{
              width: '100%', background: 'var(--elevated)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 14px', fontSize: 12.5, lineHeight: 1.55,
              fontFamily: "'Outfit', sans-serif", color: 'var(--text)', outline: 'none',
              resize: 'vertical',
            }}
          />

          {/* Project selector */}
          <select
            value={proyectoId}
            onChange={e => setProyectoId(e.target.value)}
            style={{
              width: '100%', background: 'var(--elevated)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 12px', fontSize: 12.5,
              fontFamily: "'Outfit', sans-serif", color: 'var(--text)', outline: 'none',
            }}
          >
            <option value="">Sin proyecto</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div style={{
          padding: '12px 18px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)',
              fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600,
              cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !titulo.trim()}
            style={{
              padding: '7px 18px', borderRadius: 8, border: 'none',
              fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600,
              cursor: 'pointer', background: '#a5b4fc', color: '#13141f',
              boxShadow: '0 0 10px rgba(165,180,252,0.2)',
              opacity: loading || !titulo.trim() ? 0.5 : 1,
            }}
          >
            {loading ? 'Creando...' : 'Crear seguimiento'}
          </button>
        </div>
      </form>
    </div>
  )
}
