'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'drop' | 'meta' | 'done'

interface UploadedFile {
  id: string
  nombre: string
  url: string
  tipo: string
  tamanio: number
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  onClose: () => void
  itemId?: string
}

export function FileCapture({ onClose, itemId }: Props) {
  const [step, setStep] = useState<Step>('drop')
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null)
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const f = files[0]
    if (f.size > 20 * 1024 * 1024) { setError('El archivo excede el límite de 20MB'); return }
    setFile(f)
    setTitulo(f.name.replace(/\.[^.]+$/, ''))
    setError('')
    setStep('meta')
  }, [])

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  async function upload() {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (itemId) fd.append('itemId', itemId)

      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al subir')
      const data: UploadedFile = await res.json()
      setUploaded(data)

      // If no itemId, create a new item of type FILE
      if (!itemId) {
        await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titulo, contenido: contenido || undefined, tipo: 'FILE', estado: 'INBOX' }),
        })
      }
      setStep('done')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(13,14,31,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', animation: 'fade-up 0.15s ease both',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 460, background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        animation: 'fade-up 0.2s ease both',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>
            {step === 'drop' ? 'Adjuntar archivo' : step === 'meta' ? 'Detalles del archivo' : '¡Archivo subido!'}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '0 2px',
          }}>×</button>
        </div>

        <div style={{ padding: '20px 16px' }}>
          {/* Step 1: Drop zone */}
          {step === 'drop' && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                background: dragging ? 'rgba(47,212,170,0.05)' : 'var(--card)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>📎</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6, fontFamily: "'Outfit', sans-serif" }}>
                Arrastra un archivo aquí
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                o haz clic para seleccionar · Máx. 20MB
              </div>
              <input
                ref={inputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={e => handleFiles(e.target.files)}
              />
            </div>
          )}

          {/* Step 2: Meta */}
          {step === 'meta' && file && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* File info */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 24 }}>📎</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                    {formatBytes(file.size)} · {file.type || 'application/octet-stream'}
                  </div>
                </div>
                <button onClick={() => setStep('drop')} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 14, padding: '2px 6px',
                }}>
                  ×
                </button>
              </div>

              {!itemId && (
                <>
                  <div>
                    <label style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Título</label>
                    <input
                      value={titulo}
                      onChange={e => setTitulo(e.target.value)}
                      style={{
                        width: '100%', padding: '8px 12px', background: 'var(--card)',
                        border: '1px solid var(--border)', borderRadius: 8, outline: 'none',
                        color: 'var(--text)', fontFamily: "'Outfit', sans-serif", fontSize: 13,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }}>Notas (opcional)</label>
                    <textarea
                      value={contenido}
                      onChange={e => setContenido(e.target.value)}
                      rows={3}
                      placeholder="Describe el contenido del archivo..."
                      style={{
                        width: '100%', padding: '8px 12px', background: 'var(--card)',
                        border: '1px solid var(--border)', borderRadius: 8, outline: 'none',
                        color: 'var(--text)', fontFamily: "'Outfit', sans-serif", fontSize: 13,
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </>
              )}

              {error && (
                <div style={{ fontSize: 12, color: 'var(--urgent)', padding: '8px 12px', background: 'rgba(248,113,113,0.08)', borderRadius: 8 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setStep('drop')}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif", fontSize: 13,
                  }}
                >
                  Atrás
                </button>
                <button
                  onClick={upload}
                  disabled={uploading || !titulo.trim()}
                  style={{
                    flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none',
                    background: '#a5b4fc', color: '#13141f', cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600,
                    boxShadow: '0 0 16px rgba(165,180,252,0.2)',
                    opacity: (uploading || !titulo.trim()) ? 0.6 : 1,
                  }}
                >
                  {uploading ? 'Subiendo...' : 'Subir archivo'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 'done' && uploaded && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', margin: '0 auto 16px',
                background: 'rgba(47,212,170,0.1)', border: '1px solid rgba(47,212,170,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>
                ✓
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6, fontFamily: "'Outfit', sans-serif" }}>
                Archivo subido
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20 }}>
                {uploaded.nombre} · {formatBytes(uploaded.tamanio)}
              </div>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 24px', borderRadius: 8, border: 'none',
                  background: '#a5b4fc', color: '#13141f', cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 600,
                }}
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
