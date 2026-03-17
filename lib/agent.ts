import { db } from './db'
import { llmModel, generateObject } from './ai'
import { z } from 'zod'
import { extractMemoryFromEntry, getRelevantMemory } from './memory'

const OPENCLAW_URL = process.env.OPENCLAW_URL
const OPENCLAW_HOOK_TOKEN = process.env.OPENCLAW_HOOK_TOKEN
const isMockMode = !OPENCLAW_URL

interface OpenClawHookPayload {
  message: string
  sessionKey: string
  wakeMode?: 'now' | 'next-heartbeat'
  deliver?: boolean
}

async function mockAgentResponse(message: string, itemId?: string, userId?: string): Promise<void> {
  // Inject professional memory context if available
  let memoryBlock = ''
  if (userId) {
    const memory = await getRelevantMemory(userId, { texto: message })
    if (memory) memoryBlock = `\n═══ TU MEMORIA SOBRE PEDRO ═══\n${memory}\n═══════════════════════════\n\n`
  }

  const { object } = await generateObject({
    model: llmModel,
    schema: z.object({
      tipo:        z.enum(['sugerencia', 'accion', 'digest', 'completado']),
      titulo:      z.string(),
      descripcion: z.string(),
      prioridad:   z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      payload:     z.record(z.string(), z.unknown()),
    }),
    prompt: `Eres Nexus, el agente de productividad personal de Pedro Tavares en TaskFlow.
${memoryBlock}Analiza la siguiente instrucción y genera una respuesta estructurada en español:

${message}

Usa tu memoria para dar contexto más rico. Si mencionan una persona, proyecto o tema que conoces, incorpora lo que sabes.
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

async function requestAgentAction(payload: OpenClawHookPayload, itemId?: string, userId?: string) {
  if (isMockMode) {
    await mockAgentResponse(payload.message, itemId, userId).catch(console.error)
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
  const item = await db.item.findUnique({ where: { id: itemId }, select: { userId: true } })
  return requestAgentAction({
    message: `Nuevo item en inbox de TaskFlow (id: ${itemId}). Analiza su contenido y sugiere tipo, prioridad, clasificación Eisenhower y proyecto.`,
    sessionKey: `hook:taskflow:triage:${itemId}`,
    wakeMode: 'now',
  }, itemId, item?.userId)
}

export async function requestDailyReview(userId?: string) {
  return requestAgentAction({
    message: `Ejecuta la revisión diaria de TaskFlow: lee tareas vencidas, items estancados >7 días, items en inbox. Genera un digesto con sugerencias.`,
    sessionKey: 'hook:taskflow:daily-review',
    wakeMode: 'now',
  }, undefined, userId)
}

export async function requestItemAnalysis(itemId: string, question: string) {
  const item = await db.item.findUnique({ where: { id: itemId }, select: { userId: true } })
  return requestAgentAction({
    message: `Analiza el item ${itemId} de TaskFlow: ${question}`,
    sessionKey: `hook:taskflow:analysis:${itemId}`,
    wakeMode: 'now',
  }, itemId, item?.userId)
}

// ─── Seguimientos: Procesamiento de contexto ───

export async function requestContextProcessing(entradaId: string) {
  const entrada = await db.entradaContexto.findUnique({
    where: { id: entradaId },
    include: { seguimiento: { select: { id: true, titulo: true } } },
  })
  if (!entrada) return

  // Detect if this is a forwarded email with user instructions at the top
  const forwardMarkers = [
    '---------- Forwarded message',
    '---------- Mensaje reenviado',
    '-------- Original Message',
    '-------- Mensaje original',
    '-----Original Message',
    '\n> De:',
    '\n> From:',
    '\nDe: ',  // our own header from inbound-email
  ]

  let userInstructions = ''
  let emailContent = entrada.contenido

  // Check if there's text before the forwarded content
  const headerEndIdx = entrada.contenido.indexOf('---\n')
  const bodyAfterHeader = headerEndIdx >= 0 ? entrada.contenido.slice(headerEndIdx + 4) : entrada.contenido

  for (const marker of forwardMarkers) {
    const idx = bodyAfterHeader.indexOf(marker)
    if (idx > 5) { // at least 5 chars of user text before the forward marker
      const candidate = bodyAfterHeader.slice(0, idx).trim()
      // Ignore if it's just a signature (lines starting with --, or only whitespace/short fragments)
      const meaningfulText = candidate.replace(/^--\s*[\s\S]*$/m, '').replace(/[\r\n]+/g, ' ').trim()
      if (meaningfulText.length > 3) {
        userInstructions = meaningfulText
        break
      }
    }
  }

  // Also detect "Nexus, ..." at the start of the content (even without forward markers)
  // This handles messages from Telegram/WhatsApp where Pedro writes directly to Nexus
  if (!userInstructions) {
    const firstLine = bodyAfterHeader.split('\n')[0]?.trim() ?? ''
    const nexusPrefix = /^nexus[\s,:;.\-]+/i
    if (nexusPrefix.test(firstLine)) {
      // The whole first paragraph (up to double newline) is user instruction
      const paraEnd = bodyAfterHeader.indexOf('\n\n')
      userInstructions = (paraEnd > 0 ? bodyAfterHeader.slice(0, paraEnd) : firstLine).trim()
    }
  }

  // Quick context detection based on keywords (to fetch only relevant memory)
  const textoLower = entrada.contenido.toLowerCase()
  const personalKeywords = ['hijo', 'hija', 'colegio', 'cole', 'pediatra', 'médico', 'doctor', 'familia', 'casa', 'hogar', 'cumpleaños', 'vacaciones', 'extraescolar', 'whatsapp', 'padres', 'mamá', 'papá', 'niño', 'niña', 'dentista', 'gimnasio', 'pádel', 'amigo']
  const isLikelyPersonal = personalKeywords.some(k => textoLower.includes(k))
  const preContexto = isLikelyPersonal ? 'PERSONAL' as const : 'TRABAJO' as const

  // Fetch memory filtered by detected context (saves tokens)
  const memoryContext = await getRelevantMemory(entrada.userId, { texto: entrada.contenido, contexto: preContexto })

  // Fetch existing items linked to the seguimiento (or all recent open tasks)
  const itemSelect = {
    id: true, titulo: true, tipo: true, estado: true, prioridad: true,
    contenido: true, notasAgente: true, fechaLimite: true, createdAt: true,
  }
  let existingItems: { id: string; titulo: string; tipo: string; estado: string; prioridad: string; contenido: string | null; notasAgente: string | null; fechaLimite: Date | null; createdAt: Date }[] = []
  if (entrada.seguimientoId) {
    const segItems = await db.seguimientoItem.findMany({
      where: { seguimientoId: entrada.seguimientoId },
      include: { item: { select: itemSelect } },
    })
    existingItems = segItems.map(si => si.item).filter(i => i.tipo === 'TASK')
  } else {
    existingItems = await db.item.findMany({
      where: { userId: entrada.userId, tipo: 'TASK', estado: { in: ['INBOX', 'TODO', 'IN_PROGRESS', 'WAITING'] } },
      select: itemSelect,
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
  }

  const existingItemsBlock = existingItems.length > 0
    ? existingItems.map(i => {
        let line = `  - [${i.id}] "${i.titulo}" (estado: ${i.estado}, prioridad: ${i.prioridad})`
        if (i.contenido) line += `\n    Detalle: ${i.contenido.slice(0, 150)}`
        if (i.notasAgente) line += `\n    Notas: ${i.notasAgente.split('\n').pop()?.slice(0, 150)}`
        if (i.fechaLimite) line += `\n    Fecha límite: ${i.fechaLimite.toISOString().split('T')[0]}`
        return line
      }).join('\n')
    : '(ninguno)'

  const { object } = await generateObject({
    model: llmModel,
    schema: z.object({
      resumen: z.string(),
      contextoDetectado: z.enum(['TRABAJO', 'PERSONAL', 'AMBOS']).describe('Contexto general del contenido: TRABAJO si es profesional/laboral, PERSONAL si es vida privada (familia, hijos, colegio, salud, hogar, etc.), AMBOS si mezcla ambos'),
      accionesExtraidas: z.array(z.object({
        titulo: z.string(),
        tipo: z.enum(['TASK', 'NOTE', 'IDEA']),
        estado: z.enum(['INBOX', 'TODO', 'IN_PROGRESS', 'WAITING']).describe('Estado inicial: TODO si es acción clara para Pedro, WAITING si espera respuesta de otro, IN_PROGRESS si ya se está trabajando, INBOX solo si no queda claro qué hacer'),
        prioridad: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
        contexto: z.enum(['TRABAJO', 'PERSONAL', 'AMBOS']).describe('Contexto de ESTA acción específica: PERSONAL si es familia/hijos/colegio/salud/hogar, TRABAJO si es profesional/laboral'),
        eisenhowerUrgente: z.boolean().describe('¿Es urgente? Tiene deadline cercano o requiere acción inmediata'),
        eisenhowerImportante: z.boolean().describe('¿Es importante? Tiene impacto alto en objetivos o resultados'),
        fechaLimite: z.string().optional(),
        persona: z.string().optional(),
        notaContexto: z.string().optional().describe('Breve nota explicando de dónde viene esta tarea y qué contexto tiene'),
      })),
      fechasClave: z.array(z.object({
        fecha: z.string(),
        descripcion: z.string(),
      })),
      temas: z.array(z.string()),
      contactos: z.array(z.object({
        nombre: z.string(),
        email: z.string().optional(),
        telefono: z.string().optional(),
        empresa: z.string().optional(),
        cargo: z.string().optional(),
        rol: z.string().optional().describe('Rol en el contexto: cliente, fabricante, partner, interno, proveedor'),
        notaIntel: z.string().optional().describe('Info relevante sobre esta persona que se deduce del contenido: qué dijo, qué hizo, su postura, decisiones, compromisos, preferencias, datos útiles para futuras interacciones. Solo si hay algo concreto y útil.'),
      })),
      actualizacionesItems: z.array(z.object({
        itemId: z.string().describe('ID exacto del item existente a actualizar'),
        nuevoEstado: z.enum(['INBOX', 'TODO', 'IN_PROGRESS', 'WAITING', 'DONE', 'ARCHIVED']),
        razon: z.string().describe('Breve explicación de por qué cambia el estado'),
      })).describe('Items EXISTENTES cuyo estado debe cambiar según el nuevo contenido'),
      seguimientoSugerido: z.string().optional(),
    }),
    prompt: `Eres Nexus, el agente de productividad personal de Pedro Tavares en TaskFlow.
Fecha actual: ${new Date().toISOString().split('T')[0]}
${memoryContext ? `
═══ TU MEMORIA SOBRE PEDRO (usa esto para dar contexto más rico) ═══
${memoryContext}
═══════════════════════════════════════════════════════════════════
` : ''}
${entrada.seguimiento ? `Este contenido pertenece al seguimiento: "${entrada.seguimiento.titulo}"` : 'Este contenido NO está vinculado a ningún seguimiento aún.'}

═══ TAREAS EXISTENTES (pueden necesitar actualización) ═══
${existingItemsBlock}
═══════════════════════════════════════════════════════════

Tipo de contenido: ${entrada.tipo}
Asunto: "${entrada.titulo}"
${userInstructions ? `
⚠️ NOTA DE PEDRO (texto que él añadió al reenviar/enviar esto):
"${userInstructions}"

IMPORTANTE sobre la nota de Pedro:
- La nota es CONTEXTO ADICIONAL o una instrucción que COMPLEMENTA el contenido reenviado
- SIEMPRE procesa el contenido completo del email/cadena para extraer tareas, contactos, fechas, etc.
- La nota de Pedro en sí NO debe convertirse en tarea, pero sí úsala para entender mejor el contexto
- Si Pedro da una instrucción ("seguir esto", "pendiente", "importante", "haz X"), aplícala AL CONTENIDO reenviado
- Si Pedro da información ("este es el contacto de X", "para que sepas") → guárdala en memoria Y sigue procesando el contenido completo
` : ''}
Contenido completo:
---
${emailContent}
---

Analiza TODO el contenido y extrae:
0. CONTEXTO — detecta si el contenido es TRABAJO (profesional, laboral, negocios, proyectos) o PERSONAL (familia, hijos, colegio, salud, hogar, amigos, ocio, citas médicas). Si mezcla ambos, usa AMBOS. Ejemplos:
   - WhatsApp del chat del colegio de los hijos → PERSONAL
   - Email de un proveedor sobre entrega → TRABAJO
   - Mensaje personal de un compañero de trabajo sobre cena → PERSONAL
   Cada acción extraída también debe tener su propio contexto (una entrada de TRABAJO puede tener alguna acción PERSONAL y viceversa).
1. Resumen conciso (2-3 frases). Si el usuario dio instrucciones, mencionarlas primero. Si conoces a las personas mencionadas de tu memoria, añade contexto.
2. Acciones concretas NUEVAS para Pedro (con tipo, prioridad, fecha límite si se menciona, y persona responsable si aplica). NO dupliques tareas que ya existen en la lista de arriba.
   Para cada acción, decide:
   a) ESTADO KANBAN — asigna el estado correcto directamente:
      - TODO: acción clara que Pedro debe hacer (lo más común)
      - WAITING: Pedro ya hizo su parte y espera respuesta/acción de alguien más
      - IN_PROGRESS: el email indica que alguien ya está trabajando en esto
      - INBOX: solo si realmente no queda claro qué hacer con esto
   b) CLASIFICACIÓN EISENHOWER — clasifica por separado urgente e importante:
      - eisenhowerUrgente = true si tiene deadline cercano, requiere respuesta inmediata, o hay presión de tiempo
      - eisenhowerImportante = true si tiene alto impacto en objetivos, resultados de negocio, o relaciones clave
      Ejemplo: "Preparar propuesta para cliente grande (deadline en 2 semanas)" → urgente: false, importante: true
      Ejemplo: "Responder email urgente del proveedor sobre entrega mañana" → urgente: true, importante: false
   c) NOTA DE CONTEXTO — en notaContexto explica brevemente de dónde sale esta tarea, quién la pidió, y cualquier contexto útil
