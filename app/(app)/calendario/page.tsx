'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ───

type EventoData = {
  id: string; titulo: string; descripcion: string | null
  fecha: string; fechaFin: string | null; todoElDia: boolean
  contexto: string; origen: string
  seguimiento: { id: string; titulo: string } | null
}

type ItemData = {
  id: string; titulo: string; fechaLimite: string
  estado: string; prioridad: string; contexto: string
}

type RecordatorioData = {
  id: string; mensaje: string; proximoDisparo: string; seguimientoId: string | null
}

type CalendarEntry = {
  id: string; type: 'evento' | 'item' | 'recordatorio'
  titulo: string; fecha: Date; contexto: string
  color: string; dotColor: string
  extra?: Record<string, unknown>
}

// ─── Helpers ───

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function priorityDotColor(p: string) {
  if (p === 'URGENT') return 'var(--urgent)'
  if (p === 'HIGH') return 'var(--accent-orange)'
  if (p === 'MEDIUM') return 'var(--accent-blue)'
  return 'var(--text-muted)'
}

function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  // Monday = 0, Sunday = 6
  let startDow = first.getDay() - 1
  if (startDow < 0) startDow = 6

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= lastDay; d++) cells.push(d)
  // Pad to complete last week
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// ─── Component ───

const CONTEXT_FILTERS = [
  { key: 'all', label: 'Todo' },
  { key: 'TRABAJO', label: 'Trabajo' },
  { key: 'PERSONAL', label: 'Personal' },
] as const

