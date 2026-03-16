'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface SearchItem {
  id: string
  titulo: string
  tipo: string
  estado: string
  prioridad: string
  proyecto: { id: string; nombre: string; color: string } | null
}

interface SearchProject {
  id: string
  nombre: string
  color: string
  estado: string
}

interface SearchSeguimiento {
  id: string
  titulo: string
  estado: string
  prioridad: string
  _count: { items: number; entradas: number }
}

interface SearchContacto {
  id: string
  nombre: string
  email: string | null
  empresa: string | null
  cargo: string | null
}

interface SearchResults {
  items: SearchItem[]
  projects: SearchProject[]
  seguimientos: SearchSeguimiento[]
  contactos: SearchContacto[]
}

type ResultEntry =
  | { type: 'item'; id: string; label: string; sublabel?: string; icon: string; color?: string }
  | { type: 'project'; id: string; label: string; sublabel?: string; icon: string; color?: string }
  | { type: 'seguimiento'; id: string; label: string; sublabel?: string; icon: string; color?: string }
  | { type: 'contacto'; id: string; label: string; sublabel?: string; icon: string; color?: string }

function tipoIcon(tipo: string) {
  const icons: Record<string, string> = {
    TASK: '✓', NOTE: '📝', LINK: '🔗', FILE: '📎', EMAIL: '✉', IDEA: '💡',
  }
  return icons[tipo] ?? '·'
}

function priorityDot(p: string) {
  const colors: Record<string, string> = {
    URGENT: 'var(--urgent)', HIGH: 'var(--accent-orange)',
    MEDIUM: 'var(--accent-blue)', LOW: 'var(--text-muted)', NONE: 'var(--border)',
  }
  return colors[p] ?? 'var(--border)'
}

function estadoSeguimientoColor(estado: string) {
  const colors: Record<string, string> = {
    ACTIVO: 'var(--accent)', EN_ESPERA: 'var(--accent-orange)',
    NECESITA_ATENCION: 'var(--urgent)', COMPLETADO: 'var(--text-muted)',
  }
  return colors[estado] ?? 'var(--text-muted)'
}

