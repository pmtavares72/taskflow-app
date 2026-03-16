'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type EntradaData = {
  id: string
  tipo: string
  titulo: string
  contenido: string
  resumen: string | null
  metadatos: {
    accionesExtraidas?: { titulo: string; prioridad: string }[]
    fechasClave?: { fecha: string; descripcion: string }[]
    temas?: string[]
    seguimientoSugerido?: string
    instruccionesUsuario?: string
  } | null
  seguimiento: { id: string; titulo: string } | null
  createdAt: string
}

const TIPO_ICONS: Record<string, string> = {
  EMAIL: '✉️',
  NOTAS_REUNION: '📋',
  CONVERSACION: '💬',
  DOCUMENTO: '📄',
  NOTA_LIBRE: '📝',
}

const TIPO_LABELS: Record<string, string> = {
  EMAIL: 'Email',
  NOTAS_REUNION: 'Reunión',
  CONVERSACION: 'Conversación',
  DOCUMENTO: 'Documento',
  NOTA_LIBRE: 'Nota',
}

const FILTERS = [
  { key: 'all', label: 'Todo' },
  { key: 'EMAIL', label: 'Emails' },
  { key: 'NOTAS_REUNION', label: 'Reuniones' },
  { key: 'CONVERSACION', label: 'Conversaciones' },
  { key: 'NOTA_LIBRE', label: 'Notas' },
] as const

