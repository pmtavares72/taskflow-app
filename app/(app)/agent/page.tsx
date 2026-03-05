import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { AgentFeed } from '@/components/agent/AgentFeed'
import { AgentConfig } from '@/components/agent/AgentConfig'
import { SparkleIcon } from '@/components/ui/SparkleIcon'
import type { AgenteFeedItem } from '@/types'

export default async function AgentPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [feed, user] = await Promise.all([
    db.agenteFeed.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { agentAutonomy: true },
    }),
  ])

  const pendingCount = feed.filter(f => f.estado === 'pendiente').length
  const autonomy = user?.agentAutonomy ?? 50

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', background: 'rgba(26,27,46,0.8)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
            color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SparkleIcon size={12} />
          </div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Agente Nexus
          </div>
          {pendingCount > 0 && (
            <div style={{
              padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)',
              color: 'var(--accent-orange)',
            }}>
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        <div style={{
          fontSize: 11, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace",
          padding: '4px 10px', borderRadius: 6, background: 'var(--card)', border: '1px solid var(--border)',
        }}>
          Autonomía · {autonomy}%
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start',
        }}>
          {/* Feed column */}
          <div>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{
                fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700,
                color: 'var(--text)', margin: 0, marginBottom: 4,
              }}>
                Feed de actividad
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                Sugerencias, acciones y resúmenes generados por Nexus
              </p>
            </div>
            <AgentFeed initialFeed={feed as unknown as AgenteFeedItem[]} />
          </div>

          {/* Config column */}
          <div style={{ position: 'sticky', top: 0 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{
                fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700,
                color: 'var(--text)', margin: 0, marginBottom: 4,
              }}>
                Configuración
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                Ajusta cómo actúa Nexus
              </p>
            </div>
            <AgentConfig autonomy={autonomy} />

            {/* Stats card */}
            <div style={{
              marginTop: 16, background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 16px',
              animation: 'fade-up 0.4s ease 0.2s both',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Estadísticas
              </div>
              {[
                { label: 'Total acciones', value: feed.length },
                { label: 'Aceptadas', value: feed.filter(f => f.estado === 'aceptado').length },
                { label: 'Ignoradas', value: feed.filter(f => f.estado === 'rechazado').length },
                { label: 'Pendientes', value: pendingCount },
              ].map(stat => (
                <div key={stat.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-sub)' }}>{stat.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: "'DM Mono', monospace" }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