export function SearchOverlay() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ items: [], projects: [], seguimientos: [], contactos: [] })
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Flatten all results into a single navigable list
  const allResults: ResultEntry[] = [
    ...results.items.map(i => ({
      type: 'item' as const, id: i.id,
      label: i.titulo,
      sublabel: i.proyecto?.nombre,
      icon: tipoIcon(i.tipo),
      color: priorityDot(i.prioridad),
    })),
    ...results.seguimientos.map(s => ({
      type: 'seguimiento' as const, id: s.id,
      label: s.titulo,
      sublabel: `${s._count.items} tareas · ${s._count.entradas} entradas`,
      icon: '📌',
      color: estadoSeguimientoColor(s.estado),
    })),
    ...results.contactos.map(c => ({
      type: 'contacto' as const, id: c.id,
      label: c.nombre,
      sublabel: [c.cargo, c.empresa].filter(Boolean).join(' · ') || c.email || undefined,
      icon: '👤',
    })),
    ...results.projects.map(p => ({
      type: 'project' as const, id: p.id,
      label: p.nombre,
      icon: '●',
      color: p.color,
    })),
  ]

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults({ items: [], projects: [], seguimientos: [], contactos: [] }); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      if (res.ok) setResults(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200)
    return () => clearTimeout(timer)
  }, [query, search])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults({ items: [], projects: [], seguimientos: [], contactos: [] })
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  function navigate(result: ResultEntry) {
    setOpen(false)
    switch (result.type) {
      case 'item': router.push(`/items/${result.id}`); break
      case 'project': router.push(`/kanban?proyecto=${result.id}`); break
      case 'seguimiento': router.push(`/seguimientos/${result.id}`); break
      case 'contacto': router.push(`/contactos?q=${encodeURIComponent(result.label)}`); break
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, allResults.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && allResults[selectedIdx]) navigate(allResults[selectedIdx])
  }

  if (!open) return null

  // Build sections with their offsets for rendering
  const sections: { title: string; entries: ResultEntry[]; startIdx: number }[] = []
  let offset = 0
  if (results.items.length > 0) {
    sections.push({ title: 'Tareas y notas', entries: allResults.slice(offset, offset + results.items.length), startIdx: offset })
    offset += results.items.length
  }
  if (results.seguimientos.length > 0) {
    sections.push({ title: 'Seguimientos', entries: allResults.slice(offset, offset + results.seguimientos.length), startIdx: offset })
    offset += results.seguimientos.length
  }
  if (results.contactos.length > 0) {
    sections.push({ title: 'Contactos', entries: allResults.slice(offset, offset + results.contactos.length), startIdx: offset })
    offset += results.contactos.length
  }
  if (results.projects.length > 0) {
    sections.push({ title: 'Proyectos', entries: allResults.slice(offset, offset + results.projects.length), startIdx: offset })
    offset += results.projects.length
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(13,14,31,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
        animation: 'fade-up 0.15s ease both',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 560, background: 'var(--surface)',
        border: '1px solid rgba(167,139,250,0.2)', borderRadius: 16,
        overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        animation: 'fade-up 0.2s ease both',
      }}>
        {/* Input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar tareas, seguimientos, contactos, proyectos..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontFamily: "'Outfit', sans-serif", fontSize: 15, color: 'var(--text)',
            }}
          />
          {loading && (
            <div style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          )}
          <kbd style={{
            fontSize: 10, color: 'var(--text-muted)', background: 'var(--card)',
            border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px',
          }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {query.length < 2 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Escribe para buscar...
            </div>
          ) : allResults.length === 0 && !loading ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          ) : (
            sections.map(section => (
              <div key={section.title}>
                <div style={{
                  padding: '8px 16px 4px', fontSize: 10.5, fontWeight: 600,
                  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {section.title}
                </div>
                {section.entries.map((entry, i) => {
                  const globalIdx = section.startIdx + i
                  return (
                    <button
                      key={`${entry.type}-${entry.id}`}
                      onClick={() => navigate(entry)}
                      onMouseEnter={() => setSelectedIdx(globalIdx)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                        background: selectedIdx === globalIdx ? 'rgba(167,139,250,0.08)' : 'transparent',
                        borderLeft: selectedIdx === globalIdx ? '2px solid var(--accent-purple)' : '2px solid transparent',
                        transition: 'all 0.1s',
                      }}
                    >
                      {entry.type === 'item' ? (
                        <>
                          <span style={{ fontSize: 13, flexShrink: 0 }}>{entry.icon}</span>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
                        </>
                      ) : entry.type === 'project' ? (
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
                      ) : entry.type === 'seguimiento' ? (
                        <span style={{ fontSize: 13, flexShrink: 0, filter: 'grayscale(0.3)' }}>{entry.icon}</span>
                      ) : (
                        <span style={{ fontSize: 13, flexShrink: 0 }}>{entry.icon}</span>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{
                          fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap', display: 'block', fontFamily: "'Outfit', sans-serif",
                        }}>
                          {entry.label}
                        </span>
                        {entry.sublabel && (
                          <span style={{
                            fontSize: 10.5, color: 'var(--text-muted)', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                          }}>
                            {entry.sublabel}
                          </span>
                        )}
                      </div>

                      <span style={{
                        fontSize: 10, color: 'var(--text-muted)', flexShrink: 0,
                        padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.04)',
                        fontFamily: "'DM Mono', monospace",
                      }}>
                        {entry.type === 'item' ? 'Item' :
                         entry.type === 'seguimiento' ? 'Proceso' :
                         entry.type === 'contacto' ? 'Contacto' : 'Proyecto'}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 12, alignItems: 'center',
        }}>
          {[['↑↓', 'navegar'], ['↵', 'abrir'], ['Esc', 'cerrar']].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <kbd style={{
                fontSize: 10, color: 'var(--text-muted)', background: 'var(--card)',
                border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px',
              }}>
                {key}
              </kbd>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