3. Fechas clave (reuniones, deadlines, entregas)
4. Temas/keywords principales
5. Contactos mencionados: TODAS las personas que aparezcan en el contenido con su nombre, email, teléfono, empresa, cargo y rol en el contexto (cliente, fabricante, partner, interno, proveedor). NO incluyas a Pedro Tavares.
   Para cada contacto, añade en notaIntel cualquier información útil que se deduzca de este contenido:
   - Qué dijo o decidió esta persona
   - Su postura o actitud respecto al tema
   - Compromisos que asumió
   - Datos personales o profesionales relevantes (horarios, preferencias, especialidades)
   - Relaciones con otras personas o empresas
   Solo incluye notaIntel si hay algo concreto — no inventes. Esto construye un perfil progresivo del contacto.
6. Actualizaciones de items EXISTENTES: revisa las tareas existentes de arriba CON SU CONTEXTO COMPLETO (detalle, notas, fecha). Si el contenido indica que alguna tarea cambió de situación, inclúyela en actualizacionesItems con el itemId exacto, el nuevo estado, y una RAZÓN DETALLADA.

   Transiciones posibles:
   - TODO → WAITING: Pedro ya hizo su parte y espera respuesta de alguien
   - TODO → IN_PROGRESS: alguien está trabajando activamente en esto
   - TODO → DONE: la tarea se completó (evidencia clara en el contenido)
   - WAITING → DONE: la respuesta/información que se ESPERABA ya llegó (ver regla especial abajo)
   - WAITING → TODO: la espera terminó y ahora Pedro tiene que actuar
   - IN_PROGRESS → DONE: el trabajo se completó
   - Cualquier estado → ARCHIVED: se canceló o ya no aplica

   ⚠️ REGLA ESPECIAL PARA TAREAS WAITING:
   Una tarea WAITING significa "Pedro espera una respuesta o acción de alguien". Cuando ESA RESPUESTA LLEGA:
   → Marca la tarea WAITING como DONE (la espera terminó, se recibió respuesta)
   → Si la respuesta abre una NUEVA espera diferente, crea una NUEVA tarea WAITING

   DONE en WAITING = "la espera terminó" (recibimos respuesta), NO "se logró el objetivo".
   Ejemplo:
   - Tarea WAITING: "Confirmar si podemos participar en la RFP de Logista"
   - Email del cliente: "Aún no hemos lanzado la RFP, os tendremos en el radar"
   - ✅ Mover a DONE (la pregunta fue contestada, la espera terminó)
   - ✅ Crear NUEVA tarea WAITING: "Esperar a que Logista lance y envíe la RFP"

   ⚠️ REGLA PARA TAREAS TODO/IN_PROGRESS → DONE:
   Para estas SÍ necesitas evidencia clara de que la tarea se completó. Un email que HABLA sobre un tema NO significa que la tarea esté hecha.

   La razón debe ser ESPECÍFICA: "Email de María López confirma recepción del presupuesto" — NO "tarea completada".
