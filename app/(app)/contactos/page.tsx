'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type NotaData = {
  id: string; contenido: string; autor: string; entradaId: string | null
  createdAt: string; updatedAt: string
}

type ContactoData = {
  id: string; nombre: string; email: string | null; telefono: string | null
  empresa: string | null; cargo: string | null; confianza: number
  notas: string | null; createdAt: string; updatedAt: string
  notasContacto: NotaData[]
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

  // Callback para actualizar notas de un contacto en el estado local
  const updateContactNotas = useCallback((contactoId: string, notas: NotaData[]) => {
    setContactos(prev => prev.map(c => c.id === contactoId ? { ...c, notasContacto: notas } : c))
  }, [])

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
                  onNotasChange={(notas) => updateContactNotas(c.id, notas)}
                  onUpdate={(updated) => setContactos(prev => prev.map(x => x.id === c.id ? { ...x, ...updated } : x))}
                  onDelete={() => { setContactos(prev => prev.filter(x => x.id !== c.id)); if (expandedId === c.id) setExpandedId(null) }}
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
              onNotasChange={(notas) => updateContactNotas(c.id, notas)}
              onUpdate={(updated) => setContactos(prev => prev.map(x => x.id === c.id ? { ...x, ...updated } : x))}
              onDelete={() => { setContactos(prev => prev.filter(x => x.id !== c.id)); if (expandedId === c.id) setExpandedId(null) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ContactoCard({ data: c, index, expanded, onToggle, onNavigate, onNotasChange, onUpdate, onDelete }: {
  data: ContactoData; index: number; expanded: boolean
  onToggle: () => void; onNavigate: (segId: string) => void
  onNotasChange: (notas: NotaData[]) => void
  onUpdate: (updated: Partial<ContactoData>) => void
  onDelete: () => void
}) {
  const [newNota, setNewNota] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingContact, setEditingContact] = useState(false)
  const [editFields, setEditFields] = useState({ nombre: '', email: '', telefono: '', empresa: '', cargo: '' })

  const estadoColors: Record<string, string> = {
    ACTIVO: 'var(--accent)', EN_ESPERA: 'var(--accent-blue)',
    NECESITA_ATENCION: 'var(--accent-orange)', COMPLETADO: 'var(--text-muted)',
  }

  async function addNota() {
    if (!newNota.trim() || saving) return
    setSaving(true)
    const res = await fetch(`/api/contactos/${c.id}/notas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contenido: newNota.trim() }),
    })
    if (res.ok) {
      const nota = await res.json()
      onNotasChange([nota, ...c.notasContacto])
      setNewNota('')
    }
    setSaving(false)
  }

  async function updateNota(notaId: string) {
    if (!editText.trim() || saving) return
    setSaving(true)
    const res = await fetch(`/api/contactos/${c.id}/notas`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notaId, contenido: editText.trim() }),
    })
    if (res.ok) {
      const updated = await res.json()
      onNotasChange(c.notasContacto.map(n => n.id === notaId ? updated : n))
      setEditingId(null)
    }
    setSaving(false)
  }

  async function deleteNota(notaId: string) {
    if (!confirm('¿Eliminar esta nota?')) return
    const res = await fetch(`/api/contactos/${c.id}/notas?notaId=${notaId}`, { method: 'DELETE' })
    if (res.ok) {
      onNotasChange(c.notasContacto.filter(n => n.id !== notaId))
    }
  }

  function startEditContact() {
    setEditFields({
      nombre: c.nombre, email: c.email ?? '', telefono: c.telefono ?? '',
      empresa: c.empresa ?? '', cargo: c.cargo ?? '',
    })
    setEditingContact(true)
  }

  async function saveContact() {
    setSaving(true)
    const body: Record<string, string> = {}
    if (editFields.nombre !== c.nombre) body.nombre = editFields.nombre
    if (editFields.email !== (c.email ?? '')) body.email = editFields.email
    if (editFields.telefono !== (c.telefono ?? '')) body.telefono = editFields.telefono
    if (editFields.empresa !== (c.empresa ?? '')) body.empresa = editFields.empresa
    if (editFields.cargo !== (c.cargo ?? '')) body.cargo = editFields.cargo
    if (Object.keys(body).length > 0) {
      const res = await fetch(`/api/contactos/${c.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) onUpdate(await res.json())
    }
    setEditingContact(false)
    setSaving(false)
  }

  async function handleDeleteContact() {
    if (!confirm(`¿Eliminar el contacto "${c.nombre}"? Se borrarán todas sus notas y vinculaciones.`)) return
    await fetch(`/api/contactos/${c.id}`, { method: 'DELETE' })
    onDelete()
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
            {c.notasContacto.length > 0 && (
              <span style={{
                fontSize: 9.5, padding: '1px 6px', borderRadius: 10,
                background: 'rgba(47,212,170,0.08)', color: 'var(--accent)',
                border: '1px solid rgba(47,212,170,0.15)',
              }}>
                {c.notasContacto.length} nota{c.notasContacto.length !== 1 ? 's' : ''}
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
          {/* Contact details / Edit mode */}
          {editingContact ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(['nombre', 'email', 'telefono', 'empresa', 'cargo'] as const).map(field => (
                <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', width: 60, textTransform: 'capitalize', flexShrink: 0 }}>{field}</label>
                  <input
                    value={editFields[field]}
                    onChange={e => setEditFields(f => ({ ...f, [field]: e.target.value }))}
                    style={{
                      flex: 1, padding: '5px 8px', borderRadius: 6,
                      border: '1px solid var(--border)', background: 'var(--surface)',
                      fontSize: 12, color: 'var(--text)', fontFamily: "'Outfit', sans-serif",
                      outline: 'none',
                    }}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" onClick={e => { e.stopPropagation(); setEditingContact(false) }} style={{
                  padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
                  background: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                }}>Cancelar</button>
                <button type="button" onClick={e => { e.stopPropagation(); saveContact() }} disabled={saving} style={{
                  padding: '5px 12px', borderRadius: 6, border: 'none',
                  background: 'var(--accent)', color: '#13141f', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Outfit', sans-serif", opacity: saving ? 0.5 : 1,
                }}>Guardar</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
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
              <div style={{ flex: 1 }} />
              <button type="button" onClick={e => { e.stopPropagation(); startEditContact() }} style={{
                fontSize: 10, color: 'var(--accent-blue)', background: 'none', border: 'none',
                cursor: 'pointer', padding: '2px 6px', textDecoration: 'underline', textUnderlineOffset: 2,
              }}>editar</button>
              <button type="button" onClick={e => { e.stopPropagation(); handleDeleteContact() }} style={{
                fontSize: 10, color: 'var(--urgent)', background: 'none', border: 'none',
                cursor: 'pointer', padding: '2px 6px', textDecoration: 'underline', textUnderlineOffset: 2,
              }}>eliminar</button>
            </div>
          )}

          {/* Notas / Intel timeline */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>Intel sobre {c.nombre.split(' ')[0]}</span>
              <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                {c.notasContacto.length} nota{c.notasContacto.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Add new note */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                value={newNota}
                onChange={e => setNewNota(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addNota() }}
                placeholder={`Añadir nota sobre ${c.nombre.split(' ')[0]}...`}
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  fontSize: 12, color: 'var(--text)', fontFamily: "'Outfit', sans-serif",
                  outline: 'none',
                }}
              />
              <button
                onClick={addNota}
                disabled={!newNota.trim() || saving}
                style={{
                  padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: newNota.trim() ? 'var(--accent)' : 'var(--card)',
                  color: newNota.trim() ? '#13141f' : 'var(--text-muted)',
                  fontSize: 11, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
                  transition: 'all 0.15s', opacity: saving ? 0.5 : 1,
                }}
              >
                Añadir
              </button>
            </div>

            {/* Notes list */}
            {c.notasContacto.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {c.notasContacto.map(nota => (
                  <div key={nota.id} style={{
                    padding: '8px 10px', borderRadius: 8,
                    background: nota.autor === 'agente' ? 'rgba(47,212,170,0.04)' : 'rgba(165,180,252,0.04)',
                    borderLeft: `2px solid ${nota.autor === 'agente' ? 'var(--accent)' : 'var(--accent-purple)'}`,
                  }}>
                    {editingId === nota.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') updateNota(nota.id); if (e.key === 'Escape') setEditingId(null) }}
                          autoFocus
                          style={{
                            flex: 1, padding: '4px 8px', borderRadius: 6,
                            border: '1px solid var(--accent)', background: 'var(--surface)',
                            fontSize: 12, color: 'var(--text)', fontFamily: "'Outfit', sans-serif",
                            outline: 'none',
                          }}
                        />
                        <button onClick={() => updateNota(nota.id)} style={{
                          padding: '4px 10px', borderRadius: 6, border: 'none',
                          background: 'var(--accent)', color: '#13141f',
                          fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        }}>OK</button>
                        <button onClick={() => setEditingId(null)} style={{
                          padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
                          background: 'none', color: 'var(--text-muted)',
                          fontSize: 10, cursor: 'pointer',
                        }}>Esc</button>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
                          {nota.contenido}
                        </div>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
                        }}>
                          <span style={{
                            fontSize: 9.5, color: 'var(--text-muted)',
                            fontFamily: "'DM Mono', monospace",
                          }}>
                            {nota.autor === 'agente' ? 'Nexus' : 'Tú'} · {new Date(nota.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                          </span>
                          <button
                            onClick={() => { setEditingId(nota.id); setEditText(nota.contenido) }}
                            style={{
                              fontSize: 9.5, color: 'var(--text-muted)', background: 'none',
                              border: 'none', cursor: 'pointer', padding: 0,
                              textDecoration: 'underline', textUnderlineOffset: 2,
                            }}
                          >
                            editar
                          </button>
                          <button
                            onClick={() => deleteNota(nota.id)}
                            style={{
                              fontSize: 9.5, color: 'var(--urgent)', background: 'none',
                              border: 'none', cursor: 'pointer', padding: 0,
                              textDecoration: 'underline', textUnderlineOffset: 2,
                            }}
                          >
                            borrar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {c.notasContacto.length === 0 && !c.notas && (
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Nexus irá añadiendo información sobre esta persona a medida que procese emails y entradas.
              </div>
            )}

            {/* Legacy notas field */}
            {c.notas && c.notasContacto.length === 0 && (
              <div style={{
                fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.5,
                padding: '6px 10px', borderRadius: 6,
                background: 'rgba(47,212,170,0.04)', borderLeft: '2px solid var(--accent)',
              }}>
                {c.notas}
              </div>
            )}
          </div>

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
