import { requestInboxTriage, requestItemAnalysis, requestContextProcessing, requestSeguimientoReview } from './agent'
import { db } from './db'

async function shouldTriggerAgent(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { agentAutonomy: true } })
  return (user?.agentAutonomy ?? 50) > 0
}

export async function onItemCreated(itemId: string) {
  const item = await db.item.findUnique({ where: { id: itemId } })
  if (!item || !(await shouldTriggerAgent(item.userId))) return
  await requestInboxTriage(itemId)
}

export async function onItemStale(itemId: string, diasEstancado: number) {
  await requestItemAnalysis(
    itemId,
    `Este item lleva ${diasEstancado} días sin moverse. Evalúa si necesita atención y sugiere acción.`
  )
}

export async function onEmailReceived(itemId: string) {
  await requestItemAnalysis(
    itemId,
    'Email recibido. Clasifícalo, extrae acciones si las hay, y sugiere prioridad.'
  )
}

export async function onEntradaCreated(entradaId: string) {
  const entrada = await db.entradaContexto.findUnique({ where: { id: entradaId }, select: { userId: true } })
  if (!entrada || !(await shouldTriggerAgent(entrada.userId))) return
  await requestContextProcessing(entradaId)
}

export async function onSeguimientoStale(seguimientoId: string) {
  await requestSeguimientoReview(seguimientoId)
}
