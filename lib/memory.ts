/**
 * ─── Memoria Profesional de Nexus ───
 *
 * Extrae y acumula conocimiento sobre la vida profesional del usuario
 * a partir de cada entrada procesada (emails, notas, reuniones, etc.)
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
    prompt: `Eres Nexus, el agente de memoria profesional de Pedro Tavares.

Tu tarea: extraer HECHOS PROFESIONALES concretos del siguiente contenido procesado.

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
Extrae hechos concretos, verificables y útiles. Ejemplos de lo que buscas:

PERSONA: "María López" → "Product Manager en equipo Cloud. Email: mlopez@empresa.com. Reporta a Juan."
PROYECTO: "Migración Kubernetes" → "Migración de infraestructura a K8s. Deadline Q2 2026. Stakeholder: CTO."
PROCESO: "Deploy a producción" → "Se hace los jueves. Requiere aprobación de QA + TL."
ORGANIZACION: "Equipo Cloud" → "6 personas. Manager: Juan García. Sprint de 2 semanas."
PREFERENCIA: "Reuniones" → "Pedro prefiere reuniones por la mañana, antes de las 12."
HECHO: "Decisión arquitectura API" → "Se decidió usar GraphQL en lugar de REST para el nuevo servicio."
TEMA: "Kubernetes" → "Pedro está aprendiendo K8s para la migración. Nivel intermedio."

Reglas:
- Solo hechos CLAROS Y CONCRETOS. No suposiciones.
- La clave debe ser corta y normalizada (nombre propio, nombre de proyecto, etc.)
- Si un hecho ya existe en la memoria y esto lo confirma, marca esActualizacion=true
- Si contradice algo existente, marca esActualizacion=true y pon el nuevo contenido
- NO repitas lo que ya sabes si no hay info nueva
- Máximo 8 hechos por entrada
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

export async function getRelevantMemory(
  userId: string,
  context: { temas?: string[]; personas?: string[]; texto?: string },
  limit = 20,
): Promise<string> {
  // Get all active memories, prioritized by confidence and recency
  const memories = await db.memoriaProfesional.findMany({
    where: { userId, activo: true },
    orderBy: [{ confianza: 'desc' }, { ultimaVez: 'desc' }],
    take: limit,
  })

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
