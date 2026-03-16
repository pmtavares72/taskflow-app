/**
 * ─── Memoria de Nexus ───
 *
 * Extrae y acumula conocimiento sobre la vida profesional Y personal del usuario
 * a partir de cada entrada procesada (emails, notas, reuniones, WhatsApps, etc.)
 *
 * La memoria se construye incrementalmente: cada nuevo hecho se compara
 * con la memoria existente. Si ya existe, se actualiza la confianza.
 * Si es nuevo, se crea. Si contradice algo existente, se marca.
 */

import { db } from './db'
import { llmModel, generateObject } from './ai'
import { z } from 'zod'
import type { CategoriaMemoria } from '@prisma/client'

// ─── Extraer hechos de una entrada procesada ───

const MemoryExtractionSchema = z.object({
  hechos: z.array(z.object({
    categoria: z.enum([
      'PERSONA', 'PROYECTO', 'PROCESO', 'PREFERENCIA',
      'ORGANIZACION', 'HECHO', 'TEMA',
      'FAMILIA', 'HOGAR', 'VIDA_PERSONAL',
    ]),
    clave: z.string().describe('Identificador único normalizado: nombre de persona, proyecto, proceso, etc.'),
    contenido: z.string().describe('El hecho o conocimiento en una frase clara'),
    esActualizacion: z.boolean().describe('true si actualiza/confirma algo que ya sabías'),
  })),
})

export async function extractMemoryFromEntry(
  entradaId: string,
  resumen: string,
  contenido: string,
  temas: string[],
  userId: string,
): Promise<void> {
  // Fetch existing memory for context (so the LLM knows what we already know)
  const existingMemory = await db.memoriaProfesional.findMany({
    where: { userId, activo: true },
    orderBy: { ultimaVez: 'desc' },
    take: 50,
    select: { categoria: true, clave: true, contenido: true },
  })

  const memoryContext = existingMemory.length > 0
    ? existingMemory.map(m => `[${m.categoria}] ${m.clave}: ${m.contenido}`).join('\n')
    : '(memoria vacía — es la primera vez)'

  const { object } = await generateObject({
    model: llmModel,
    schema: MemoryExtractionSchema,
    prompt: `Eres Nexus, el agente de memoria de Pedro Tavares. Gestionas TODA su vida: profesional Y personal.

Tu tarea: extraer HECHOS concretos del siguiente contenido procesado — sean de trabajo o de vida personal.

═══ LO QUE YA SABES (memoria actual) ═══
${memoryContext}

═══ NUEVO CONTENIDO A PROCESAR ═══
Resumen: ${resumen}
Temas: ${temas.join(', ')}

Contenido completo:
---
${contenido.slice(0, 3000)}
---

═══ INSTRUCCIONES ═══
Extrae hechos concretos, verificables y útiles. Ejemplos:

PROFESIONAL:
PERSONA: "María López" → "Product Manager en equipo Cloud. Email: mlopez@empresa.com. Reporta a Juan."
PROYECTO: "Migración Kubernetes" → "Migración de infraestructura a K8s. Deadline Q2 2026."
PROCESO: "Deploy a producción" → "Se hace los jueves. Requiere aprobación de QA + TL."
ORGANIZACION: "Equipo Cloud" → "6 personas. Manager: Juan García. Sprint de 2 semanas."
PREFERENCIA: "Reuniones" → "Pedro prefiere reuniones por la mañana, antes de las 12."
HECHO: "Decisión arquitectura API" → "Se decidió usar GraphQL en lugar de REST."
TEMA: "Kubernetes" → "Pedro está aprendiendo K8s. Nivel intermedio."

PERSONAL:
FAMILIA: "Hijos de Pedro" → "2 hijos: Martín (8 años, 3º primaria en Colegio X) y Sofía (5 años, infantil)."
FAMILIA: "Elena (pareja)" → "Trabaja en marketing. Se encarga de las extraescolares los miércoles."
HOGAR: "Colegio San José" → "Colegio de los hijos. Horario 9-16h. Grupo de WhatsApp de padres activo."
HOGAR: "Pediatra" → "Dra. García. Clínica San Rafael. Revisiones en septiembre."
VIDA_PERSONAL: "Pádel" → "Pedro juega pádel los martes y jueves. Club El Bosque."
VIDA_PERSONAL: "Vacaciones verano" → "Reservado casa en Algarve del 1-15 agosto 2026."

Reglas:
- Solo hechos CLAROS Y CONCRETOS. No suposiciones.
- La clave debe ser corta y normalizada (nombre propio, tema, lugar, etc.)
- Si un hecho ya existe en la memoria y esto lo confirma, marca esActualizacion=true
- Si contradice algo existente, marca esActualizacion=true y pon el nuevo contenido
- NO repitas lo que ya sabes si no hay info nueva
- Máximo 10 hechos por entrada
- Extrae TANTO hechos profesionales como personales si el contenido los tiene
- Responde en español`,
  })

  // Upsert each fact into the database
  for (const hecho of object.hechos) {
    const existing = await db.memoriaProfesional.findUnique({
      where: {
        userId_categoria_clave: {
          userId,
          categoria: hecho.categoria as CategoriaMemoria,
          clave: hecho.clave.toLowerCase(),
        },
      },
    })

    if (existing) {
      // Update: refresh content, bump confidence, add source
      await db.memoriaProfesional.update({
        where: { id: existing.id },
        data: {
          contenido: hecho.esActualizacion ? hecho.contenido : existing.contenido,
          confianza: Math.min(100, existing.confianza + 10),
          fuentes: [...new Set([...existing.fuentes, entradaId])],
          ultimaVez: new Date(),
        },
      })
    } else {
      // Create new memory fact
      await db.memoriaProfesional.create({
        data: {
          categoria: hecho.categoria as CategoriaMemoria,
          clave: hecho.clave.toLowerCase(),
          contenido: hecho.contenido,
          confianza: 50,
          fuentes: [entradaId],
          userId,
        },
      })
    }
  }
}

