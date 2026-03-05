'use client'

import { useState } from 'react'
import { SparkleIcon } from '@/components/ui/SparkleIcon'

interface Props {
  autonomy: number
}

const MODES = [
  { value: 0, label: 'Manual', desc: 'Nexus solo analiza, nunca actúa', color: 'var(--text-muted)' },
  { value: 33, label: 'Asistente', desc: 'Sugiere, espera tu aprobación', color: 'var(--accent-blue)' },
  { value: 66, label: 'Copiloto', desc: 'Actúa en tareas de bajo riesgo', color: 'var(--accent-purple)' },
  { value: 100, label: 'Autónomo', desc: 'Gestión completa del inbox', color: 'var(--accent)' },
]

function getModeFromValue(v: number) {
  if (v <= 16) return MODES[0]
  if (v <= 49) return MODES[1]
  if (v <= 82) return MODES[2]
  return MODES[3]
}

export function AgentConfig({ autonomy: initialAutonomy }: Props) {
  const [autonomy, setAutonomy] = useState(initialAutonomy)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const mode = getModeFromValue(autonomy)

  async function save() {
    setSaving(true)
    try {
      await fetch('/api/settings/autonomy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentAutonomy: autonomy }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden',
      animation: 'fade-up 0.4s ease 0.1s both',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(167,139,250,0.05)',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)',
          color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <SparkleIcon size={15} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Configuración de Nexus</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>Ajusta el nivel de autonomía del agente</div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Current mode badge */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 12.5, color: 'var(--text-sub)' }}>Modo actual</div>
          <div style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: `${mode.color}18`, border: `1px solid ${mode.color}40`, color: mode.color,
          }}>
            {mode.label} · {autonomy}%
          </div>
        </div>

        {/* Slider */}
        <div style={{ marginBottom: 12 }}>
          <input
            type="range"
            min={0}
            max={100}
            value={autonomy}
            onChange={e => setAutonomy(Number(e.target.value))}
            style={{
              width: '100%', height: 6, borderRadius: 3, cursor: 'pointer',
              accentColor: 'var(--accent)', background: `linear-gradient(to right, var(--accent) ${autonomy}%, var(--border) ${autonomy}%)`,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {MODES.map(m => (
              <button
                key={m.value}
                onClick={() => setAutonomy(m.value)}
                style={{
                  fontSize: 10, color: getModeFromValue(autonomy).value === m.value ? m.color : 'var(--text-muted)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
                  fontFamily: "'Outfit', sans-serif", fontWeight: getModeFromValue(autonomy).value === m.value ? 700 : 400,
                  transition: 'color 0.2s',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mode description */}
        <div style={{
          padding: '10px 12px', borderRadius: 8, marginBottom: 16,
          background: `${mode.color}0d`, border: `1px solid ${mode.color}20`,
          fontSize: 12.5, color: 'var(--text-sub)', lineHeight: 1.5,
        }}>
          <strong style={{ color: mode.color }}>{mode.label}:</strong> {mode.desc}
        </div>

        {/* Capabilities by mode */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Capacidades activas
          </div>
          {[
            { label: 'Analizar items nuevos', threshold: 1 },
            { label: 'Sugerir prioridades', threshold: 1 },
            { label: 'Crear sugerencias de acción', threshold: 34 },
            { label: 'Mover items entre estados', threshold: 67 },
            { label: 'Gestionar inbox automáticamente', threshold: 84 },
          ].map(cap => {
            const active = autonomy >= cap.threshold
            return (
              <div key={cap.label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  background: active ? 'rgba(47,212,170,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${active ? 'rgba(47,212,170,0.3)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: active ? 'var(--accent)' : 'var(--text-muted)',
                }}>
                  {active ? '✓' : ''}
                </div>
                <span style={{ fontSize: 12, color: active ? 'var(--text-sub)' : 'var(--text-muted)' }}>
                  {cap.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Save button */}
        <button
          onClick={save}
          disabled={saving || autonomy === initialAutonomy}
          style={{
            width: '100%', padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600,
            background: saved ? 'rgba(165,180,252,0.15)' : '#a5b4fc', color: saved ? '#a5b4fc' : '#13141f',
            boxShadow: saved ? 'none' : '0 0 16px rgba(165,180,252,0.2)',
            opacity: (saving || autonomy === initialAutonomy) ? 0.6 : 1,
            transition: 'all 0.2s',
          }}
        >
          {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  )
}
