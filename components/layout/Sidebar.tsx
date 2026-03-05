'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  {
    href: '/inbox',
    label: 'Inbox',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    ),
    badge: 3,
  },
  {
    href: '/kanban',
    label: 'Kanban',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="18" rx="1" />
        <rect x="14" y="3" width="7" height="11" rx="1" />
      </svg>
    ),
  },
  {
    href: '/eisenhower',
    label: 'Eisenhower',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    href: '/agent',
    label: 'Agente Nexus',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
    isAi: true,
  },
]

const PROJECTS = [
  { name: 'Pliegos Q1', color: '#60a5fa' },
  { name: 'Cliente García', color: '#4ade80' },
  { name: 'OpenClaw Dev', color: '#a78bfa' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      animation: 'slide-in-left 0.4s cubic-bezier(0.16,1,0.3,1) both',
    }}
      className="hidden md:flex"
    >
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 12 }}>
          Task<em style={{ color: 'var(--accent)', fontStyle: 'normal' }}>Flow</em>
        </div>

        {/* Quick capture button */}
        <button style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          background: '#a5b4fc', color: '#13141f', border: 'none',
          borderRadius: 8, padding: '7px 12px',
          fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600,
          cursor: 'pointer', transition: 'all 0.15s',
          boxShadow: '0 0 16px rgba(165,180,252,0.2)',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#818cf8'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(165,180,252,0.35)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#a5b4fc'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 16px rgba(165,180,252,0.2)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#13141f" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Captura rápida
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '10px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px 6px' }}>
          Vistas
        </div>
        {NAV_LINKS.map(({ href, label, icon, badge, isAi }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 10px', borderRadius: 8,
                textDecoration: 'none',
                color: active ? 'var(--accent)' : isAi ? 'var(--accent-purple)' : 'var(--text-sub)',
                background: active ? 'rgba(47,212,170,0.08)' : isAi ? 'rgba(167,139,250,0.04)' : 'transparent',
                border: active ? '1px solid rgba(47,212,170,0.12)' : '1px solid transparent',
                fontSize: 13, fontWeight: active ? 600 : 400,
                transition: 'all 0.15s', marginBottom: 2,
              }}
            >
              <span style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}>{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {badge && !active && (
                <span style={{
                  fontSize: 9, fontWeight: 700, color: '#13141f',
                  background: 'var(--accent-orange)', borderRadius: 20,
                  padding: '1px 5px', minWidth: 16, textAlign: 'center',
                }}>
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Projects */}
      <div style={{ padding: '0 8px 10px', flexShrink: 0 }}>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px 6px' }}>
          Proyectos
        </div>
        {PROJECTS.map(({ name, color }) => (
          <button key={name} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '6px 10px', borderRadius: 8, background: 'transparent',
            border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.15s',
            color: 'var(--text-sub)', fontSize: 12, fontWeight: 400, textAlign: 'left',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--elevated)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'; }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}80` }} />
            {name}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Agent autonomy */}
      <div style={{ padding: '10px 14px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Autonomía Nexus
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', fontFamily: "'DM Mono', monospace" }}>65%</span>
        </div>
        <div style={{ height: 4, background: 'var(--elevated)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: '65%', height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent-blue))', borderRadius: 4 }} />
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Modo copiloto</div>
      </div>
    </aside>
  )
}
