'use client'

import { SparkleIcon } from '@/components/ui/SparkleIcon'

export function AiPanel() {
  return (
    <aside
      className="ai-panel"
      style={{
        width: 280,
        flexShrink: 0,
        background: 'var(--sidebar-ai)',
        backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(167,139,250,0.07) 0%, transparent 60%)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slide-in-left 0.5s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      {/* Header */}
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Task<em style={{ color: 'var(--accent)', fontStyle: 'normal' }}>Flow</em>
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)',
            borderRadius: 20, padding: '3px 8px',
            fontSize: 9.5, fontWeight: 600, color: 'var(--accent-purple)',
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-purple)', animation: 'blink 2s ease-in-out infinite', display: 'inline-block' }} />
            AI
          </div>
        </div>

        {/* Bot identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(47,212,170,0.12)', border: '1px solid rgba(47,212,170,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)', flexShrink: 0,
            animation: 'pulse-glow 3s ease-in-out infinite',
          }}>
            <SparkleIcon size={16} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 1 }}>Nexus · OpenClaw</div>
            <div style={{ fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-dot 2s ease-in-out infinite', display: 'inline-block' }} />
              Copiloto · 65%
            </div>
          </div>
        </div>
      </div>

      {/* Chat / feed area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { delay: '0.3s', text: 'Hola, soy Nexus. Analicé tu tablero y encontré 3 puntos de atención.' },
          { delay: '0.5s', text: 'La propuesta técnica para Pliegos Q1 lleva 2 días sin avance. ¿Quieres que redacte un borrador?' },
        ].map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, animation: `msg-in 0.3s ease ${msg.delay} both` }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'rgba(47,212,170,0.1)', border: '1px solid rgba(47,212,170,0.2)',
              color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 2,
            }}>
              <SparkleIcon size={11} />
            </div>
            <div style={{
              background: 'var(--elevated)', border: '1px solid var(--border)',
              borderRadius: '4px 12px 12px 12px', padding: '9px 12px',
              fontSize: 12.5, color: 'var(--text-sub)', lineHeight: 1.55, maxWidth: 192,
            }}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* User message */}
        <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 8, animation: 'msg-in 0.3s ease 0.7s both' }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
            color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 2,
          }}>PT</div>
          <div style={{
            background: 'rgba(47,212,170,0.08)', border: '1px solid rgba(47,212,170,0.15)',
            borderRadius: '12px 4px 12px 12px', padding: '9px 12px',
            fontSize: 12.5, color: 'var(--text)', lineHeight: 1.55, maxWidth: 160,
          }}>
            Sí, hazlo. Prioridad alta.
          </div>
        </div>

        {/* Typing indicator */}
        <div style={{ display: 'flex', gap: 8, animation: 'msg-in 0.3s ease 0.9s both' }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'rgba(47,212,170,0.1)', border: '1px solid rgba(47,212,170,0.2)',
            color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: 2,
          }}>
            <SparkleIcon size={11} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: '4px 12px 12px 12px' }}>
            {[0, 0.2, 0.4].map((delay, i) => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: `typing 1.2s ease-in-out ${delay}s infinite`, display: 'inline-block' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Quick pills */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
          Acciones rápidas
        </div>
        {['📋 Ver pendientes del día', '⚡ Activar modo focus', '📊 Resumen de la semana'].map((label) => (
          <button key={label} style={{
            background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '7px 12px', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 500,
            color: 'var(--text-sub)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-sub)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chat input */}
      <div style={{ padding: '10px 14px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <input
          style={{
            flex: 1, background: 'var(--elevated)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '8px 14px', fontFamily: "'Outfit', sans-serif",
            fontSize: 13, color: 'var(--text)', outline: 'none',
          }}
          placeholder="Pregunta a Nexus..."
        />
        <button style={{
          width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 12px rgba(47,212,170,0.25)', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#13141f" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