export default function CorreoPage() {
  const [entradas, setEntradas] = useState<EntradaData[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const url = filter === 'all' ? '/api/entradas' : `/api/entradas?tipo=${filter}`
    fetch(url)
      .then(r => r.json())
      .then(setEntradas)
      .finally(() => setLoading(false))
  }, [filter])

  const emailCount = entradas.filter(e => e.tipo === 'EMAIL').length

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta entrada?')) return
    await fetch(`/api/entradas/${id}`, { method: 'DELETE' })
    setEntradas(prev => prev.filter(e => e.id !== id))
    if (expanded === id) setExpanded(null)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
        padding: '18px 0 12px', borderBottom: '1px solid var(--border)', marginBottom: 16,
      }}>
        <div style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
            Correo y Contexto
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Emails recibidos y entradas de contexto procesadas por Nexus · <span style={{ fontFamily: "'DM Mono', monospace" }}>admin@hyper-nexus.com</span>
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{
            padding: '8px 14px', borderRadius: 10, background: 'rgba(47,212,170,0.06)',
            border: '1px solid rgba(47,212,170,0.12)', fontSize: 12, color: 'var(--accent)',
          }}>
            <span style={{ fontWeight: 700, fontSize: 16, marginRight: 4 }}>{entradas.length}</span> entradas
          </div>
          {emailCount > 0 && (
            <div style={{
              padding: '8px 14px', borderRadius: 10, background: 'rgba(96,165,250,0.06)',
              border: '1px solid rgba(96,165,250,0.12)', fontSize: 12, color: 'var(--accent-blue)',
            }}>
              <span style={{ fontWeight: 700, fontSize: 16, marginRight: 4 }}>{emailCount}</span> emails
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
            </button>
          ))}
        </div>
      </div>

      {/* Entries list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Cargando...
        </div>
      ) : entradas.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px',
          gap: 12, textAlign: 'center',
        }}>
          <div style={{ fontSize: 32 }}>✉️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Sin entradas</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 300, lineHeight: 1.5 }}>
            Reenvía un email a <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--accent)' }}>admin@hyper-nexus.com</span> o añade contexto desde un seguimiento.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entradas.map((entrada, i) => {
            const isExpanded = expanded === entrada.id
            const meta = entrada.metadatos
            const hasActions = (meta?.accionesExtraidas?.length ?? 0) > 0
            const hasDates = (meta?.fechasClave?.length ?? 0) > 0
            const isProcessed = !!entrada.resumen

            return (
              <div
                key={entrada.id}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 12, overflow: 'hidden',
                  animation: `fadeUp 0.3s ease ${i * 0.04}s both`,
                }}
              >
                {/* Header row */}
                <div
                  onClick={() => setExpanded(isExpanded ? null : entrada.id)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Icon */}
                  <div style={{ fontSize: 18, lineHeight: 1, marginTop: 2, flexShrink: 0 }}>
                    {TIPO_ICONS[entrada.tipo] ?? '📄'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 13.5, fontWeight: 600, color: 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {entrada.titulo}
                      </span>
                    </div>

                    {/* Summary or preview */}
                    <div style={{
                      fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                    }}>
                      {entrada.resumen ?? entrada.contenido.slice(0, 200)}
                    </div>

                    {/* Tags row */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)',
                        fontFamily: "'DM Mono', monospace",
                      }}>
                        {TIPO_LABELS[entrada.tipo] ?? entrada.tipo}
                      </span>

                      {isProcessed && (
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 10,
                          background: 'rgba(47,212,170,0.08)', color: 'var(--accent)',
                        }}>
                          Procesado
                        </span>
                      )}

                      {hasActions && (
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 10,
                          background: 'rgba(96,165,250,0.08)', color: 'var(--accent-blue)',
                        }}>
                          {meta!.accionesExtraidas!.length} accion{meta!.accionesExtraidas!.length > 1 ? 'es' : ''}
                        </span>
                      )}

                      {hasDates && (
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 10,
                          background: 'rgba(251,146,60,0.08)', color: 'var(--accent-orange)',
                        }}>
                          {meta!.fechasClave!.length} fecha{meta!.fechasClave!.length > 1 ? 's' : ''}
                        </span>
                      )}

                      {entrada.seguimiento && (
                        <Link
                          href={`/seguimientos/${entrada.seguimiento.id}`}
                          onClick={e => e.stopPropagation()}
                          style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 10,
                            background: 'rgba(167,139,250,0.08)', color: 'var(--accent-purple)',
                            textDecoration: 'none',
                          }}
                        >
                          📌 {entrada.seguimiento.titulo}
                        </Link>
                      )}

                      <span style={{
                        fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace",
                        marginLeft: 'auto',
                      }}>
                        {new Date(entrada.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Expand arrow */}
                  <div style={{
                    color: 'var(--text-muted)', fontSize: 14, marginTop: 4, flexShrink: 0,
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}>
                    ▾
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{
                    padding: '0 16px 14px 46px',
                    borderTop: '1px solid var(--border)',
                    paddingTop: 14,
                  }}>
                    {/* User instructions */}
                    {meta?.instruccionesUsuario && (
                      <div style={{
                        padding: '8px 12px', borderRadius: 8, marginBottom: 12,
                        background: 'rgba(47,212,170,0.06)', border: '1px solid rgba(47,212,170,0.12)',
                        fontSize: 12, color: 'var(--accent)', lineHeight: 1.5,
                      }}>
                        💬 <strong>Tu instrucción:</strong> {meta.instruccionesUsuario}
                      </div>
                    )}

                    {/* Actions */}
                    {hasActions && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Acciones extraídas
                        </div>
                        {meta!.accionesExtraidas!.map((a, j) => (
                          <div key={j} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                            fontSize: 12, color: 'var(--text)',
                          }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                              background: a.prioridad === 'URGENT' ? 'var(--urgent)' :
                                a.prioridad === 'HIGH' ? 'var(--high)' :
                                a.prioridad === 'MEDIUM' ? 'var(--medium)' : 'var(--text-muted)',
                            }} />
                            {a.titulo}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Key dates */}
                    {hasDates && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Fechas clave
                        </div>
                        {meta!.fechasClave!.map((f, j) => (
                          <div key={j} style={{ fontSize: 12, color: 'var(--text)', padding: '2px 0' }}>
                            <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--accent-orange)', marginRight: 8 }}>
                              {f.fecha}
                            </span>
                            {f.descripcion}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Topics */}
                    {meta?.temas && meta.temas.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                        {meta.temas.map((t, j) => (
                          <span key={j} style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 10,
                            background: 'var(--card)', color: 'var(--text-muted)',
                          }}>
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Full content */}
                    <details style={{ marginTop: 4 }}>
                      <summary style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 6 }}>
                        Ver contenido completo
                      </summary>
                      <pre style={{
                        fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        background: 'var(--card)', padding: 12, borderRadius: 8,
                        maxHeight: 300, overflowY: 'auto',
                        fontFamily: "'DM Mono', monospace",
                      }}>
                        {entrada.contenido}
                      </pre>
                    </details>

                    {/* Borrar */}
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(entrada.id) }}
                        style={{
                          padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.2)',
                          background: 'rgba(248,113,113,0.06)', color: 'var(--urgent)',
                          fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
