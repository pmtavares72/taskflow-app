import { db } from './db'
import { llmModel, generateObject } from './ai'
import { z } from 'zod'

const OPENCLAW_URL = process.env.OPENCLAW_URL
const OPENCLAW_HOOK_TOKEN = process.env.OPENCLAW_HOOK_TOKEN
const isMockMode = !OPENCLAW_URL

interface OpenClawHookPayload {
  message: string
  sessionKey: string
  wakeMode?: 'now' | 'next-heartbeat'
  deliver?: boolean
}

async function mockAgentResponse(message: string, itemId?: string): Promise<void> {
  const { object } = await generateObject({
    model: llmModel,
    schema: z.object({
      tipo:        z.enum(['sugerencia', 'accion', 'digest', 'completado']),
      titulo:      z.string(),
      descripcion: z.string(),
      prioridad:   z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      payload:     z.record(z.string(), z.unknown()),
    }),
    prompt: `Eres Nexus, el agente de productividad personal de TaskFlow.
Analiza la siguiente instrucción y genera una respuesta estructurada en español:

${message}

Sé conciso y útil. El payload puede contener datos adicionales relevantes como { itemId, accion, razon }.`,
  })

  await db.agenteFeed.create({
    data: {
      tipo:        object.tipo,
      titulo:      object.titulo,
      descripcion: object.descripcion,
      prioridad:   object.prioridad ?? null,
      payload:     (object.payload ?? {}) as object,
      itemId:      itemId ?? null,
      estado:      'pendiente',
    },
  })
}

async function requestAgentAction(payload: OpenClawHookPayload, itemId?: string) {
  if (isMockMode) {
    await mockAgentResponse(payload.message, itemId).catch(console.error)
    return { mocked: true }
  }
  const res = await fetch(`${OPENCLAW_URL}/hooks/agent`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENCLAW_HOOK_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Nexus hook failed: ${res.status}`)
  return res.json()
}

export async function requestInboxTriage(itemId: string) {
  return requestAgentAction({
    message: `Nuevo item en inbox de TaskFlow (id: ${itemId}). Analiza su contenido y sugiere tipo, prioridad, clasificación Eisenhower y proyecto.`,
    sessionKey: `hook:taskflow:triage:${itemId}`,
    wakeMode: 'now',
  }, itemId)
}

export async function requestDailyReview() {
  return requestAgentAction({
    message: `Ejecuta la revisión diaria de TaskFlow: lee tareas vencidas, items estancados >7 días, items en inbox. Genera un digesto con sugerencias.`,
    sessionKey: 'hook:taskflow:daily-review',
    wakeMode: 'now',
  })
}

export async function requestItemAnalysis(itemId: string, question: string) {
  return requestAgentAction({
    message: `Analiza el item ${itemId} de TaskFlow: ${question}`,
    sessionKey: `hook:taskflow:analysis:${itemId}`,
    wakeMode: 'now',
  }, itemId)
}