7. Si no está vinculado a un seguimiento, sugiere un nombre para crear uno (seguimientoSugerido)

IMPORTANTE: La app NUNCA envía correos. Solo recibe y analiza. No sugieras enviar nada.

Responde en español. Sé preciso, concreto y útil.`,
  })

  // ─── STEP 1: Save extraction results ───
  await db.entradaContexto.update({
    where: { id: entradaId },
    data: {
      resumen: object.resumen,
      metadatos: {
        contextoDetectado: object.contextoDetectado,
        accionesExtraidas: object.accionesExtraidas,
        fechasClave: object.fechasClave,
        temas: object.temas,
        contactos: object.contactos,
        actualizacionesItems: object.actualizacionesItems,
        seguimientoSugerido: object.seguimientoSugerido,
        instruccionesUsuario: userInstructions || undefined,
      },
    },
  })

  // ─── STEP 2: Auto-create or link seguimiento (multi-factor scoring) ───
  let seguimientoId = entrada.seguimientoId

  if (!seguimientoId) {
    const activeSeguimientos = await db.seguimiento.findMany({
      where: {
        userId: entrada.userId,
        estado: { in: ['ACTIVO', 'EN_ESPERA', 'NECESITA_ATENCION'] },
      },
      include: {
        entradas: { select: { titulo: true, metadatos: true }, take: 10, orderBy: { createdAt: 'desc' } },
        contactos: { include: { contacto: { select: { nombre: true, email: true, empresa: true } } } },
      },
    })

    // Normalize helper
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // Data from the new entry
    const entryTopics = object.temas.map(t => norm(t))
    const entryContactNames = object.contactos.map(c => norm(c.nombre))
    const entryContactEmails = object.contactos.filter(c => c.email).map(c => norm(c.email!))
    const entrySubject = norm(entrada.titulo)
    // Strip Re:/FW:/Fwd: prefixes for subject comparison
    const cleanSubject = entrySubject.replace(/^(re|fw|fwd|rv)\s*:\s*/gi, '').trim()

    // Score each seguimiento
    let bestSeg: typeof activeSeguimientos[0] | null = null
    let bestScore = 0

    for (const seg of activeSeguimientos) {
      let score = 0

      // Factor 1: Title keyword match (3 pts per match)
      const segTitleWords = norm(seg.titulo).split(/\s+/).filter(w => w.length > 2)
      for (const topic of entryTopics) {
        if (segTitleWords.some(w => w.includes(topic) || topic.includes(w))) score += 3
      }

      // Factor 2: Subject similarity — email chains share subjects (5 pts)
      if (cleanSubject.length > 5) {
        for (const e of seg.entradas) {
          const eSubject = norm(e.titulo).replace(/^(re|fw|fwd|rv)\s*:\s*/gi, '').trim()
          if (eSubject.length > 5 && (cleanSubject.includes(eSubject) || eSubject.includes(cleanSubject))) {
            score += 5
            break
          }
        }
      }

      // Factor 3: Topic overlap with previous entries (2 pts per overlapping topic)
      for (const e of seg.entradas) {
        const meta = e.metadatos as { temas?: string[] } | null
        const segTopics = (meta?.temas ?? []).map((t: string) => norm(t))
        for (const topic of entryTopics) {
          if (segTopics.some(st => st.includes(topic) || topic.includes(st))) score += 2
        }
      }

      // Factor 4: Shared contacts — solo como apoyo, un contacto puede estar en muchos seguimientos
      let contactMatches = 0
      for (const cs of seg.contactos) {
        if (cs.contacto.email && entryContactEmails.includes(norm(cs.contacto.email))) contactMatches++
        else if (entryContactNames.includes(norm(cs.contacto.nombre))) contactMatches++
      }
      // Solo suma si hay al menos otro factor (temas o subject) — contactos solos no bastan
      if (contactMatches > 0 && score > 0) score += 1

      if (score > bestScore) {
        bestScore = score
        bestSeg = seg
      }
    }

    // Minimum threshold: need at least 4 points to match (e.g. subject match, or title+topic, or contact email)
    if (bestSeg && bestScore >= 4) {
      seguimientoId = bestSeg.id
    } else if (object.seguimientoSugerido) {
      // No match found — create new seguimiento
      const newSeg = await db.seguimiento.create({
        data: {
          titulo: object.seguimientoSugerido,
          descripcion: object.resumen,
          userId: entrada.userId,
          contexto: object.contextoDetectado,
          prioridad: object.accionesExtraidas.some(a => a.prioridad === 'URGENT') ? 'HIGH' : 'MEDIUM',
        },
      })
      seguimientoId = newSeg.id
    }

    if (seguimientoId && seguimientoId !== entrada.seguimientoId) {
      await db.entradaContexto.update({
        where: { id: entradaId },
        data: { seguimientoId },
      })
      await db.seguimiento.update({
        where: { id: seguimientoId },
        data: { ultimaActividad: new Date() },
      })
    }
  }

  // ─── STEP 3: Upsert contacts ───
  for (const contacto of object.contactos) {
    if (!contacto.nombre) continue
    try {
      // Normalizar nombre para búsqueda (quitar tildes, espacios extra)
      const nombreNorm = contacto.nombre.trim()

      // Buscar por email primero (más fiable que nombre)
      let existing = contacto.email
        ? await db.contacto.findFirst({
            where: {
              userId: entrada.userId,
              email: { equals: contacto.email, mode: 'insensitive' },
            },
          })
        : null

      // Si no encontró por email, buscar por nombre exacto
      if (!existing) {
        existing = await db.contacto.findFirst({
          where: {
            userId: entrada.userId,
            nombre: { equals: nombreNorm, mode: 'insensitive' },
          },
        })
      }

      // Si no encontró exacto, buscar por nombre parcial (primer nombre + apellido)
      if (!existing) {
        const parts = nombreNorm.split(/\s+/)
        if (parts.length >= 2) {
          const firstName = parts[0]
          const lastName = parts[parts.length - 1]
          existing = await db.contacto.findFirst({
            where: {
              userId: entrada.userId,
              nombre: { startsWith: firstName, mode: 'insensitive' as const },
              AND: [
                { nombre: { contains: lastName, mode: 'insensitive' as const } },
              ],
            },
          })
        }
      }

      // Último intento: buscar por teléfono
      if (!existing && contacto.telefono) {
        existing = await db.contacto.findFirst({
          where: {
            userId: entrada.userId,
            telefono: contacto.telefono,
          },
        })
      }

      let contactoId: string
      if (existing) {
        // Update: merge info — solo sobreescribe campos vacíos o actualiza con info nueva
        const updateData: Record<string, unknown> = {
          confianza: Math.min(100, existing.confianza + 10),
          fuentes: [...new Set([...existing.fuentes, entradaId])],
        }
        // Actualizar nombre si encontramos por email y el nombre nuevo es más completo
        if (contacto.nombre && (!existing.nombre || contacto.nombre.length > existing.nombre.length)) {
          updateData.nombre = contacto.nombre
        }
        // Siempre actualizar email/telefono si tenemos info nueva y el existente no la tiene
        if (contacto.email && !existing.email) updateData.email = contacto.email
        if (contacto.telefono && !existing.telefono) updateData.telefono = contacto.telefono
        // Si ya tiene email/telefono pero nos llega uno diferente, actualizar también
        if (contacto.email && existing.email && contacto.email.toLowerCase() !== existing.email.toLowerCase()) {
          updateData.email = contacto.email
        }
        if (contacto.telefono && existing.telefono && contacto.telefono !== existing.telefono) {
          updateData.telefono = contacto.telefono
        }
        if (contacto.empresa && !existing.empresa) updateData.empresa = contacto.empresa
        if (contacto.cargo && !existing.cargo) updateData.cargo = contacto.cargo

        await db.contacto.update({
          where: { id: existing.id },
          data: updateData,
        })
        contactoId = existing.id
      } else {
        const created = await db.contacto.create({
          data: {
            nombre: contacto.nombre,
            email: contacto.email || null,
            telefono: contacto.telefono || null,
            empresa: contacto.empresa || null,
            cargo: contacto.cargo || null,
            confianza: 50,
            fuentes: [entradaId],
            userId: entrada.userId,
          },
        })
        contactoId = created.id
      }

      // Link contact to seguimiento
      if (seguimientoId) {
        await db.contactoSeguimiento.upsert({
          where: { contactoId_seguimientoId: { contactoId, seguimientoId } },
          create: { contactoId, seguimientoId, rol: contacto.rol || null },
          update: { rol: contacto.rol || undefined },
        })
      }

      // Crear nota de intel si hay info relevante
      if (contacto.notaIntel) {
        await db.notaContacto.create({
          data: {
            contenido: contacto.notaIntel,
            autor: 'agente',
            entradaId,
            contactoId,
          },
        })
      }
    } catch (err) {
      console.error('[Contacto] Error upserting:', contacto.nombre, err)
    }
  }

  // ─── STEP 4: Update existing items based on new context ───
  const updatedItems: { id: string; titulo: string; oldEstado: string; newEstado: string; razon: string }[] = []
  for (const update of object.actualizacionesItems) {
    // Verify this item actually exists and belongs to the user
    const item = existingItems.find(i => i.id === update.itemId)
    if (!item || item.estado === update.nuevoEstado) continue

    try {
      // Fetch full item to get existing notes
      const fullItem = await db.item.findUnique({ where: { id: update.itemId }, select: { notasAgente: true } })
      const fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      const nuevaNota = `[${fecha}] ${item.estado} → ${update.nuevoEstado}: ${update.razon} (desde "${entrada.titulo}")`
      const notasAcumuladas = fullItem?.notasAgente
        ? `${fullItem.notasAgente}\n${nuevaNota}`
        : nuevaNota

      await db.item.update({
        where: { id: update.itemId },
        data: {
          estado: update.nuevoEstado as 'INBOX' | 'TODO' | 'IN_PROGRESS' | 'WAITING' | 'DONE' | 'ARCHIVED',
          modificadoPor: 'agente',
          notasAgente: notasAcumuladas,
        },
      })
      updatedItems.push({
        id: item.id,
        titulo: item.titulo,
        oldEstado: item.estado,
        newEstado: update.nuevoEstado,
        razon: update.razon,
      })
    } catch (err) {
      console.error('[Agent] Error updating item:', update.itemId, err)
    }
  }

  // ─── STEP 5: Auto-create Items from extracted actions ───
  const createdItems: string[] = []
  for (const accion of object.accionesExtraidas) {
    const item = await db.item.create({
      data: {
        titulo: accion.titulo,
        tipo: accion.tipo as 'TASK' | 'NOTE' | 'IDEA',
        estado: accion.estado as 'INBOX' | 'TODO' | 'IN_PROGRESS' | 'WAITING',
        prioridad: accion.prioridad as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        contexto: accion.contexto as 'TRABAJO' | 'PERSONAL' | 'AMBOS',
        eisenhowerUrgente: accion.eisenhowerUrgente,
        eisenhowerImportante: accion.eisenhowerImportante,
        fechaLimite: accion.fechaLimite ? new Date(accion.fechaLimite) : null,
        contenido: [accion.persona ? `Responsable: ${accion.persona}` : '', accion.notaContexto ?? ''].filter(Boolean).join('\n') || null,
        modificadoPor: 'agente',
        notasAgente: `Nexus: Creada desde "${entrada.titulo}"${accion.estado === 'WAITING' ? ' — esperando respuesta externa' : accion.estado === 'IN_PROGRESS' ? ' — ya en progreso' : ''}`,
        userId: entrada.userId,
      },
    })
    createdItems.push(item.id)

    // Link item to seguimiento if we have one
    if (seguimientoId) {
      await db.seguimientoItem.create({
        data: { seguimientoId, itemId: item.id },
      }).catch(() => {}) // ignore if already linked
    }
  }

  // ─── STEP 6: Auto-create reminders + calendar events from key dates ───
  const createdReminders: string[] = []
  const createdEvents: string[] = []
  for (const fecha of object.fechasClave) {
    const fechaDate = new Date(fecha.fecha)
    if (isNaN(fechaDate.getTime()) || fechaDate < new Date()) continue

    // Create calendar event
    try {
      const evt = await db.evento.create({
        data: {
          titulo: fecha.descripcion,
          fecha: fechaDate,
          todoElDia: true,
          contexto: object.contextoDetectado,
          origen: 'agente',
          seguimientoId,
          entradaId: entradaId,
          userId: entrada.userId,
        },
      })
      createdEvents.push(evt.id)
    } catch (err) {
      console.error('[Agent] Error creating event:', err)
    }

    // Create reminder 1 day before the date
    const reminderDate = new Date(fechaDate)
    reminderDate.setDate(reminderDate.getDate() - 1)
    reminderDate.setHours(9, 0, 0, 0)

    // Don't create if reminder would be in the past
    if (reminderDate < new Date()) {
      reminderDate.setTime(fechaDate.getTime())
      reminderDate.setHours(9, 0, 0, 0)
      if (reminderDate < new Date()) continue
    }

    const rec = await db.recordatorio.create({
      data: {
        mensaje: `${fecha.descripcion} (${fecha.fecha})`,
        regla: '',
        proximoDisparo: reminderDate,
        tipoRecurrencia: 'UNA_VEZ',
        seguimientoId,
        userId: entrada.userId,
      },
    })
    createdReminders.push(rec.id)
  }

  // ─── STEP 7: Build feed entry with what Nexus actually did ───
  const hasUrgent = object.accionesExtraidas.some(a => a.prioridad === 'URGENT' || a.prioridad === 'HIGH')

  const actionsReport: string[] = []
  if (seguimientoId && !entrada.seguimientoId) {
    actionsReport.push(`Seguimiento: "${object.seguimientoSugerido}"`)
  }
  if (createdItems.length > 0) {
    actionsReport.push(`${createdItems.length} tarea${createdItems.length > 1 ? 's' : ''} creada${createdItems.length > 1 ? 's' : ''}`)
  }
  if (updatedItems.length > 0) {
    actionsReport.push(`${updatedItems.length} tarea${updatedItems.length > 1 ? 's' : ''} actualizada${updatedItems.length > 1 ? 's' : ''}`)
  }
  if (createdReminders.length > 0) {
    actionsReport.push(`${createdReminders.length} recordatorio${createdReminders.length > 1 ? 's' : ''}`)
  }
  if (createdEvents.length > 0) {
    actionsReport.push(`${createdEvents.length} evento${createdEvents.length > 1 ? 's' : ''} en calendario`)
  }

  const feedTitle = actionsReport.length > 0
    ? `Nexus procesó "${entrada.titulo}" → ${actionsReport.join(' + ')}`
    : `Procesado: "${entrada.titulo}"`

  const updatedItemsDesc = updatedItems.map(u => `  → "${u.titulo}": ${u.oldEstado} → ${u.newEstado} (${u.razon})`).join('\n')

  const feedDesc = [
    object.resumen,
    userInstructions ? `\n💬 Pedro indicó: "${userInstructions}"` : '',
    updatedItems.length > 0 ? `\n🔄 Tareas actualizadas:\n${updatedItemsDesc}` : '',
    actionsReport.length > 0 ? `\n✅ Acciones automáticas: ${actionsReport.join(', ')}` : '',
  ].filter(Boolean).join('')

  await db.agenteFeed.create({
    data: {
      tipo: actionsReport.length > 0 ? 'accion' : 'sugerencia',
      titulo: feedTitle,
      descripcion: feedDesc,
      payload: {
        entradaId,
        acciones: object.accionesExtraidas,
        fechasClave: object.fechasClave,
        seguimientoCreado: !entrada.seguimientoId && seguimientoId ? seguimientoId : undefined,
        itemsCreados: createdItems,
        itemsActualizados: updatedItems,
        recordatoriosCreados: createdReminders,
        instruccionesUsuario: userInstructions || undefined,
      },
      estado: actionsReport.length > 0 ? 'aceptado' : 'pendiente',
      prioridad: hasUrgent ? 'high' : userInstructions ? 'medium' : 'low',
      seguimientoId,
      itemId: entrada.itemId,
    },
  })

  // ─── STEP 8: Extract memory (async, non-blocking) ───
  // Include user instructions so the memory extractor learns what Pedro said directly
  const memoryContent = userInstructions
    ? `PEDRO DIJO: "${userInstructions}"\n\n${entrada.contenido}`
    : entrada.contenido
  extractMemoryFromEntry(
    entradaId,
    object.resumen,
    memoryContent,
    object.temas,
    entrada.userId,
  ).catch(err => console.error('[Memory] Error extracting facts:', err))
}

export async function requestSeguimientoReview(seguimientoId: string) {
  const seg = await db.seguimiento.findUnique({
    where: { id: seguimientoId },
    include: {
      items: { include: { item: { select: { titulo: true, estado: true, prioridad: true, fechaLimite: true } } } },
      entradas: { orderBy: { createdAt: 'desc' }, take: 5, select: { titulo: true, resumen: true, tipo: true, createdAt: true } },
    },
  })
  if (!seg) return

  const itemsSummary = seg.items.map(si =>
    `- ${si.item.titulo} [${si.item.estado}] (${si.item.prioridad})${si.item.fechaLimite ? ` vence: ${si.item.fechaLimite.toISOString().split('T')[0]}` : ''}`
  ).join('\n')

  const contextSummary = seg.entradas.map(e =>
    `- [${e.tipo}] ${e.titulo}: ${e.resumen ?? '(sin procesar)'}`
  ).join('\n')

  return requestAgentAction({
    message: `Revisa el seguimiento "${seg.titulo}" (${seg.estado}, prioridad ${seg.prioridad}).

