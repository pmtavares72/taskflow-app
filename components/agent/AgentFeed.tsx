'use client'

import { useState, useEffect, useCallback } from 'react'
import { AgentCard } from './AgentCard'
import { SparkleIcon } from '@/components/ui/SparkleIcon'
import type { AgenteFeedItem } from '@/types'

interface Props {
  initialFeed: AgenteFeedItem[]
  filter?: 'all' | 'pending' | 'done'
}

export function AgentFeed({ initialFeed, filter = 'all' }: Props) {
  const [feed, setFeed] = useState<AgenteFeedItem[]>(initialFeed)
  const [loading, setLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState(filter)

  const fetchFeed = useCallback(async (f: string) => {
    setLoading(true)
    try {
      const estado = f === 'pending' ? 'pendiente' : f === 'done' ? 'aceptado' : undefined
      const url = estado ? `/api/agent/feed?estado=${estado}&limit=50` : '/api/agent/feed?limit=50'
      const res = await fetch(url)
      if (res.ok) setFeed(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeed(activeFilter)
  }, [activeFilter, fetchFeed])

  async function handleAccept(id: string) {
    await fetch(`/api/agent/feed/${id}/accept`, { method: 'PATCH' })
    setFeed(prev => prev.map(f => f.id === id ? { ...f, estado: 'aceptado' } : f))
  }

  async function handleReject(id: string) {
    await fetch(`/api/agent/feed/${id}/reject`, { method: 'PATCH' })
    setFeed(prev => prev.map(f => f.id === id ? { ...f, estado: 'rechazado' } : f))
  }

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'done', label: 'Procesados' },
  ] as const

  const pendingCount = feed.filter(f => f.estado === 'pendiente').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600,
              background: activeFilter === f.key ? 'var(--accent)' : 'var(--card)',
              color: activeFilter === f.key ? '#13141f' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            {f.label}
            {f.key === 'pending' && pendingCount > 0 && (
              <span style={{
                marginLeft: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 10,
                padding: '1px 6px', fontSize: 10,
              }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Feed list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Cargando...
        </div>
      ) : feed.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '60px 20px', gap: 12, textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
            color: 'var(--accent-purple)',
          }}>
            <SparkleIcon size={20} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Sin actividad de Nexus</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 260, lineHeight: 1.5 }}>
            Nexus analizará tus items y aparecerá aquí con sugerencias y acciones.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {feed.map((item, i) => (
            <AgentCard
              key={item.id}
              feed={item}
              onAccept={handleAccept}
              onReject={handleReject}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  )
}
