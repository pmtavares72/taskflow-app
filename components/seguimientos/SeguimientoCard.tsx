'use client'

import Link from 'next/link'

interface SeguimientoCardData {
  id: string
  titulo: string
  estado: string
  prioridad: string
  ultimaActividad: string | Date
  proyecto: { id: string; nombre: string; color: string } | null
  _count: { items: number; entradas: number }
  recordatorios: { id: string; proximoDisparo: string | Date }[]
}

function estadoBadge(estado: string) {
  const map: Record<string, { bg: string; border: string; color: string; label: string }> = {
    ACTIVO: { bg: 'rgba(47,212,170,0.1)', border: 'rgba(47,212,170,0.2)', color: 'var(--accent)', label: 'Activo' },
    EN_ESPERA: { bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)', color: 'var(--accent-blue)', label: 'En espera' },
    NECESITA_ATENCION: { bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.2)', color: 'var(--accent-orange)', label: 'Necesita atención' },
    COMPLETADO: { bg: 'rgba(47,212,170,0.06)', border: 'rgba(47,212,170,0.12)', color: 'var(--text-muted)', label: 'Completado' },
    ARCHIVADO: { bg: 'var(--elevated)', border: 'var(--border)', color: 'var(--text-muted)', label: 'Archivado' },
  }
  return map[estado] ?? map.ACTIVO
}

function timeAgo(d: Date | string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

export function SeguimientoCard({ data, index = 0 }: { data: SeguimientoCardData; index?: number }) {
  const badge = estadoBadge(data.estado)
  const nextReminder = data.recordatorios?.[0]
  const isAttention = data.estado === 'NECESITA_ATENCION'

  return (
    <Link
      href={`/seguimientos/${data.id}`}
      style={{
        display: 'block', textDecoration: 'none',
        background: 'var(--card)',
        border: `1px solid ${isAttention ? 'rgba(251,146,60,0.25)' : 'var(--border)'}`,
        borderRadius: 12, overflow: 'hidden',
        animation: `fade-up 0.4s ease ${0.05 + index * 0.06}s both`,
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Priority strip */}
      {isAttention && <div style={{ height: 2, background: 'var(--accent-orange)' }} />}

      <div style={{ padding: '12px 14px' }}>
        {/* Top row: title + estado */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: isAttention ? 'rgba(251,146,60,0.12)' : 'rgba(167,139,250,0.1)',
            border: `1px solid ${isAttention ? 'rgba(251,146,60,0.25)' : 'rgba(167,139,250,0.2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12,
          }}>
            {isAttention ? '⚠' : '📌'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.35, marginBottom: 3 }}>
              {data.titulo}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 9.5, padding: '1px 6px', borderRadius: 20,
                background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color,
                fontWeight: 600, letterSpacing: '0.03em',
              }}>
                {badge.label}
              </span>
              {data.proyecto && (
                <span style={{
                  fontSize: 9.5, padding: '1px 6px', borderRadius: 20,
                  background: `${data.proyecto.color}18`, color: data.proyecto.color,
                }}>
                  {data.proyecto.nombre}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
          <span>{data._count.items} items</span>
          <span>{data._count.entradas} entradas</span>
          <span style={{ marginLeft: 'auto', fontFamily: "'DM Mono', monospace", fontSize: 10 }}>
            {timeAgo(data.ultimaActividad)}
          </span>
        </div>

        {/* Next reminder */}
        {nextReminder && (
          <div style={{
            marginTop: 8, padding: '5px 10px', borderRadius: 8,
            background: 'rgba(165,180,252,0.06)', border: '1px solid rgba(165,180,252,0.12)',
            fontSize: 10.5, color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>🔔</span>
            <span>Próximo: {new Date(nextReminder.proximoDisparo).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