Items vinculados:
${itemsSummary || '(ninguno)'}

Contexto reciente:
${contextSummary || '(ninguno)'}

Última actividad: ${seg.ultimaActividad.toISOString().split('T')[0]}

Evalúa el estado general, identifica riesgos o bloqueos, y sugiere próximos pasos concretos.`,
    sessionKey: `hook:taskflow:seg-review:${seguimientoId}`,
    wakeMode: 'now',
  }, undefined, seg.userId)
}

// ─── Recordatorios: Parsing natural language ───

export async function parseReminderFromNaturalLanguage(input: string) {
  const { object } = await generateObject({
    model: llmModel,
    schema: z.object({
      mensaje: z.string(),
      proximoDisparo: z.string(),
      tipoRecurrencia: z.enum(['UNA_VEZ', 'DIARIO', 'CADA_N_DIAS', 'SEMANAL', 'PERSONALIZADO']),
      regla: z.string(),
    }),
    prompt: `Eres Nexus. Parsea esta instrucción de recordatorio y conviértela en datos estructurados.

Fecha/hora actual: ${new Date().toISOString()}

Instrucción del usuario: "${input}"

Genera:
- mensaje: el texto del recordatorio limpio y claro
- proximoDisparo: fecha ISO 8601 de cuándo disparar (si dice "mañana", calcula la fecha real)
- tipoRecurrencia: UNA_VEZ si es puntual, DIARIO si es diario, CADA_N_DIAS si dice "cada X días", SEMANAL si es semanal
- regla: para CADA_N_DIAS el número de días como string (ej: "3"), para otros puede ser vacío ""

Responde en español.`,
  })

  return object
}
