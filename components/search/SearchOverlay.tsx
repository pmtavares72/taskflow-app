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

interface SearchResults {
  items: SearchItem[]
  projects: SearchProject[]
}

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

export function SearchOverlay() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ items: [], projects: [] })
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const allResults = [
    ...results.items.map(i => ({ type: 'item' as const, ...i })),
    ...results.projects.map(p => ({ type: 'project' as const, id: p.id, titulo: p.nombre, color: p.color })),
  ]

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults({ items: [], projects: [] }); return }
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
      setResults({ items: [], projects: [] })
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  function navigate(result: typeof allResults[0]) {
    setOpen(false)
    if (result.type === 'item') router.push(`/items/${result.id}`)
    else router.push(`/kanban?proyecto=${result.id}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, allResults.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && allResults[selectedIdx]) navigate(allResults[selectedIdx])
  }

  if (!open) return null

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
            placeholder="Buscar tareas, notas, proyectos..."
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
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {query.length < 2 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Escribe para buscar...
            </div>
          ) : allResults.length === 0 && !loading ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {results.items.length > 0 && (
                <div>
                  <div style={{ padding: '8px 16px 4px', fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Items
                  </div>
                  {results.items.map((item, i) => (
                    <button
                      key={item.id}
                      onClick={() => navigate({ type: 'item', ...item })}
                      onMouseEnter={() => setSelectedIdx(i)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                        background: selectedIdx === i ? 'rgba(167,139,250,0.08)' : 'transparent',
                        borderLeft: selectedIdx === i ? '2px solid var(--accent-purple)' : '2px solid transparent',
                        transition: 'all 0.1s',
                      }}
                    >
                      <span style={{ fontSize: 13, flexShrink: 0 }}>{tipoIcon(item.tipo)}</span>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: priorityDot(item.prioridad), flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Outfit', sans-serif" }}>
                        {item.titulo}
                      </span>
                      {item.proyecto && (
                        <span style={{
                          fontSize: 10.5, padding: '2px 8px', borderRadius: 10, flexShrink: 0,
                          background: `${item.proyecto.color}18`, color: item.proyecto.color,
                          fontFamily: "'Outfit', sans-serif",
                        }}>
                          {item.proyecto.nombre}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {results.projects.length > 0 && (
                <div>
                  <div style={{ padding: '8px 16px 4px', fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Proyectos
                  </div>
                  {results.projects.map((proj, i) => {
                    const idx = results.items.length + i
                    return (
                      <button
                        key={proj.id}
                        onClick={() => navigate({ type: 'project', id: proj.id, titulo: proj.nombre, color: proj.color })}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                          background: selectedIdx === idx ? 'rgba(167,139,250,0.08)' : 'transparent',
                          borderLeft: selectedIdx === idx ? '2px solid var(--accent-purple)' : '2px solid transparent',
                          transition: 'all 0.1s',
                        }}
                      >
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: proj.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>
                          {proj.nombre}
                        </span>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Proyecto</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
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
