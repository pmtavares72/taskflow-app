import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { ItemDetail } from '@/components/items/ItemDetail'
import type { ItemWithRelations } from '@/types'

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params

  const item = await db.item.findFirst({
    where: { id, userId: session.user.id },
    include: {
      proyecto: { select: { id: true, nombre: true, color: true } },
      adjuntos: true,
      actividad: { orderBy: { createdAt: 'desc' } },
      relaciones: { include: { destino: { select: { id: true, titulo: true, estado: true, tipo: true } } } },
      relacionesDe: { include: { origen: { select: { id: true, titulo: true, estado: true, tipo: true } } } },
    },
  })

  if (!item) notFound()

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <ItemDetail item={item as unknown as ItemWithRelations} />
    </div>
  )
}
