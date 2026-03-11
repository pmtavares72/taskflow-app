export type {
  User, Project, Item, Adjunto, Relacion, Actividad, AgenteFeed, ApiKey,
  Seguimiento, SeguimientoItem, EntradaContexto, Recordatorio,
} from '@prisma/client'

export {
  TipoItem, EstadoItem, Prioridad, Contexto, ProyectoEstado, TipoRelacion,
  EstadoSeguimiento, TipoEntrada, TipoRecurrencia,
} from '@prisma/client'

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
  seguimientoId: string | null
  createdAt: Date
}

export interface SeguimientoWithRelations {
  id: string
  titulo: string
  descripcion: string | null
  estado: string
  contexto: string
  prioridad: string
  ultimaActividad: Date
  proximaRevision: Date | null
  proyectoId: string | null
  proyecto: { id: string; nombre: string; color: string } | null
  items: { id: string; item: { id: string; titulo: string; estado: string; prioridad: string; tipo: string } }[]
  entradas: { id: string; tipo: string; titulo: string; resumen: string | null; createdAt: Date }[]
  recordatorios: { id: string; mensaje: string; proximoDisparo: Date; activo: boolean; tipoRecurrencia: string }[]
  _count: { items: number; entradas: number }
  createdAt: Date
  updatedAt: Date
}
