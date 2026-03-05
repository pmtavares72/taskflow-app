'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TIPOS = [
  { value: 'TASK', label: 'Tarea', icon: '✓' },
  { value: 'IDEA', label: 'Idea', icon: '💡' },
  { value: 'NOTE', label: 'Nota', icon: '📝' },
  { value: 'LINK', label: 'Enlace', icon: '🔗' },
  { value: 'EMAIL', label: 'Email', icon: '✉' },
]

export function QuickCapture() {
  const [value, setValue] = useState('')
  const [tipo, setTipo] = useState('TASK')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const titulo = value.trim()
    if (!titulo || loading) return

    setLoading(true)
    try {
      await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, estado: 'INBOX', tipo }),
      })
      setValue('')
      router.refresh()
    } catch {
      // silently fail — item capture should not block the user
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ padding: '14px 16px 10px', background: 'var(--surface)', animation: 'fade-up 0.4s ease both' }}
    >
      {/* Type selector */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 8, paddingLeft: 2 }}>
        {TIPOS.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTipo(t.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 9px', borderRadius: 20, cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif", fontSize: 11.5, fontWeight: 500,
              border: `1px solid ${tipo === t.value ? 'rgba(165,180,252,0.4)' : 'var(--border)'}`,
              background: tipo === t.value ? 'rgba(165,180,252,0.1)' : 'transparent',
              color: tipo === t.value ? '#a5b4fc' : 'var(--text-muted)',
              transition: 'all 0.12s',
            }}
          >
            <span style={{ fontSize: 10 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--card)', borderRadius: 24,
        padding: '10px 16px', boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border)',
        transition: 'border-color 0.15s',
      }}
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(47,212,170,0.3)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        {/* Edit icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>

        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Captura una idea, tarea o nota..."
          disabled={loading}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 400,
            color: 'var(--text)',
          }}
        />

        {/* Mic / send button */}
        <button
          type="submit"
          disabled={loading || !value.trim()}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: value.trim() ? '#a5b4fc' : 'var(--elevated)',
            border: 'none', cursor: value.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.15s',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {value.trim() ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#13141f" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
      </div>
    </form>
  )
}
