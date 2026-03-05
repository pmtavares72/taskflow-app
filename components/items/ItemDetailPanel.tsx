'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ItemWithRelations } from '@/types'

const TIPOS = [
  { value: 'TASK', label: 'Tarea', icon: '✓' },
  { value: 'IDEA', label: 'Idea', icon: '💡' },
  { value: 'NOTE', label: 'Nota', icon: '📝' },
  { value: 'LINK', label: 'Enlace', icon: '🔗' },
  { value: 'EMAIL', label: 'Email', icon: '✉' },
]

const PRIORITIES = [
  { value: 'NONE', label: 'Sin prioridad', color: 'var(--text-muted)', dot: '#555' },
  { value: 'LOW', label: 'Baja', color: 'var(--text-muted)', dot: '#6b7280' },
  { value: 'MEDIUM', label: 'Media', color: 'var(--accent-blue)', dot: '#60a5fa' },
  { value: 'HIGH', label: 'Alta', color: 'var(--high)', dot: '#fb923c' },
  { value: 'URGENT', label: 'Urgente', color: 'var(--urgent)', dot: '#f87171' },
]

const CONTEXTS = [
  { value: 'TRABAJO', label: 'Trabajo' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'AMBOS', label: 'Ambos' },
]

const STATES = [
  { value: 'INBOX', label: 'Inbox' },
  { value: 'TODO', label: 'Por hacer' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'WAITING', label: 'Esperando' },
  { value: 'DONE', label: 'Hecho' },
]

interface Project { id: string; nombre: string; color: string }

interface Props {
  item: ItemWithRelations
  onClose: () => void
  onUpdate?: (updated: Partial<ItemWithRelations>) => void
}

