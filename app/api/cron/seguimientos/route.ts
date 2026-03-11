import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requestSeguimientoReview } from '@/lib/agent'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

  // Find active seguimientos with no activity in 3+ days
  const stale = await db.seguimiento.findMany({
    where: {
      estado: 'ACTIVO',
      ultimaActividad: { lt: threeDaysAgo },
    },
    include: {
      items: { include: { item: { select: { titulo: true, estado: true } } } },
      _count: { select: { items: true, entradas: true } },
    },
  })

  let flagged = 0

  for (const seg of stale) {
    // Mark as needing attention
    await db.seguimiento.update({
      where: { id: seg.id },
      data: { estado: 'NECESITA_ATENCION' },
    })

    // Create feed entry
    await db.agenteFeed.create({
      data: {
        tipo: 'sugerencia',
        titulo: `Seguimiento estancado: ${seg.titulo}`,
        descripcion: `El seguimiento "${seg.titulo}" lleva ${Math.floor((Date.now() - seg.ultimaActividad.getTime()) / 86400000)} días sin actividad. Tiene ${seg._count.items} items y ${seg._count.entradas} entradas de contexto.`,
        payload: { seguimientoId: seg.id, accion: 'revisar' },
        estado: 'pendiente',
        prioridad: 'medium',
        seguimientoId: seg.id,
      },
    })

    // Ask Nexus for deeper review (non-blocking)
    requestSeguimientoReview(seg.id).catch(console.error)

    flagged++
  }

  return NextResponse.json({ flagged, checked: stale.length })
}
