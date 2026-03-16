'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ContextInput } from '@/components/context/ContextInput'
import { ReminderInput } from '@/components/reminders/ReminderInput'
import { ReminderList } from '@/components/reminders/ReminderList'
import { SparkleIcon } from '@/components/ui/SparkleIcon'

type ContactoData = {
  id: string; contacto: {
    id: string; nombre: string; email: string | null; telefono: string | null
    empresa: string | null; cargo: string | null; confianza: number
  }; rol: string | null
}

type EntradaData = {
  id: string; tipo: string; titulo: string; contenido: string
  resumen: string | null; metadatos: Record<string, unknown> | null; createdAt: string
}

type SeguimientoDetail = {
  id: string; titulo: string; descripcion: string | null; estado: string
  prioridad: string; contexto: string; ultimaActividad: string
  proximaRevision: string | null; createdAt: string
  proyecto: { id: string; nombre: string; color: string } | null
  items: { id: string; item: { id: string; titulo: string; estado: string; prioridad: string; tipo: string; fechaLimite: string | null } }[]
  entradas: EntradaData[]
  recordatorios: { id: string; mensaje: string; proximoDisparo: string; activo: boolean; tipoRecurrencia: string }[]
  feedEntries: { id: string; tipo: string; titulo: string; descripcion: string; createdAt: string }[]
  contactos: ContactoData[]
  _count: { items: number; entradas: number }
}

const estadoLabels: Record<string, { label: string; color: string }> = {
  ACTIVO: { label: 'Activo', color: 'var(--accent)' },
  EN_ESPERA: { label: 'En espera', color: 'var(--accent-blue)' },
  NECESITA_ATENCION: { label: 'Necesita atención', color: 'var(--accent-orange)' },
  COMPLETADO: { label: 'Completado', color: 'var(--text-muted)' },
  ARCHIVADO: { label: 'Archivado', color: 'var(--text-muted)' },
}

const TABS = ['correos', 'contactos', 'items', 'recordatorios', 'nexus'] as const

