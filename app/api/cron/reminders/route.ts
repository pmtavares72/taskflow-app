import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  const dueReminders = await db.recordatorio.findMany({
    where: { activo: true, proximoDisparo: { lte: now } },
    include: {
      seguimiento: { select: { id: true, titulo: true } },
      item: { select: { id: true, titulo: true } },
      user: { select: { id: true } },
    },
  })

  let processed = 0

  for (const rec of dueReminders) {
    // Create agent feed entry for this reminder
    await db.agenteFeed.create({
      data: {
        tipo: 'recordatorio',
        titulo: `Recordatorio: ${rec.mensaje}`,
        descripcion: rec.seguimiento
          ? `Recordatorio sobre el seguimiento "${rec.seguimiento.titulo}": ${rec.mensaje}`
          : rec.item
            ? `Recordatorio sobre item "${rec.item.titulo}": ${rec.mensaje}`
            : rec.mensaje,
        payload: {
          recordatorioId: rec.id,
          seguimientoId: rec.seguimientoId,
          itemId: rec.itemId,
        },
        estado: 'pendiente',
        prioridad: 'high',
        seguimientoId: rec.seguimientoId,
        itemId: rec.itemId,
      },
    })

    // Update next fire time or deactivate
    if (rec.tipoRecurrencia === 'UNA_VEZ') {
      await db.recordatorio.update({ where: { id: rec.id }, data: { activo: false } })
    } else {
      const next = computeNextFire(rec.tipoRecurrencia, rec.regla, now)
      await db.recordatorio.update({ where: { id: rec.id }, data: { proximoDisparo: next } })
    }

    processed++
  }

  return NextResponse.json({ processed, total: dueReminders.length })
}

function computeNextFire(tipo: string, regla: string, from: Date): Date {
  const next = new Date(from)
  switch (tipo) {
    case 'DIARIO':
      next.setDate(next.getDate() + 1)
      break
    case 'CADA_N_DIAS': {
      const days = parseInt(regla) || 3
      next.setDate(next.getDate() + days)
      break
    }
    case 'SEMANAL':
      next.setDate(next.getDate() + 7)
      break
    default:
      next.setDate(next.getDate() + 1)
  }
  return next
}