// ─── Recuperar memoria relevante para un contexto ───

// Categorías profesionales vs personales
const WORK_CATEGORIES: CategoriaMemoria[] = ['PERSONA', 'PROYECTO', 'PROCESO', 'ORGANIZACION', 'TEMA']
const PERSONAL_CATEGORIES: CategoriaMemoria[] = ['FAMILIA', 'HOGAR', 'VIDA_PERSONAL']
const SHARED_CATEGORIES: CategoriaMemoria[] = ['PREFERENCIA', 'HECHO']

export async function getRelevantMemory(
  userId: string,
  context: { temas?: string[]; personas?: string[]; texto?: string; contexto?: 'TRABAJO' | 'PERSONAL' | 'AMBOS' },
  limit = 15,
): Promise<string> {
  // 1. Determine which categories to fetch based on context
  let categories: CategoriaMemoria[]
  if (context.contexto === 'PERSONAL') {
    categories = [...PERSONAL_CATEGORIES, ...SHARED_CATEGORIES]
  } else if (context.contexto === 'TRABAJO') {
    categories = [...WORK_CATEGORIES, ...SHARED_CATEGORIES]
  } else {
    categories = [...WORK_CATEGORIES, ...PERSONAL_CATEGORIES, ...SHARED_CATEGORIES]
  }

  // 2. Extract meaningful keywords from the content (for SQL-level filtering)
  const keywords = [
    ...(context.temas ?? []),
    ...(context.personas ?? []),
  ].map(k => k.toLowerCase()).filter(k => k.length > 2)

  // Also extract significant words from the text (nouns/proper nouns, skip short words)
  if (context.texto) {
    const words = context.texto.toLowerCase()
      .split(/[\s,;:.!?¿¡()\[\]{}"""''—–\-/]+/)
      .filter(w => w.length > 3)
    // Deduplicate and take most likely keywords (longer words tend to be more specific)
    const unique = [...new Set(words)].sort((a, b) => b.length - a.length).slice(0, 8)
    keywords.push(...unique)
  }

  // 3. Two-level fetch: first keyword-matching memories (in SQL), then backfill by confidence
  let memories: Awaited<ReturnType<typeof db.memoriaProfesional.findMany>> = []

  if (keywords.length > 0) {
    // Level 1: Memories whose clave or contenido matches any keyword (SQL-level filtering)
    const keywordFilters = keywords.slice(0, 6).map(k => ({
      OR: [
        { clave: { contains: k, mode: 'insensitive' as const } },
        { contenido: { contains: k, mode: 'insensitive' as const } },
      ],
    }))

    memories = await db.memoriaProfesional.findMany({
      where: {
        userId, activo: true,
        categoria: { in: categories },
        OR: keywordFilters,
      },
      orderBy: [{ confianza: 'desc' }, { ultimaVez: 'desc' }],
      take: limit,
    })
  }

  // Level 2: If we didn't get enough, backfill with top-confidence memories from the right categories
  if (memories.length < limit) {
    const existingIds = new Set(memories.map(m => m.id))
    const backfill = await db.memoriaProfesional.findMany({
      where: {
        userId, activo: true,
        categoria: { in: categories },
        id: { notIn: [...existingIds] },
      },
      orderBy: [{ confianza: 'desc' }, { ultimaVez: 'desc' }],
      take: limit - memories.length,
    })
    memories = [...memories, ...backfill]
  }

  if (memories.length === 0) return ''

  // Group by category for cleaner presentation
  const grouped = new Map<string, typeof memories>()
  for (const m of memories) {
    const list = grouped.get(m.categoria) ?? []
    list.push(m)
    grouped.set(m.categoria, list)
  }

  const categoryLabels: Record<string, string> = {
    PERSONA: 'Personas',
    PROYECTO: 'Proyectos',
    PROCESO: 'Procesos',
    PREFERENCIA: 'Preferencias de Pedro',
    ORGANIZACION: 'Organización',
    HECHO: 'Hechos/Decisiones',
    TEMA: 'Temas/Conocimiento',
    FAMILIA: 'Familia/Entorno personal',
    HOGAR: 'Hogar/Gestiones personales',
    VIDA_PERSONAL: 'Vida personal',
  }

  const sections: string[] = []
  for (const [cat, items] of grouped) {
    const label = categoryLabels[cat] ?? cat
    const lines = items.map(m => `  • ${m.clave}: ${m.contenido}`)
    sections.push(`${label}:\n${lines.join('\n')}`)
  }

  return sections.join('\n\n')
}

// ─── Buscar en la memoria ───

export async function searchMemory(
  userId: string,
  query: string,
): Promise<Array<{ categoria: string; clave: string; contenido: string; confianza: number }>> {
  // Simple search: match against clave or contenido
  const results = await db.memoriaProfesional.findMany({
    where: {
      userId,
      activo: true,
      OR: [
        { clave: { contains: query.toLowerCase(), mode: 'insensitive' } },
        { contenido: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { confianza: 'desc' },
    take: 20,
    select: { categoria: true, clave: true, contenido: true, confianza: true },
  })

  return results
}
