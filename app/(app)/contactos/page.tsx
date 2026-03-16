'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type ContactoData = {
  id: string; nombre: string; email: string | null; telefono: string | null
  empresa: string | null; cargo: string | null; confianza: number
  notas: string | null; createdAt: string; updatedAt: string
  seguimientos: {
    id: string; rol: string | null
    seguimiento: { id: string; titulo: string; estado: string }
  }[]
}

type OrderField = 'nombre' | 'empresa' | 'confianza' | 'updatedAt'

const ORDER_OPTIONS: { key: OrderField; label: string }[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'empresa', label: 'Empresa' },
  { key: 'confianza', label: 'Confianza' },
  { key: 'updatedAt', label: 'Reciente' },
]

export default function ContactosPage() {
  const router = useRouter()
  const [contactos, setContactos] = useState<ContactoData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [orderBy, setOrderBy] = useState<OrderField>('nombre')
  const [dir, setDir] = useState<'asc' | 'desc'>('asc')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ order: orderBy, dir })
    if (search) params.set('q', search)
    const res = await fetch(`/api/contactos?${params}`)
    if (res.ok) setContactos(await res.json())
    setLoading(false)
  }, [search, orderBy, dir])

  useEffect(() => {
    const timeout = setTimeout(fetchData, search ? 300 : 0)
    return () => clearTimeout(timeout)
  }, [fetchData, search])

  // Group by empresa for empresa view
  const grouped = orderBy === 'empresa'
    ? contactos.reduce<Record<string, ContactoData[]>>((acc, c) => {
        const key = c.empresa || 'Sin empresa'
        ;(acc[key] ??= []).push(c)
        return acc
      }, {})
    : null

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
              Contactos
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {contactos.length} contacto{contactos.length !== 1 ? 's' : ''} identificado{contactos.length !== 1 ? 's' : ''} por Nexus
            </p>
          </div>
        </div>

        {/* Search + Order */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, empresa, email..."
              style={{
                width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--card)',
                fontSize: 13, color: 'var(--text)', fontFamily: "'Outfit', sans-serif",
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {ORDER_OPTIONS.map(o => (
              <button
                key={o.key}
                onClick={() => {
                  if (orderBy === o.key) {
                    setDir(d => d === 'asc' ? 'desc' : 'asc')
                  } else {
                    setOrderBy(o.key)
                    setDir(o.key === 'confianza' || o.key === 'updatedAt' ? 'desc' : 'asc')
                  }
                }}
                style={{
                  padding: '5px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 600,
                  background: orderBy === o.key ? 'var(--accent)' : 'var(--card)',
                  color: orderBy === o.key ? '#13141f' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                }}
              >
                {o.label}
                {orderBy === o.key && (
                  <span style={{ marginLeft: 3, fontSize: 9 }}>{dir === 'asc' ? '▲' : '▼'}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Cargando...
        </div>
      ) : contactos.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px',
          gap: 12, textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 4 }}>👤</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {search ? 'Sin resultados' : 'Sin contactos'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 300, lineHeight: 1.5 }}>
            {search
              ? `No se encontraron contactos para "${search}"`
              : 'Nexus extraerá contactos automáticamente de los correos y entradas que reciba.'}
          </div>
        </div>
      ) : grouped ? (
        /* Grouped by empresa */
        Object.entries(grouped).sort(([a], [b]) =>
          dir === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
        ).map(([empresa, contacts]) => (
          <div key={empresa} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>{empresa}</span>
              <span style={{
                fontSize: 10, background: 'var(--elevated)', borderRadius: 10,
                padding: '1px 6px', fontWeight: 500,
              }}>
                {contacts.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {contacts.map((c, i) => (
                <ContactoCard key={c.id} data={c} index={i} expanded={expandedId === c.id}
                  onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  onNavigate={(segId) => router.push(`/seguimientos/${segId}`)}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        /* Flat list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {contactos.map((c, i) => (
            <ContactoCard key={c.id} data={c} index={i} expanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
              onNavigate={(segId) => router.push(`/seguimientos/${segId}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ContactoCard({ data: c, index, expanded, onToggle, onNavigate }: {
  data: ContactoData; index: number; expanded: boolean
  onToggle: () => void; onNavigate: (segId: string) => void
}) {
  const estadoColors: Record<string, string> = {
    ACTIVO: 'var(--accent)', EN_ESPERA: 'var(--accent-blue)',
    NECESITA_ATENCION: 'var(--accent-orange)', COMPLETADO: 'var(--text-muted)',
  }

  return (
    <div style={{
      borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)',
      overflow: 'hidden', animation: `fade-up 0.3s ease ${index * 0.03}s both`,
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '12px 14px', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(165,180,252,0.1)', border: '1px solid rgba(165,180,252,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: 'var(--accent-purple)',
        }}>
          {c.nombre.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.nombre}</span>
            {c.seguimientos.length > 0 && (
              <span style={{
                fontSize: 9.5, padding: '1px 6px', borderRadius: 10,
                background: 'rgba(165,180,252,0.08)', color: 'var(--accent-purple)',
                border: '1px solid rgba(165,180,252,0.15)',
              }}>
                {c.seguimientos.length} proceso{c.seguimientos.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[c.cargo, c.empresa].filter(Boolean).join(' · ') || c.email || 'Sin datos adicionales'}
          </div>
        </div>

        {/* Confidence */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ width: 40, height: 3, borderRadius: 2, background: 'var(--border)' }}>
            <div style={{ width: `${c.confianza}%`, height: '100%', borderRadius: 2, background: 'var(--accent)', transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", width: 28, textAlign: 'right' }}>
            {c.confianza}%
          </span>
        </div>

        {/* Chevron */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
          style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '0 14px 14px', borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12,
        }}>
          {/* Contact details */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {c.email && (
              <div style={{ fontSize: 12, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>✉</span>
                <span style={{ fontFamily: "'DM Mono', monospace" }}>{c.email}</span>
              </div>
            )}
            {c.telefono && (
              <div style={{ fontSize: 12, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>📞</span>
                <span style={{ fontFamily: "'DM Mono', monospace" }}>{c.telefono}</span>
              </div>
            )}
            {c.empresa && (
              <div style={{ fontSize: 12, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>🏢</span>
                <span>{c.empresa}</span>
              </div>
            )}
            {c.cargo && (
              <div style={{ fontSize: 12, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>💼</span>
                <span>{c.cargo}</span>
              </div>
            )}
          </div>

          {/* Notas */}
          {c.notas && (
            <div style={{
              fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.5,
              padding: '6px 10px', borderRadius: 6,
              background: 'rgba(47,212,170,0.04)', borderLeft: '2px solid var(--accent)',
            }}>
              {c.notas}
            </div>
          )}

          {/* Linked seguimientos */}
          {c.seguimientos.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Procesos vinculados
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {c.seguimientos.map(cs => (
                  <button
                    key={cs.id}
                    onClick={() => onNavigate(cs.seguimiento.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', borderRadius: 8,
                      background: 'var(--elevated)', border: '1px solid var(--border)',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                  >
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: estadoColors[cs.seguimiento.estado] ?? 'var(--border)',
                    }} />
                    <span style={{ fontSize: 12, color: 'var(--text)', flex: 1 }}>
                      {cs.seguimiento.titulo}
                    </span>
                    {cs.rol && (
                      <span style={{
                        fontSize: 9.5, padding: '1px 6px', borderRadius: 10,
                        background: cs.rol === 'cliente' ? 'rgba(47,212,170,0.08)' : 'rgba(165,180,252,0.08)',
                        color: cs.rol === 'cliente' ? 'var(--accent)' : 'var(--accent-purple)',
                        textTransform: 'capitalize', flexShrink: 0,
                      }}>
                        {cs.rol}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
            Actualizado: {new Date(c.updatedAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      )}
    </div>
  )
}