export default function CalendarioPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<Date | null>(today)
  const [contextFilter, setContextFilter] = useState<string>('all')
  const [showNewForm, setShowNewForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // New event form
  const [newEvt, setNewEvt] = useState({
    titulo: '', descripcion: '', fecha: '', hora: '09:00',
    fechaFin: '', horaFin: '', todoElDia: false, contexto: 'TRABAJO',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const from = new Date(year, month, 1).toISOString()
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

    try {
      const res = await fetch(`/api/eventos?from=${from}&to=${to}`)
      if (!res.ok) throw new Error()
      const data = await res.json()

      const all: CalendarEntry[] = []

      for (const ev of (data.eventos as EventoData[])) {
        all.push({
          id: ev.id, type: 'evento', titulo: ev.titulo,
          fecha: new Date(ev.fecha), contexto: ev.contexto,
          color: ev.contexto === 'PERSONAL' ? 'rgba(167,139,250,0.12)' : 'rgba(47,212,170,0.12)',
          dotColor: ev.contexto === 'PERSONAL' ? 'var(--accent-purple)' : 'var(--accent)',
          extra: { descripcion: ev.descripcion, todoElDia: ev.todoElDia, fechaFin: ev.fechaFin, origen: ev.origen, seguimiento: ev.seguimiento },
        })
      }

      for (const it of (data.items as ItemData[])) {
        all.push({
          id: it.id, type: 'item', titulo: it.titulo,
          fecha: new Date(it.fechaLimite), contexto: it.contexto,
          color: 'rgba(96,165,250,0.08)',
          dotColor: priorityDotColor(it.prioridad),
          extra: { estado: it.estado, prioridad: it.prioridad },
        })
      }

      for (const rec of (data.recordatorios as RecordatorioData[])) {
        all.push({
          id: rec.id, type: 'recordatorio', titulo: rec.mensaje,
          fecha: new Date(rec.proximoDisparo), contexto: 'AMBOS',
          color: 'rgba(167,139,250,0.08)',
          dotColor: 'var(--accent-purple)',
          extra: { seguimientoId: rec.seguimientoId },
        })
      }

      setEntries(all)
    } catch { /* silently fail */ }
    setLoading(false)
  }, [year, month])

  useEffect(() => { fetchData() }, [fetchData])

  // Build lookup: dateKey → entries
  const byDate: Record<string, CalendarEntry[]> = {}
  for (const e of entries) {
    if (contextFilter !== 'all' && e.contexto !== contextFilter && e.contexto !== 'AMBOS') continue
    const k = dateKey(e.fecha)
    if (!byDate[k]) byDate[k] = []
    byDate[k].push(e)
  }

  const grid = getMonthGrid(year, month)
  const selectedEntries = selectedDay ? (byDate[dateKey(selectedDay)] ?? []) : []

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }
  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDay(today)
  }

  async function createEvento() {
    if (!newEvt.titulo || !newEvt.fecha) return
    setSaving(true)
    const fechaStr = newEvt.todoElDia
      ? new Date(newEvt.fecha + 'T00:00:00').toISOString()
      : new Date(newEvt.fecha + 'T' + (newEvt.hora || '09:00') + ':00').toISOString()
    const fechaFinStr = newEvt.fechaFin
      ? new Date(newEvt.fechaFin + 'T' + (newEvt.horaFin || '18:00') + ':00').toISOString()
      : undefined

    await fetch('/api/eventos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: newEvt.titulo,
        descripcion: newEvt.descripcion || undefined,
        fecha: fechaStr,
        fechaFin: fechaFinStr,
        todoElDia: newEvt.todoElDia,
        contexto: newEvt.contexto,
      }),
    })

    setNewEvt({ titulo: '', descripcion: '', fecha: '', hora: '09:00', fechaFin: '', horaFin: '', todoElDia: false, contexto: 'TRABAJO' })
    setShowNewForm(false)
    setSaving(false)
    fetchData()
  }

  async function deleteEvento(id: string) {
    if (!confirm('¿Eliminar este evento?')) return
    await fetch(`/api/eventos/${id}`, { method: 'DELETE' })
    fetchData()
  }

  // Count stats
  const totalEvents = entries.filter(e => contextFilter === 'all' || e.contexto === contextFilter || e.contexto === 'AMBOS').length
  const trabajoCount = entries.filter(e => e.contexto === 'TRABAJO').length
  const personalCount = entries.filter(e => e.contexto === 'PERSONAL').length

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
        padding: '18px 0 12px', borderBottom: '1px solid var(--border)', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
              Calendario
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Eventos, deadlines y recordatorios
            </p>
          </div>
          <button
            onClick={() => { setShowNewForm(true); setNewEvt(e => ({ ...e, fecha: selectedDay ? dateKey(selectedDay) : '' })) }}
            style={{
              padding: '7px 14px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#13141f', cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600,
              boxShadow: '0 0 16px rgba(47,212,170,0.2)',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo evento
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{
            padding: '6px 12px', borderRadius: 10, background: 'rgba(47,212,170,0.06)',
            border: '1px solid rgba(47,212,170,0.12)', fontSize: 12, color: 'var(--accent)',
          }}>
            <span style={{ fontWeight: 700, fontSize: 15, marginRight: 4 }}>{totalEvents}</span> este mes
          </div>
          {trabajoCount > 0 && (
            <div style={{
              padding: '6px 12px', borderRadius: 10, background: 'rgba(96,165,250,0.06)',
              border: '1px solid rgba(96,165,250,0.12)', fontSize: 12, color: 'var(--accent-blue)',
            }}>
              <span style={{ fontWeight: 700, fontSize: 15, marginRight: 4 }}>{trabajoCount}</span> trabajo
            </div>
          )}
          {personalCount > 0 && (
            <div style={{
              padding: '6px 12px', borderRadius: 10, background: 'rgba(167,139,250,0.06)',
              border: '1px solid rgba(167,139,250,0.12)', fontSize: 12, color: 'var(--accent-purple)',
            }}>
              <span style={{ fontWeight: 700, fontSize: 15, marginRight: 4 }}>{personalCount}</span> personal
            </div>
          )}
        </div>

        {/* Context filter pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {CONTEXT_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setContextFilter(f.key)}
              style={{
                padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif", fontSize: 11.5, fontWeight: 600,
                background: contextFilter === f.key ? 'var(--accent)' : 'var(--card)',
                color: contextFilter === f.key ? '#13141f' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Month navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, padding: '0 4px',
      }}>
        <button onClick={prevMonth} style={navBtnStyle}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 18, fontWeight: 700, color: 'var(--text)',
            fontFamily: "'Outfit', sans-serif",
          }}>
            {MONTHS[month]}
          </span>
          <span style={{
            fontSize: 18, fontWeight: 400, color: 'var(--text-muted)',
            fontFamily: "'DM Mono', monospace",
          }}>
            {year}
          </span>
          {(year !== today.getFullYear() || month !== today.getMonth()) && (
            <button onClick={goToday} style={{
              padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--elevated)', fontSize: 10, fontWeight: 600,
              color: 'var(--accent)', cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
            }}>
              Hoy
            </button>
          )}
        </div>
        <button onClick={nextMonth} style={navBtnStyle}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2,
        marginBottom: 20,
      }}>
        {/* Day headers */}
        {DAYS.map(d => (
          <div key={d} style={{
            textAlign: 'center', padding: '8px 0 6px', fontSize: 10.5,
            fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em',
            fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase',
          }}>
            {d}
          </div>
        ))}

        {/* Date cells */}
        {grid.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />

          const cellDate = new Date(year, month, day)
          const isToday = sameDay(cellDate, today)
          const isSelected = selectedDay && sameDay(cellDate, selectedDay)
          const dayEntries = byDate[dateKey(cellDate)] ?? []
          const isPast = cellDate < today && !isToday
          const isWeekend = i % 7 >= 5

          return (
            <div
              key={day}
              onClick={() => setSelectedDay(cellDate)}
              style={{
                position: 'relative',
                padding: '8px 6px 10px', borderRadius: 10, cursor: 'pointer',
                minHeight: 64, transition: 'all 0.15s',
                background: isSelected ? 'var(--card)' : isToday ? 'rgba(47,212,170,0.04)' : 'transparent',
                border: isSelected ? '1.5px solid var(--accent)' : isToday ? '1.5px solid rgba(47,212,170,0.2)' : '1.5px solid transparent',
                opacity: isPast ? 0.45 : 1,
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--elevated)' }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isToday ? 'rgba(47,212,170,0.04)' : 'transparent' }}
            >
              {/* Day number */}
              <div style={{
                fontSize: 13, fontWeight: isToday ? 700 : isWeekend ? 400 : 500,
                color: isToday ? 'var(--accent)' : isWeekend ? 'var(--text-muted)' : 'var(--text)',
                fontFamily: "'DM Mono', monospace",
                marginBottom: 4,
              }}>
                {day}
              </div>

              {/* Event dots */}
              {dayEntries.length > 0 && (
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {dayEntries.slice(0, 3).map((entry, j) => (
                    <div key={j} style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: entry.dotColor, flexShrink: 0,
                    }} />
                  ))}
                  {dayEntries.length > 3 && (
                    <span style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
                      +{dayEntries.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden', animation: 'fadeUp 0.3s ease both',
        }}>
          {/* Day header */}
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <span style={{
                fontSize: 15, fontWeight: 700, color: 'var(--text)',
                fontFamily: "'Outfit', sans-serif",
              }}>
                {selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
              {sameDay(selectedDay, today) && (
                <span style={{
                  marginLeft: 8, fontSize: 10, padding: '2px 8px', borderRadius: 10,
                  background: 'rgba(47,212,170,0.1)', color: 'var(--accent)', fontWeight: 600,
                }}>
                  Hoy
                </span>
              )}
            </div>
            <span style={{
              fontSize: 11, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace",
            }}>
              {selectedEntries.length} evento{selectedEntries.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Entries list */}
          <div style={{ padding: '10px 14px' }}>
            {selectedEntries.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)', fontSize: 12.5,
              }}>
                Sin eventos para este día
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedEntries
                  .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
                  .map((entry, i) => (
                  <div key={entry.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    background: entry.color,
                    border: `1px solid ${entry.dotColor}20`,
                    animation: `fadeUp 0.3s ease ${i * 0.04}s both`,
                  }}>
                    {/* Time + dot */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, paddingTop: 2 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.dotColor }} />
                      <span style={{
                        fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace",
                      }}>
                        {(entry.extra as { todoElDia?: boolean })?.todoElDia
                          ? 'Día'
                          : entry.fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginBottom: 3,
                      }}>
                        {entry.titulo}
                      </div>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Type badge */}
                        <span style={{
                          fontSize: 9.5, padding: '1px 7px', borderRadius: 10, fontWeight: 600,
                          background: entry.type === 'evento' ? 'rgba(47,212,170,0.1)' :
                            entry.type === 'item' ? 'rgba(96,165,250,0.1)' : 'rgba(167,139,250,0.1)',
                          color: entry.type === 'evento' ? 'var(--accent)' :
                            entry.type === 'item' ? 'var(--accent-blue)' : 'var(--accent-purple)',
                        }}>
                          {entry.type === 'evento' ? 'Evento' : entry.type === 'item' ? 'Deadline' : 'Recordatorio'}
                        </span>

                        {/* Context badge */}
                        <span style={{
                          fontSize: 9.5, padding: '1px 7px', borderRadius: 10,
                          background: entry.contexto === 'PERSONAL' ? 'rgba(167,139,250,0.08)' : 'rgba(96,165,250,0.08)',
                          color: entry.contexto === 'PERSONAL' ? 'var(--accent-purple)' : 'var(--accent-blue)',
                        }}>
                          {entry.contexto === 'PERSONAL' ? 'Personal' : entry.contexto === 'TRABAJO' ? 'Trabajo' : 'Ambos'}
                        </span>

                        {/* Seguimiento link */}
                        {(entry.extra as { seguimiento?: { id: string; titulo: string } })?.seguimiento && (
                          <a
                            href={`/seguimientos/${(entry.extra as { seguimiento: { id: string } }).seguimiento.id}`}
                            onClick={e => e.stopPropagation()}
                            style={{ fontSize: 9.5, color: 'var(--accent-purple)', textDecoration: 'none' }}
                          >
                            📌 {(entry.extra as { seguimiento: { titulo: string } }).seguimiento.titulo}
                          </a>
                        )}

                        {/* Priority for items */}
                        {entry.type === 'item' && (entry.extra as { prioridad?: string })?.prioridad && (
                          <span style={{
                            fontSize: 9.5, padding: '1px 7px', borderRadius: 10,
                            background: `${entry.dotColor}18`, color: entry.dotColor, fontWeight: 600,
                          }}>
                            {(entry.extra as { prioridad: string }).prioridad}
                          </span>
                        )}
                      </div>

                      {/* Description if exists */}
                      {(entry.extra as { descripcion?: string })?.descripcion && (
                        <div style={{
                          fontSize: 11.5, color: 'var(--text-sub)', lineHeight: 1.4, marginTop: 4,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                        }}>
                          {(entry.extra as { descripcion: string }).descripcion}
                        </div>
                      )}
                    </div>

                    {/* Delete for user-created events */}
                    {entry.type === 'evento' && (
                      <button
                        onClick={e => { e.stopPropagation(); deleteEvento(entry.id) }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          opacity: 0.3, transition: 'opacity 0.15s', padding: '2px', flexShrink: 0,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.3' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--urgent)" strokeWidth="2" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New event modal */}
      {showNewForm && (
        <>
          <div
            onClick={() => setShowNewForm(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
              zIndex: 900, animation: 'fadeUp 0.15s ease both',
            }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '90%', maxWidth: 440, background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 16, padding: 24,
            zIndex: 901, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            animation: 'fadeUp 0.25s ease both',
          }}>
            <div style={{
              fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16,
            }}>
              Nuevo evento
            </div>

            {/* Titulo */}
            <input
              type="text"
              placeholder="Título del evento"
              value={newEvt.titulo}
              onChange={e => setNewEvt(prev => ({ ...prev, titulo: e.target.value }))}
              style={inputStyle}
              autoFocus
            />

            {/* Descripcion */}
            <textarea
              placeholder="Descripción (opcional)"
              value={newEvt.descripcion}
              onChange={e => setNewEvt(prev => ({ ...prev, descripcion: e.target.value }))}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />

            {/* Todo el día checkbox */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
              fontSize: 12, color: 'var(--text-sub)', cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={newEvt.todoElDia}
                onChange={e => setNewEvt(prev => ({ ...prev, todoElDia: e.target.checked }))}
                style={{ accentColor: 'var(--accent)' }}
              />
              Todo el día
            </label>

            {/* Fecha + hora */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                type="date"
                value={newEvt.fecha}
                onChange={e => setNewEvt(prev => ({ ...prev, fecha: e.target.value }))}
                style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
              />
              {!newEvt.todoElDia && (
                <input
                  type="time"
                  value={newEvt.hora}
                  onChange={e => setNewEvt(prev => ({ ...prev, hora: e.target.value }))}
                  style={{ ...inputStyle, width: 110, marginBottom: 0 }}
                />
              )}
            </div>

            {/* Fecha fin (optional) */}
            {!newEvt.todoElDia && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="date"
                  value={newEvt.fechaFin}
                  onChange={e => setNewEvt(prev => ({ ...prev, fechaFin: e.target.value }))}
                  placeholder="Fin (opcional)"
                  style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                />
                <input
                  type="time"
                  value={newEvt.horaFin}
                  onChange={e => setNewEvt(prev => ({ ...prev, horaFin: e.target.value }))}
                  style={{ ...inputStyle, width: 110, marginBottom: 0 }}
                />
              </div>
            )}

            {/* Contexto */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, marginTop: 4 }}>
              {[
                { value: 'TRABAJO', label: 'Trabajo' },
                { value: 'PERSONAL', label: 'Personal' },
                { value: 'AMBOS', label: 'Ambos' },
              ].map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNewEvt(prev => ({ ...prev, contexto: c.value }))}
                  style={{
                    padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 500,
                    border: `1px solid ${newEvt.contexto === c.value
                      ? (c.value === 'PERSONAL' ? 'var(--accent-purple)' : c.value === 'TRABAJO' ? 'var(--accent-blue)' : 'var(--accent)')
                      : 'var(--border)'}`,
                    background: newEvt.contexto === c.value
                      ? (c.value === 'PERSONAL' ? 'rgba(167,139,250,0.1)' : c.value === 'TRABAJO' ? 'rgba(96,165,250,0.1)' : 'rgba(47,212,170,0.1)')
                      : 'var(--elevated)',
                    color: newEvt.contexto === c.value
                      ? (c.value === 'PERSONAL' ? 'var(--accent-purple)' : c.value === 'TRABAJO' ? 'var(--accent-blue)' : 'var(--accent)')
                      : 'var(--text-muted)',
                    transition: 'all 0.12s',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowNewForm(false)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', fontSize: 12, fontWeight: 600,
                  color: 'var(--text-muted)', cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={createEvento}
                disabled={saving || !newEvt.titulo || !newEvt.fecha}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: (!newEvt.titulo || !newEvt.fecha) ? 'var(--elevated)' : 'var(--accent)',
                  fontSize: 12, fontWeight: 600,
                  color: (!newEvt.titulo || !newEvt.fecha) ? 'var(--text-muted)' : '#13141f',
                  cursor: (!newEvt.titulo || !newEvt.fecha) ? 'not-allowed' : 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                  opacity: saving ? 0.6 : 1,
                  boxShadow: (newEvt.titulo && newEvt.fecha) ? '0 0 12px rgba(47,212,170,0.2)' : 'none',
                }}
              >
                {saving ? 'Guardando...' : 'Crear evento'}
              </button>
            </div>
          </div>
        </>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 12 }}>
          Cargando calendario...
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

// ─── Shared styles ───

const navBtnStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--elevated)', color: 'var(--text-muted)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  background: 'var(--card)', border: '1px solid var(--border)',
  color: 'var(--text)', fontFamily: "'Outfit', sans-serif", fontSize: 13,
  outline: 'none', marginBottom: 8, colorScheme: 'dark',
}
