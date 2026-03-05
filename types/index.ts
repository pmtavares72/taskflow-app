export type { User, Project, Item, Adjunto, Relacion, Actividad, AgenteFeed, ApiKey } from '@prisma/client'
export { TipoItem, EstadoItem, Prioridad, Contexto, ProyectoEstado, TipoRelacion } from '@prisma/client'

export interface ItemWithRelations {
  id: string
  tipo: string
  titulo: string
  contenido: string | null
  estado: string
  prioridad: string
  eisenhowerUrgente: boolean
  eisenhowerImportante: boolean
  contexto: string
  etiquetas: string[]
  fechaLimite: Date | null
  fechaRecordatorio: Date | null
  notasAgente: string | null
  modificadoPor: string
  proyectoId: string | null
  proyecto: { id: string; nombre: string; color: string } | null
  adjuntos: { id: string; nombre: string; url: string; tipo: string; tamanio: number }[]
  actividad: { id: string; descripcion: string; autor: string; createdAt: Date }[]
  createdAt: Date
  updatedAt: Date
}

export interface AgenteFeedItem {
  id: string
  tipo: string
  titulo: string
  descripcion: string
  payload: Record<string, unknown>
  estado: string
  prioridad: string | null
  itemId: string | null
  createdAt: Date
}
