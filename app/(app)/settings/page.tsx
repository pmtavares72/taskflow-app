'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Settings = {
  user: {
    id: string
    name: string
    email: string
    inboundEmail: string | null
    agentAutonomy: number
    createdAt: string
    _count: { items: number; seguimientos: number; memorias: number; entradas: number }
  }
  system: {
    xaiApiKey: boolean
    llmModel: string
    openclawUrl: string | null
    openclawConfigured: boolean
    smtpDomain: string
    taskflowAgentKey: boolean
    taskflowInboundKey: boolean
  }
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: ok ? 'var(--accent)' : 'var(--urgent)',
      boxShadow: ok ? '0 0 6px rgba(47,212,170,0.4)' : '0 0 6px rgba(248,113,113,0.4)',
    }} />
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [autonomy, setAutonomy] = useState(50)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((data: Settings) => {
        setSettings(data)
        setAutonomy(data.user.agentAutonomy)
      })
  }, [])

  async function saveAutonomy(value: number) {
    setAutonomy(value)
    setSaving(true)
    await fetch('/api/settings/autonomy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentAutonomy: value }),
    })
    setSaving(false)
  }

  if (!settings) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Cargando...
      </div>
    )
  }

  const { user, system } = settings
  const autonomyLabel = autonomy === 0 ? 'Desactivado' : autonomy <= 30 ? 'Observador' : autonomy <= 60 ? 'Copiloto' : autonomy <= 90 ? 'Asistente' : 'Autónomo'

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 40px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ padding: '18px 0 16px', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
            Configuración
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Ajustes de perfil, agente Nexus y estado del sistema
          </p>
        </div>

        {/* Perfil */}
        <Section title="Perfil">
          <Row label="Nombre" value={user.name} />
          <Row label="Email" value={user.email} />
          <Row label="Email de entrada" value={user.inboundEmail ?? 'No configurado'} muted={!user.inboundEmail} />
        </Section>

        {/* Estadísticas */}
        <Section title="Datos">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <StatCard label="Items" value={user._count.items} />
            <StatCard label="Seguimientos" value={user._count.seguimientos} />
            <StatCard label="Entradas" value={user._count.entradas} />
            <StatCard label="Memoria" value={user._count.memorias} />
          </div>
        </Section>

        {/* Autonomía del agente */}
        <Section title="Agente Nexus">
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>Nivel de autonomía</span>
              <span style={{
                fontSize: 12, fontWeight: 600, color: 'var(--accent)',
                fontFamily: "'DM Mono', monospace",
              }}>
                {autonomy}% · {autonomyLabel}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={autonomy}
              onChange={e => saveAutonomy(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              <span>Desactivado</span>
              <span>Observador</span>
              <span>Copiloto</span>
              <span>Autónomo</span>
            </div>
          </div>
          <Row label="Modelo LLM" value={system.llmModel} mono />
        </Section>

        {/* Estado del sistema */}
        <Section title="Estado del sistema">
          <ConfigRow label="API Key xAI (Grok)" configured={system.xaiApiKey}
            hint={system.xaiApiKey ? 'Configurada en .env.local' : 'Falta XAI_API_KEY en .env.local — Nexus no puede analizar nada'}
          />
          <ConfigRow label="OpenClaw" configured={system.openclawConfigured}
            hint={system.openclawConfigured ? `Conectado: ${system.openclawUrl}` : 'No configurado — usando mock mode (LLM directo)'}
          />
          <ConfigRow label="SMTP Inbound Key" configured={system.taskflowInboundKey}
            hint={system.taskflowInboundKey ? 'Configurada' : 'Falta TASKFLOW_INBOUND_KEY en .env.local'}
          />
          <ConfigRow label="Agent Webhook Key" configured={system.taskflowAgentKey}
            hint={system.taskflowAgentKey ? 'Configurada' : 'Falta TASKFLOW_AGENT_KEY en .env.local'}
          />
          <ConfigRow label="Dominio SMTP" configured={true}
            hint={system.smtpDomain}
          />
        </Section>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
          Las keys del sistema se configuran en <code style={{ fontFamily: "'DM Mono', monospace", color: 'var(--accent)' }}>.env.local</code> en el servidor
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
      }}>
        {title}
      </div>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '4px 0', overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, mono, muted }: { label: string; value: string | number; mono?: boolean; muted?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 16px', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{
        fontSize: 13, color: muted ? 'var(--text-muted)' : 'var(--text)',
        fontFamily: mono ? "'DM Mono', monospace" : 'inherit',
        fontStyle: muted ? 'italic' : 'normal',
      }}>
        {value}
      </span>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      padding: '12px 16px', background: 'var(--card)', borderRadius: 8,
      border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: "'DM Mono', monospace" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function ConfigRow({ label, configured, hint }: { label: string; configured: boolean; hint: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px', borderBottom: '1px solid var(--border)',
    }}>
      <StatusDot ok={configured} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--text)' }}>{label}</div>
        <div style={{
          fontSize: 11, color: configured ? 'var(--text-muted)' : 'var(--urgent)',
          marginTop: 2,
        }}>
          {hint}
        </div>
      </div>
    </div>
  )
}