export function ItemDetailPanel({ item, onClose, onUpdate }: Props) {
  const router = useRouter()
  const [titulo, setTitulo] = useState(item.titulo)
  const [tipo, setTipo] = useState(item.tipo)
  const [contenido, setContenido] = useState(item.contenido ?? '')
  const [prioridad, setPrioridad] = useState(item.prioridad)
  const [estado, setEstado] = useState(item.estado)
  const [contexto, setContexto] = useState(item.contexto)
  const [proyectoId, setProyectoId] = useState(item.proyectoId ?? '')
  const [fechaLimite, setFechaLimite] = useState(
    item.fechaLimite ? new Date(item.fechaLimite).toISOString().split('T')[0] : ''
  )
  const [projects, setProjects] = useState<Project[]>([])
  const [saving, setSaving] = useState(false)

  // Load projects
  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(setProjects).catch(() => {})
  }, [])

  const dirty =
    titulo !== item.titulo ||
    tipo !== item.tipo ||
    contenido !== (item.contenido ?? '') ||
    prioridad !== item.prioridad ||
    estado !== item.estado ||
    contexto !== item.contexto ||
    proyectoId !== (item.proyectoId ?? '') ||
    fechaLimite !== (item.fechaLimite ? new Date(item.fechaLimite).toISOString().split('T')[0] : '')

  async function archive() {
    await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'ARCHIVED' }),
    })
    onUpdate?.({ estado: 'ARCHIVED' })
    router.refresh()
    onClose()
  }

  async function save() {
    if (!dirty) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        titulo,
        tipo,
        contenido: contenido || '',
        prioridad,
        estado,
        contexto,
        proyectoId: proyectoId || null,
        fechaLimite: fechaLimite ? new Date(fechaLimite).toISOString() : null,
      }
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate?.(updated)
        router.refresh()
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  // Save on Cmd/Ctrl+S
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      save()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }, [dirty, titulo, contenido, prioridad, estado, contexto, proyectoId, fechaLimite]) // eslint-disable-line

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const priorityInfo = PRIORITIES.find(p => p.value === prioridad) ?? PRIORITIES[0]
  const proj = projects.find(p => p.id === proyectoId)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 900,
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)',
          animation: 'fade-in 0.15s ease both',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 901,
        width: '100%', maxWidth: 480,
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-24px 0 60px rgba(0,0,0,0.4)',
        animation: 'slide-in-right 0.25s cubic-bezier(0.16,1,0.3,1) both',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              background: 'var(--elevated)', border: '1px solid var(--border)',
              padding: '2px 8px', borderRadius: 20,
            }}>
              {item.tipo}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {dirty && (
              <button
                onClick={save}
                disabled={saving}
                style={{
                  padding: '5px 14px', borderRadius: 7, border: 'none',
                  background: '#a5b4fc', color: '#13141f', cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600,
                  boxShadow: '0 0 12px rgba(165,180,252,0.25)',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)',
                background: 'var(--elevated)', color: 'var(--text-muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, lineHeight: 1,
              }}
            >×</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>

          {/* Title */}
          <textarea
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            rows={2}
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              fontSize: 17, fontWeight: 700, color: 'var(--text)', resize: 'none',
              fontFamily: "'Outfit', sans-serif", lineHeight: 1.35, marginBottom: 20,
              padding: 0,
            }}
            placeholder="Título de la tarea..."
          />

          {/* Meta fields grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>

            {/* Tipo */}
            <MetaRow label="Tipo">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TIPOS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTipo(t.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
                      fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 500,
                      border: `1px solid ${tipo === t.value ? 'rgba(165,180,252,0.4)' : 'var(--border)'}`,
                      background: tipo === t.value ? 'rgba(165,180,252,0.1)' : 'var(--elevated)',
                      color: tipo === t.value ? '#a5b4fc' : 'var(--text-muted)',
                      transition: 'all 0.12s',
                    }}
                  >
                    <span style={{ fontSize: 11 }}>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </MetaRow>

            {/* Priority */}
            <MetaRow label="Prioridad">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPrioridad(p.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
                      fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 500,
                      border: `1px solid ${prioridad === p.value ? p.dot : 'var(--border)'}`,
                      background: prioridad === p.value ? `${p.dot}18` : 'var(--elevated)',
                      color: prioridad === p.value ? p.dot : 'var(--text-muted)',
                      transition: 'all 0.12s',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </MetaRow>

            {/* Estado */}
            <MetaRow label="Estado">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STATES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setEstado(s.value)}
                    style={{
                      padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
                      fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 500,
                      border: `1px solid ${estado === s.value ? 'var(--accent)' : 'var(--border)'}`,
                      background: estado === s.value ? 'rgba(47,212,170,0.1)' : 'var(--elevated)',
                      color: estado === s.value ? 'var(--accent)' : 'var(--text-muted)',
                      transition: 'all 0.12s',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </MetaRow>

            {/* Project */}
            <MetaRow label="Proyecto">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setProyectoId('')}
                  style={{
                    padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 500,
                    border: `1px solid ${!proyectoId ? 'var(--border-hover)' : 'var(--border)'}`,
                    background: !proyectoId ? 'var(--elevated)' : 'transparent',
                    color: 'var(--text-muted)', transition: 'all 0.12s',
                  }}
                >
                  Sin proyecto
                </button>
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setProyectoId(p.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
                      fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 500,
                      border: `1px solid ${proyectoId === p.id ? p.color : 'var(--border)'}`,
                      background: proyectoId === p.id ? `${p.color}18` : 'var(--elevated)',
                      color: proyectoId === p.id ? p.color : 'var(--text-muted)',
                      transition: 'all 0.12s',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                    {p.nombre}
                  </button>
                ))}
              </div>
            </MetaRow>

            {/* Fecha límite */}
            <MetaRow label="Fecha límite">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="date"
                  value={fechaLimite}
                  onChange={e => setFechaLimite(e.target.value)}
                  style={{
                    background: 'var(--elevated)', border: '1px solid var(--border)',
                    borderRadius: 7, padding: '4px 10px', color: 'var(--text)',
                    fontFamily: "'Outfit', sans-serif", fontSize: 12, outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
                {fechaLimite && (
                  <button
                    onClick={() => setFechaLimite('')}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-muted)',
                      cursor: 'pointer', fontSize: 13, padding: '0 4px',
                    }}
                  >×</button>
                )}
              </div>
            </MetaRow>

            {/* Contexto */}
            <MetaRow label="Contexto">
              <div style={{ display: 'flex', gap: 6 }}>
                {CONTEXTS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setContexto(c.value)}
                    style={{
                      padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
                      fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 500,
                      border: `1px solid ${contexto === c.value ? 'var(--accent-purple)' : 'var(--border)'}`,
                      background: contexto === c.value ? 'rgba(167,139,250,0.1)' : 'var(--elevated)',
                      color: contexto === c.value ? 'var(--accent-purple)' : 'var(--text-muted)',
                      transition: 'all 0.12s',
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </MetaRow>

          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 20px' }} />

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 10.5, fontWeight: 600,
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 8,
            }}>
              Notas
            </label>
            <textarea
              value={contenido}
              onChange={e => setContenido(e.target.value)}
              rows={5}
              placeholder="Añade notas, contexto, o detalles..."
              style={{
                width: '100%', background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 12px', color: 'var(--text)',
                fontFamily: "'Outfit', sans-serif", fontSize: 13, lineHeight: 1.6,
                resize: 'vertical', outline: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(47,212,170,0.3)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
            />
          </div>

          {/* Activity log */}
          {item.actividad && item.actividad.length > 0 && (
            <div>
              <label style={{
                display: 'block', fontSize: 10.5, fontWeight: 600,
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 8,
              }}>
                Actividad
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {item.actividad.map(act => (
                  <div key={act.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      background: act.autor === 'agente' ? 'rgba(167,139,250,0.15)' : 'rgba(165,180,252,0.1)',
                      border: `1px solid ${act.autor === 'agente' ? 'rgba(167,139,250,0.3)' : 'rgba(165,180,252,0.2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, color: act.autor === 'agente' ? 'var(--accent-purple)' : '#a5b4fc',
                      fontWeight: 700, marginTop: 1,
                    }}>
                      {act.autor === 'agente' ? '✦' : 'PT'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.4 }}>
                        {act.descripcion}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(act.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '10px 16px', borderTop: '1px solid var(--border)',
          fontSize: 10.5, color: 'var(--text-muted)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>⌘S para guardar · Esc para cerrar</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={archive}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 10.5, color: 'var(--text-muted)', padding: 0,
                fontFamily: "'Outfit', sans-serif",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--urgent)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              Archivar
            </button>
            <span style={{ opacity: 0.5 }}>
              {new Date(item.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slide-in-right { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>
    </>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        width: 90, flexShrink: 0, paddingTop: 5,
      }}>
        {label}
      </span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}
