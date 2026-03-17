import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'
import { generateText } from 'ai'
import { llmModel } from '@/lib/ai'

const FollowUpSchema = z.object({
  seguimientoId: z.string(),
  tema: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = FollowUpSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { seguimientoId, tema } = parsed.data

  // Fetch seguimiento with context
  const seg = await db.seguimiento.findFirst({
    where: { id: seguimientoId, userId: authResult.userId },
    include: {
      entradas: {
        select: { tipo: true, titulo: true, contenido: true, resumen: true, metadatos: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      contactos: {
        include: { contacto: { select: { nombre: true, email: true, empresa: true, cargo: true } } },
      },
      items: {
        where: { item: { estado: { in: ['WAITING', 'TODO', 'IN_PROGRESS'] } } },
        include: { item: { select: { titulo: true, estado: true, contenido: true, notasAgente: true } } },
      },
    },
  })

  if (!seg) return NextResponse.json({ error: 'Seguimiento no encontrado' }, { status: 404 })

  // Build context for LLM
  const entradasCtx = seg.entradas.map(e => {
    const fecha = new Date(e.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    return `[${fecha}] ${e.tipo}: "${e.titulo}"\n${e.resumen ?? e.contenido.slice(0, 300)}`
  }).join('\n\n')

  const contactosCtx = seg.contactos.map(cs =>
    `${cs.contacto.nombre}${cs.contacto.cargo ? ` (${cs.contacto.cargo})` : ''}${cs.contacto.empresa ? ` — ${cs.contacto.empresa}` : ''}${cs.rol ? ` [rol: ${cs.rol}]` : ''}`
  ).join('\n')

  const tareasCtx = seg.items.map(si =>
    `- "${si.item.titulo}" (${si.item.estado})${si.item.notasAgente ? ` — ${si.item.notasAgente.split('\n').pop()}` : ''}`
  ).join('\n')

  const user = await db.user.findUnique({ where: { id: authResult.userId }, select: { name: true, email: true } })

  const { text } = await generateText({
    model: llmModel,
    prompt: `Eres Nexus, el asistente de productividad de Pedro Tavares.
Pedro necesita un email de follow-up para el seguimiento: "${seg.titulo}"
${tema ? `Tema específico: "${tema}"` : ''}

═══ CONTEXTO DEL SEGUIMIENTO ═══
${entradasCtx}
═════════════════════════════════

Contactos involucrados:
${contactosCtx || '(ninguno)'}

Tareas pendientes:
${tareasCtx || '(ninguna)'}

═══ INSTRUCCIONES ═══
Genera un email de follow-up profesional en español que:
1. Sea cordial pero directo — Pedro quiere saber el estado actual
2. Mencione los puntos pendientes concretos (basándote en las tareas WAITING/TODO)
3. Pida actualización o próximos pasos
4. Sea breve (3-5 párrafos máximo)
5. Tono profesional pero cercano, como lo escribiría Pedro

Formato de respuesta (texto plano, NO incluir cabeceras To/From/Subject):
- Primera línea: SUBJECT: [asunto del email]
- Línea vacía
- Cuerpo del email (empezando con saludo)
- Firma: Pedro Tavares

IMPORTANTE: El destinatario del email será SOLO Pedro mismo (para revisión). NO incluyas destinatarios.`,
  })

  return NextResponse.json({
    text,
    destinatario: user?.email ?? 'pedro.tavares@timestampgroup.com',
  })
}
