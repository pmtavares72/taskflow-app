'use client'

import { useState } from 'react'
import { SparkleIcon } from '@/components/ui/SparkleIcon'
import type { AgenteFeedItem } from '@/types'

function priorityColor(p: string | null) {
  if (p === 'urgent' || p === 'high') return 'var(--urgent)'
  if (p === 'medium') return 'var(--accent-blue)'
  return 'var(--accent-purple)'
}

function tipoLabel(tipo: string) {
  const map: Record<string, string> = {
    sugerencia: 'Sugerencia', accion: 'Acción', digest: 'Resumen', completado: 'Completado',
  }
  return map[tipo] ?? tipo
}

function tipoStyle(tipo: string) {
  if (tipo === 'digest') return { bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)', color: 'var(--accent-blue)' }
  if (tipo === 'completado') return { bg: 'rgba(47,212,170,0.1)', border: 'rgba(47,212,170,0.2)', color: 'var(--accent)' }
  if (tipo === 'accion') return { bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.2)', color: 'var(--accent-orange)' }
  return { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)', color: 'var(--accent-purple)' }
}

function formatTime(d: Date | string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

interface Props {
  feed: AgenteFeedItem
  onAccept: (id: string) => void
  onReject: (id: string) => void
  index?: number
}

export function AgentCard({ feed, onAccept, onReject, index = 0 }: Props) {
  const [loading, setLoading] = useState(false)
  const ts = tipoStyle(feed.tipo)
  const isPending = feed.estado === 'pendiente'

  async function handle(action: 'accept' | 'reject') {
    setLoading(true)
    if (action === 'accept') onAccept(feed.id)
    else onReject(feed.id)
    setLoading(false)
  }

  return (
    <div style={{
      background: 'var(--card)', border: `1px solid ${isPending ? 'rgba(167,139,250,0.18)' : 'var(--border)'}`,
      borderRadius: 12, overflow: 'hidden',
      animation: `fade-up 0.4s ease ${0.05 + index * 0.06}s both`,
      opacity: !isPending ? 0.6 : 1,
    }}>
      {/* Priority strip */}
      <div style={{ height: 2, background: priorityColor(feed.prioridad) }} />

      <div style={{ padding: '12px 14px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
            color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SparkleIcon size={14} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--accent-purple)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Nexus
              </span>
              <span style={{
                fontSize: 9.5, padding: '1px 6px', borderRadius: 20,
                background: ts.bg, border: `1px solid ${ts.border}`, color: ts.color,
              }}>
                {tipoLabel(feed.tipo)}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: "'DM Mono', monospace" }}>
                {formatTime(feed.createdAt)}
              </span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.35 }}>{feed.titulo}</div>
          </div>
        </div>

        {/* Description */}
        <div style={{ fontSize: 12.5, color: 'var(--text-sub)', lineHeight: 1.55, marginBottom: isPending ? 10 : 0 }}>
          {feed.descripcion}
        </div>

        {/* Actions */}
        {isPending && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handle('accept')}
              disabled={loading}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600,
                cursor: 'pointer', background: '#a5b4fc', color: '#13141f',
                boxShadow: '0 0 10px rgba(165,180,252,0.2)', opacity: loading ? 0.7 : 1,
              }}
            >
              Aceptar
            </button>
            <button
              onClick={() => handle('reject')}
              disabled={loading}
              style={{
                padding: '6px 14px', borderRadius: 8,
                fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600,
                cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)',
                border: '1px solid var(--border)', opacity: loading ? 0.7 : 1,
              }}
            >
              Ignorar
            </button>
          </div>
        )}

        {!isPending && (
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
            {feed.estado === 'aceptado' ? '✓ Aceptado' : '✗ Ignorado'}
          </div>
        )}
      </div>
    </div>
  )
}
