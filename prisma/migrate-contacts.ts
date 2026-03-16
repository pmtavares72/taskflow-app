/**
 * Script de migración: extrae contactos de entradas existentes
 * y de la memoria profesional, creando entidades Contacto estructuradas.
 *
 * Ejecutar: npx tsx --env-file=.env.local prisma/migrate-contacts.ts
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  console.log('=== Migración de contactos ===\n')

  // 1. Extraer contactos de MemoriaProfesional (categoría PERSONA)
  const memorias = await db.memoriaProfesional.findMany({
    where: { categoria: 'PERSONA', activo: true },
    select: { clave: true, contenido: true, userId: true, fuentes: true },
  })

  console.log(`Encontradas ${memorias.length} memorias de tipo PERSONA`)

  for (const mem of memorias) {
    const nombre = mem.clave.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

    // Intentar extraer email del contenido
    const emailMatch = mem.contenido.match(/[\w.-]+@[\w.-]+\.\w+/)
    const email = emailMatch ? emailMatch[0] : null

    // Intentar extraer empresa/cargo del contenido
    let empresa: string | null = null
    let cargo: string | null = null

    // Patrones comunes: "Product Manager en equipo Cloud", "de Logista", "en OpenText"
    const enMatch = mem.contenido.match(/(?:en|de|@)\s+([A-ZÁ-Ú][\wáéíóúñ]+(?:\s+[A-ZÁ-Ú][\wáéíóúñ]+)*)/i)
    if (enMatch) empresa = enMatch[1]

    const cargoMatch = mem.contenido.match(/([\w\s]+?)(?:\s+en\s+|\s+de\s+|\s+@\s+)/i)
    if (cargoMatch && cargoMatch[1].length < 50) cargo = cargoMatch[1].trim()

    try {
      await db.contacto.upsert({
        where: { userId_nombre_empresa: { userId: mem.userId, nombre, empresa: empresa ?? '' } },
        create: {
          nombre,
          email,
          empresa,
          cargo,
          notas: mem.contenido,
          confianza: 60, // viene de memoria, tiene algo de confianza
          fuentes: mem.fuentes,
          userId: mem.userId,
        },
        update: {
          notas: mem.contenido,
          email: email || undefined,
          empresa: empresa || undefined,
          cargo: cargo || undefined,
        },
      })
      console.log(`  ✓ ${nombre} (${empresa ?? 'sin empresa'})`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`  ✗ ${nombre}: ${msg}`)
    }
  }

  // 2. Extraer contactos de metadatos de entradas (campo contactos)
  const entradas = await db.entradaContexto.findMany({
    where: { metadatos: { not: undefined } },
    select: { id: true, userId: true, seguimientoId: true, metadatos: true },
  })

  console.log(`\nRevisando ${entradas.length} entradas con metadatos...`)

  let contactosCreados = 0
  let vinculosCreados = 0

  for (const entrada of entradas) {
    const meta = entrada.metadatos as Record<string, unknown> | null
    if (!meta) continue

    // Entradas nuevas ya tienen campo 'contactos' en metadatos
    const contactos = (meta.contactos ?? []) as Array<{
      nombre?: string; email?: string; telefono?: string
      empresa?: string; cargo?: string; rol?: string
    }>

    for (const c of contactos) {
      if (!c.nombre) continue

      try {
        const existing = await db.contacto.findFirst({
          where: { userId: entrada.userId, nombre: { equals: c.nombre, mode: 'insensitive' } },
        })

        let contactoId: string
        if (existing) {
          await db.contacto.update({
            where: { id: existing.id },
            data: {
              email: c.email || existing.email,
              telefono: c.telefono || existing.telefono,
              empresa: c.empresa || existing.empresa,
              cargo: c.cargo || existing.cargo,
              confianza: Math.min(100, existing.confianza + 10),
              fuentes: [...new Set([...existing.fuentes, entrada.id])],
            },
          })
          contactoId = existing.id
        } else {
          const created = await db.contacto.create({
            data: {
              nombre: c.nombre,
              email: c.email || null,
              telefono: c.telefono || null,
              empresa: c.empresa || null,
              cargo: c.cargo || null,
              confianza: 50,
              fuentes: [entrada.id],
              userId: entrada.userId,
            },
          })
          contactoId = created.id
          contactosCreados++
          console.log(`  ✓ Nuevo: ${c.nombre} (${c.empresa ?? 'sin empresa'})`)
        }

        // Vincular a seguimiento
        if (entrada.seguimientoId) {
          await db.contactoSeguimiento.upsert({
            where: { contactoId_seguimientoId: { contactoId, seguimientoId: entrada.seguimientoId } },
            create: { contactoId, seguimientoId: entrada.seguimientoId, rol: c.rol || null },
            update: {},
          })
          vinculosCreados++
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`  ✗ ${c.nombre}: ${msg}`)
      }
    }
  }

  console.log(`\n=== Resumen ===`)
  console.log(`Contactos de memoria: ${memorias.length}`)
  console.log(`Contactos nuevos de entradas: ${contactosCreados}`)
  console.log(`Vínculos seguimiento-contacto: ${vinculosCreados}`)

  // 3. Mostrar todos los contactos creados
  const total = await db.contacto.findMany({
    select: { nombre: true, email: true, empresa: true, cargo: true },
    orderBy: { nombre: 'asc' },
  })
  console.log(`\nTotal contactos en BD: ${total.length}`)
  for (const c of total) {
    console.log(`  - ${c.nombre} | ${c.empresa ?? '-'} | ${c.cargo ?? '-'} | ${c.email ?? '-'}`)
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
