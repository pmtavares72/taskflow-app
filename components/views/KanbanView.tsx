'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useRouter } from 'next/navigation'
import { ItemCard } from '@/components/items/ItemCard'
import { ItemDetailPanel } from '@/components/items/ItemDetailPanel'
import { NewItemPanel } from '@/components/items/NewItemPanel'
import type { ItemWithRelations } from '@/types'

// Renders the dragged item in document.body to avoid transform context issues
function PortalAwareItem({ provided, snapshot, children }: {
  provided: Parameters<Parameters<typeof Draggable>[0]['children']>[0]
  snapshot: Parameters<Parameters<typeof Draggable>[0]['children']>[1]
  children: React.ReactNode
}) {
  const portalRef = useRef<HTMLElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    portalRef.current = document.body
    setMounted(true)
  }, [])

  const child = (
    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
      {children}
    </div>
  )

  if (snapshot.isDragging && mounted && portalRef.current) {
    return createPortal(child, portalRef.current)
  }

  return child
}

const PRIO_ORDER: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 }
function sortByPriority(arr: ItemWithRelations[]) {
  return [...arr].sort((a, b) => (PRIO_ORDER[b.prioridad] ?? 0) - (PRIO_ORDER[a.prioridad] ?? 0))
}

type KanbanState = 'TODO' | 'IN_PROGRESS' | 'WAITING' | 'DONE'

const COLUMNS: { id: KanbanState; label: string; dotColor: string; dotClass: string }[] = [
  { id: 'TODO', label: 'Por hacer', dotColor: 'var(--text-muted)', dotClass: 'neutral' },
  { id: 'IN_PROGRESS', label: 'En progreso', dotColor: 'var(--accent-blue)', dotClass: 'blue' },
  { id: 'WAITING', label: 'Esperando', dotColor: 'var(--accent-orange)', dotClass: 'orange' },
  { id: 'DONE', label: 'Hecho', dotColor: 'var(--accent)', dotClass: 'teal' },
]

interface Props {
  initialItems: ItemWithRelations[]
}

export function KanbanView({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems)
  const [selectedItem, setSelectedItem] = useState<ItemWithRelations | null>(null)
  const [newItemEstado, setNewItemEstado] = useState<KanbanState | null>(null)
  const router = useRouter()

  function getColumnItems(colId: KanbanState) {
    return sortByPriority(items.filter(i => i.estado === colId))
  }

  async function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newState = destination.droppableId as KanbanState

    // Optimistic update
    setItems(prev =>
      prev.map(item =>
        item.id === draggableId ? { ...item, estado: newState } : item
      )
    )

    await fetch(`/api/items/${draggableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: newState }),
    }).catch(() => {
      // Revert on error
      setItems(initialItems)
    })

    router.refresh()
  }

  return (
    <>
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{
        display: 'flex', gap: 12, height: '100%',
        overflowX: 'auto', overflowY: 'hidden', paddingBottom: 16,
      }}>
        {COLUMNS.map((col, colIndex) => {
          const colItems = getColumnItems(col.id)
          return (
            <div key={col.id} style={{
              flexShrink: 0, width: 230, display: 'flex', flexDirection: 'column',
              gap: 8, height: '100%',
              animation: `col-in 0.5s cubic-bezier(0.16,1,0.3,1) ${0.1 + colIndex * 0.05}s both`,
            }}>
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 4px 2px', flexShrink: 0 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: col.dotColor,
                  boxShadow: col.dotClass !== 'neutral' ? `0 0 8px ${col.dotColor}80` : 'none',
                }} />
                <div style={{
                  fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)',
                  letterSpacing: '0.1em', textTransform: 'uppercase', flex: 1,
                }}>
                  {col.label}
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                  background: 'var(--elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)',
                }}>
                  {colItems.length}
                </div>
              </div>

              {/* Droppable area */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      flex: 1, overflowY: 'auto', display: 'flex',
                      flexDirection: 'column', gap: 7, paddingRight: 2,
                      background: snapshot.isDraggingOver ? 'rgba(47,212,170,0.03)' : 'transparent',
                      borderRadius: 10, transition: 'background 0.15s',
                      minHeight: 80,
                    }}
                  >
                    {colItems.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <PortalAwareItem provided={provided} snapshot={snapshot}>
                            <ItemCard
                              item={item}
                              index={index}
                              isDragging={snapshot.isDragging}
                              onClick={() => !snapshot.isDragging && setSelectedItem(item)}
                            />
                          </PortalAwareItem>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {/* Add card button */}
                    <button
                      onClick={() => setNewItemEstado(col.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px',
                        border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 10,
                        background: 'transparent', color: 'var(--text-muted)',
                        fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 500,
                        cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.15s',
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.borderColor = 'rgba(47,212,170,0.2)'
                        el.style.color = 'var(--accent)'
                        el.style.background = 'rgba(47,212,170,0.04)'
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.borderColor = 'rgba(255,255,255,0.1)'
                        el.style.color = 'var(--text-muted)'
                        el.style.background = 'transparent'
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Añadir tarea
                    </button>
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>

    {selectedItem && (
      <ItemDetailPanel
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={updated => {
          setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, ...updated } : i))
          setSelectedItem(prev => prev ? { ...prev, ...updated } : null)
        }}
      />
    )}

    {newItemEstado && (
      <NewItemPanel
        initialEstado={newItemEstado}
        onClose={() => setNewItemEstado(null)}
        onCreated={item => setItems(prev => [...prev, item])}
      />
    )}
    </>
  )
}