export default function SeguimientoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<SeguimientoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<typeof TABS[number]>('correos')
  const [showContextInput, setShowContextInput] = useState(false)

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/seguimientos/${id}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleStatusChange(estado: string) {
    await fetch(`/api/seguimientos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    fetchData()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</div>
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No encontrado</div>

  const est = estadoLabels[data.estado] ?? estadoLabels.ACTIVO
  const emails = data.entradas.filter(e => e.tipo === 'EMAIL')
  const otherEntries = data.entradas.filter(e => e.tipo !== 'EMAIL')

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
      {/* Safety banner */}
      <div style={{
        background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.15)',
        borderRadius: 8, padding: '6px 12px', margin: '12px 0 0',
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--accent-orange)',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span style={{ fontWeight: 600 }}>Solo lectura</span> — Nexus nunca envía correos ni contacta a nadie sin tu permiso explícito
      </div>

      {/* Header */}
      <div style={{ padding: '14px 0 14px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        <button
          onClick={() => router.push('/seguimientos')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: 'var(--text-muted)', marginBottom: 8,
            fontFamily: "'Outfit', sans-serif", padding: 0, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          ← Seguimientos
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
              {data.titulo}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10.5, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                background: `${est.color}15`, border: `1px solid ${est.color}30`, color: est.color,
              }}>
                {est.label}
              </span>
              {data.proyecto && (
                <span style={{
                  fontSize: 10.5, padding: '2px 8px', borderRadius: 20,
                  background: `${data.proyecto.color}18`, color: data.proyecto.color,
                }}>
                  {data.proyecto.nombre}
                </span>
              )}
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                {data._count.items} items · {data._count.entradas} entradas · {data.contactos.length} contactos
              </span>
            </div>
            {data.descripcion && (
              <p style={{ fontSize: 12.5, color: 'var(--text-sub)', lineHeight: 1.55, marginTop: 6 }}>
                {data.descripcion}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {data.estado !== 'COMPLETADO' && (
              <button
                onClick={() => handleStatusChange('COMPLETADO')}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(47,212,170,0.2)',
                  background: 'rgba(47,212,170,0.08)', fontSize: 11, fontWeight: 600,
                  color: 'var(--accent)', cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                }}
              >
                ✓ Completar
              </button>
            )}
            {data.estado === 'ACTIVO' && (
              <button
                onClick={() => handleStatusChange('EN_ESPERA')}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', fontSize: 11, fontWeight: 600,
                  color: 'var(--text-muted)', cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                }}
              >
                Pausar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[
          { key: 'correos' as const, label: 'Correos', count: emails.length },
          { key: 'contactos' as const, label: 'Contactos', count: data.contactos.length },
          { key: 'items' as const, label: 'Items', count: data.items.length },
          { key: 'recordatorios' as const, label: 'Recordatorios', count: data.recordatorios.filter(r => r.activo).length },
          { key: 'nexus' as const, label: 'Nexus', count: data.feedEntries.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600,
              background: tab === t.key ? 'var(--accent)' : 'var(--card)',
              color: tab === t.key ? '#13141f' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span style={{
                marginLeft: 5, background: tab === t.key ? 'rgba(255,255,255,0.2)' : 'var(--elevated)',
                borderRadius: 10, padding: '1px 5px', fontSize: 10,
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab: Correos ─── */}
      {tab === 'correos' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            {showContextInput ? (
              <ContextInput
                seguimientoId={data.id}
                onCreated={() => { setShowContextInput(false); fetchData() }}
                onCancel={() => setShowContextInput(false)}
              />
            ) : (
              <button
                onClick={() => setShowContextInput(true)}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 10,
                  background: 'var(--card)', border: '1px dashed rgba(167,139,250,0.25)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: "'Outfit', sans-serif", fontSize: 13, color: 'var(--accent-purple)',
                  transition: 'all 0.15s',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Añadir contexto (email, notas de reunión, etc.)
              </button>
            )}
          </div>

          {/* Email entries */}
          {emails.length === 0 && otherEntries.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13,
            }}>
              Sin entradas de contexto. Pega un email o notas de reunión para que Nexus analice.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {emails.map((entrada, i) => (
                <EmailCard key={entrada.id} data={entrada} index={i} />
              ))}
              {otherEntries.length > 0 && (
                <>
                  {emails.length > 0 && (
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '8px 0 4px' }}>
                      Otras entradas
                    </div>
                  )}
                  {otherEntries.map((entrada, i) => (
                    <EmailCard key={entrada.id} data={entrada} index={i} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Contactos ─── */}
      {tab === 'contactos' && (
        <div>
          {data.contactos.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px',
              gap: 10, textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>👤</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Sin contactos identificados</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 280, lineHeight: 1.5 }}>
                Nexus extraerá automáticamente los contactos de los correos y entradas que reciba este seguimiento.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {data.contactos.map((cs, i) => {
                const c = cs.contacto
                return (
                  <div key={cs.id} style={{
                    padding: '14px 16px', borderRadius: 12, background: 'var(--card)',
                    border: '1px solid var(--border)',
                    animation: `fade-up 0.3s ease ${i * 0.04}s both`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'rgba(165,180,252,0.1)', border: '1px solid rgba(165,180,252,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color: 'var(--accent-purple)',
                      }}>
                        {c.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.nombre}
                        </div>
                        {(c.cargo || c.empresa) && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[c.cargo, c.empresa].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                      {cs.rol && (
                        <span style={{
                          fontSize: 9.5, padding: '2px 7px', borderRadius: 20, fontWeight: 600,
                          background: cs.rol === 'cliente' ? 'rgba(47,212,170,0.08)' : 'rgba(165,180,252,0.08)',
                          color: cs.rol === 'cliente' ? 'var(--accent)' : 'var(--accent-purple)',
                          border: `1px solid ${cs.rol === 'cliente' ? 'rgba(47,212,170,0.15)' : 'rgba(165,180,252,0.15)'}`,
                          textTransform: 'capitalize', flexShrink: 0,
                        }}>
                          {cs.rol}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {c.email && (
                        <div style={{ fontSize: 11.5, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>✉</span>
                          <span style={{ fontFamily: "'DM Mono', monospace" }}>{c.email}</span>
                        </div>
                      )}
                      {c.telefono && (
                        <div style={{ fontSize: 11.5, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>📞</span>
                          <span style={{ fontFamily: "'DM Mono', monospace" }}>{c.telefono}</span>
                        </div>
                      )}
                    </div>

                    {/* Confidence bar */}
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--border)' }}>
                        <div style={{ width: `${c.confianza}%`, height: '100%', borderRadius: 2, background: 'var(--accent)', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>{c.confianza}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Items ─── */}
      {tab === 'items' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
              No hay items vinculados a este seguimiento
            </div>
          ) : (
            data.items.map(({ item }, i) => {
              const prioColors: Record<string, string> = { URGENT: 'var(--urgent)', HIGH: 'var(--accent-orange)', MEDIUM: 'var(--accent-blue)', LOW: 'var(--text-muted)' }
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(`/items/${item.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 14px', borderRadius: 10, background: 'var(--card)',
                    border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
                    animation: `fade-up 0.3s ease ${i * 0.04}s both`,
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: prioColors[item.prioridad] ?? 'var(--border)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: 'var(--text)', flex: 1, fontFamily: "'Outfit', sans-serif" }}>{item.titulo}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 6,
                    background: 'var(--elevated)', color: 'var(--text-muted)',
                  }}>
                    {item.estado.replace('_', ' ')}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}

      {/* ─── Tab: Recordatorios ─── */}
      {tab === 'recordatorios' && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <ReminderInput seguimientoId={data.id} onCreated={() => fetchData()} />
          </div>
          <ReminderList recordatorios={data.recordatorios.filter(r => r.activo)} />
        </div>
      )}

      {/* ─── Tab: Nexus ─── */}
      {tab === 'nexus' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.feedEntries.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px',
              gap: 10, textAlign: 'center',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
                color: 'var(--accent-purple)',
              }}>
                <SparkleIcon size={16} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Nexus aún no ha generado observaciones para este seguimiento
              </div>
            </div>
          ) : (
            data.feedEntries.map((entry, i) => (
              <div key={entry.id} style={{
                padding: '10px 14px', borderRadius: 10, background: 'var(--card)',
                border: '1px solid var(--border)',
                animation: `fade-up 0.3s ease ${i * 0.04}s both`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--accent-purple)',
                  }}>
                    <SparkleIcon size={9} />
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--accent-purple)' }}>Nexus</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", marginLeft: 'auto' }}>
                    {new Date(entry.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{entry.titulo}</div>
                <div style={{ fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.5 }}>{entry.descripcion}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Email/Entry card with summary and expandable full content ───

function EmailCard({ data, index = 0 }: { data: EntradaData; index?: number }) {
  const [expanded, setExpanded] = useState(false)
  const acciones = (data.metadatos?.accionesExtraidas ?? []) as { titulo: string; prioridad: string }[]
  const temas = (data.metadatos?.temas ?? []) as string[]

  const tipoIcons: Record<string, string> = {
    EMAIL: '✉', NOTAS_REUNION: '📋', CONVERSACION: '💬', DOCUMENTO: '📄', NOTA_LIBRE: '📝',
  }

  return (
    <div style={{
      padding: '12px 14px', borderRadius: 12, background: 'var(--card)',
      border: '1px solid var(--border)',
      animation: `fade-up 0.3s ease ${0.03 + index * 0.04}s both`,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>{tipoIcons[data.tipo] ?? '·'}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {data.titulo}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
          {new Date(data.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* One-line summary */}
      {data.resumen && (
        <div style={{
          fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.5, marginBottom: 6,
          padding: '5px 10px', borderRadius: 6,
          background: 'rgba(47,212,170,0.04)', borderLeft: '2px solid var(--accent)',
        }}>
          {data.resumen}
        </div>
      )}

      {/* Action chips */}
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

      {/* Expand/collapse full content — NO maxHeight limit */}
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
          whiteSpace: 'pre-wrap', overflowX: 'auto',
          fontFamily: "'DM Mono', monospace",
        }}>
          {data.contenido}
        </div>
      )}
    </div>
  )
}
