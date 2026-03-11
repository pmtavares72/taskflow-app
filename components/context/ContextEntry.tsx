'use client'

import { useState } from 'react'

interface EntradaData {
  id: string
  tipo: string
  titulo: string
  contenido: string
  resumen: string | null
  metadatos: Record<string, unknown> | null
  createdAt: string | Date
}

const tipoIcons: Record<string, string> = {
  EMAIL: '✉', NOTAS_REUNION: '📋', CONVERSACION: '💬', DOCUMENTO: '📄', NOTA_LIBRE: '📝',
}

const tipoLabels: Record<string, string> = {
  EMAIL: 'Email', NOTAS_REUNION: 'Reunión', CONVERSACION: 'Conversación', DOCUMENTO: 'Documento', NOTA_LIBRE: 'Nota',
}

export function ContextEntry({ data, index = 0 }: { data: EntradaData; index?: number }) {
  const [expanded, setExpanded] = useState(false)
  const acciones = (data.metadatos?.accionesExtraidas ?? []) as { titulo: string; prioridad: string; tipo: string }[]
  const temas = (data.metadatos?.temas ?? []) as string[]

  return (
    <div style={{
      animation: `fade-up 0.3s ease ${0.05 + index * 0.04}s both`,
    }}>
      {/* Timeline dot + line */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--elevated)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12,
          }}>
            {tipoIcons[data.tipo] ?? '·'}
          </div>
          <div style={{ width: 1, flex: 1, background: 'var(--border)', minHeight: 12 }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9.5, padding: '1px 6px', borderRadius: 20, background: 'var(--elevated)', color: 'var(--text-muted)', fontWeight: 600 }}>
              {tipoLabels[data.tipo] ?? data.tipo}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
              {new Date(data.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            {data.titulo}
          </div>

          {/* AI Summary */}
          {data.resumen && (
            <div style={{
              fontSize: 12.5, color: 'var(--text-sub)', lineHeight: 1.55, marginBottom: 6,
              padding: '6px 10px', borderRadius: 8,
              background: 'rgba(47,212,170,0.04)', borderLeft: '2px solid var(--accent)',
            }}>
              {data.resumen}
            </div>
          )}

          {/* Extracted action chips */}
          {acciones.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
              {acciones.map((a, i) => (
                <span key={i} style={{
                  fontSize: 10.5, padding: '2px 8px', borderRadius: 6,
                  background: a.prioridad === 'URGENT' || a.prioridad === 'HIGH'
                    ? 'rgba(248,113,113,0.1)' : 'rgba(165,180,252,0.1)',
                  color: a.prioridad === 'URGENT' || a.prioridad === 'HIGH'
                    ? 'var(--urgent)' : 'var(--accent-purple)',
                  border: `1px solid ${a.prioridad === 'URGENT' || a.prioridad === 'HIGH'
                    ? 'rgba(248,113,113,0.2)' : 'rgba(165,180,252,0.15)'}`,
                }}>
                  {a.titulo}
                </span>
              ))}
            </div>
          )}

          {/* Topic tags */}
          {temas.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
              {temas.map((t, i) => (
                <span key={i} style={{
                  fontSize: 9.5, padding: '1px 6px', borderRadius: 20,
                  background: 'var(--elevated)', color: 'var(--text-muted)',
                }}>
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Expand/collapse full content */}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--accent-purple)', fontWeight: 500,
              fontFamily: "'Outfit', sans-serif", padding: 0,
            }}
          >
            {expanded ? 'Ocultar contenido ▴' : 'Ver contenido completo ▾'}
          </button>

          {expanded && (
            <div style={{
              marginTop: 6, padding: '10px 12px', borderRadius: 8,
              background: 'var(--elevated)', border: '1px solid var(--border)',
              fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.6,
              whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto',
              fontFamily: "'DM Mono', monospace",
            }}>
              {data.contenido}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
