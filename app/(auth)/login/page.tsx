'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      setError('Email o contraseña incorrectos')
    } else {
      router.push('/inbox')
    }
  }

  return (
    <>
      <style>{`
        html, body { height: 100%; }
        body {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background-color: var(--bg);
          background-image:
            radial-gradient(ellipse 80% 60% at 15% 0%, rgba(167,139,250,0.18) 0%, transparent 55%),
            radial-gradient(ellipse 60% 80% at 90% 100%, rgba(47,212,170,0.14) 0%, transparent 55%),
            radial-gradient(ellipse 50% 50% at 85% 15%, rgba(96,165,250,0.10) 0%, transparent 50%),
            radial-gradient(circle, rgba(255,255,255,0.018) 1px, transparent 1px);
          background-size: auto, auto, auto, 22px 22px;
        }
      `}</style>

      {/* Ambient orbs */}
      <div style={{
        position: 'fixed', width: 800, height: 800, top: -250, left: -200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(167,139,250,0.20) 0%, transparent 60%)',
        filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0,
        animation: 'drift 22s ease-in-out infinite',
      }} />
      <div style={{
        position: 'fixed', width: 700, height: 700, bottom: -200, right: -150, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(47,212,170,0.18) 0%, transparent 60%)',
        filter: 'blur(110px)', pointerEvents: 'none', zIndex: 0,
        animation: 'drift 18s ease-in-out infinite reverse',
      }} />

      {/* Login card */}
      <div className="animate-fade-up" style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 420,
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(167,139,250,0.30), 0 0 50px rgba(167,139,250,0.14), 0 0 100px rgba(47,212,170,0.08)',
      }}>
        {/* Aurora strip */}
        <div style={{
          height: 4,
          background: 'linear-gradient(90deg, var(--accent-purple) 0%, var(--accent-blue) 30%, var(--accent) 60%, var(--accent-green) 80%, var(--accent-purple) 100%)',
          backgroundSize: '300% 100%',
          animation: 'aurora 5s linear infinite',
        }} />

        <div style={{
          background: 'var(--elevated)', padding: '36px 36px 32px',
          display: 'flex', flexDirection: 'column', position: 'relative',
        }}>
          {/* Dot mesh overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }} />
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 160, pointerEvents: 'none', zIndex: 0,
            background: 'linear-gradient(180deg, rgba(167,139,250,0.07) 0%, transparent 100%)',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Logo */}
            <div style={{ marginBottom: 28 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 44, height: 44,
                background: 'rgba(47,212,170,0.15)', border: '1px solid rgba(47,212,170,0.25)',
                borderRadius: 13, marginBottom: 18,
                boxShadow: '0 0 20px rgba(47,212,170,0.12)',
              }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </div>
              <span style={{ display: 'block', fontFamily: 'Outfit', fontSize: 30, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 10 }}>
                Task<em style={{ color: 'var(--accent)', fontStyle: 'normal' }}>Flow</em>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                Tu copiloto de productividad con IA
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)',
                  borderRadius: 20, padding: '3px 9px', fontSize: 10, fontWeight: 600,
                  color: 'var(--accent-purple)', letterSpacing: '0.05em',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-purple)', animation: 'blink 2s ease-in-out infinite', display: 'inline-block' }} />
                  Nexus
                </span>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '22px 0' }} />

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ptavares@openclaw.io"
                  required
                  style={{
                    width: '100%', background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '11px 14px', fontFamily: 'Outfit', fontSize: 14,
                    color: 'var(--text)', outline: 'none',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(47,212,170,0.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(47,212,170,0.10)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%', background: 'var(--card)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '11px 40px 11px 14px', fontFamily: 'Outfit', fontSize: 14,
                      color: 'var(--text)', outline: 'none',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(47,212,170,0.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(47,212,170,0.10)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{
                    position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    display: 'flex', padding: 4,
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {showPw
                        ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                      }
                    </svg>
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--urgent)' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', background: '#a5b4fc', color: '#13141f',
                  border: 'none', borderRadius: 10, padding: 13,
                  fontFamily: 'Outfit', fontSize: 14, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 0 24px rgba(165,180,252,0.25), 0 4px 14px rgba(0,0,0,0.35)',
                  opacity: loading ? 0.8 : 1,
                  transition: 'all 0.18s',
                }}
              >
                {loading
                  ? <span style={{ width: 17, height: 17, border: '2px solid rgba(19,20,31,0.25)', borderTopColor: '#13141f', borderRadius: '50%', animation: 'spin 0.65s linear infinite', display: 'inline-block' }} />
                  : <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
                      Acceder a TaskFlow
                    </>
                }
              </button>
            </form>

            <div style={{ marginTop: 22, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              Agente Nexus activo · OpenClaw Platform
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes aurora { 0% { background-position: 0% 50%; } 100% { background-position: 300% 50%; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes drift { 0%, 100% { transform: translate(0, 0); } 33% { transform: translate(30px, -35px); } 66% { transform: translate(-20px, 20px); } }
      `}</style>
    </>
  )
}
