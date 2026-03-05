import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await db.project.findMany({
    where: { userId: authResult.userId },
    select: { id: true, nombre: true, color: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.nombre) return NextResponse.json({ error: 'nombre required' }, { status: 400 })

  const project = await db.project.create({
    data: {
      nombre: body.nombre,
      color: body.color ?? '#a78bfa',
      contexto: body.contexto ?? 'TRABAJO',
      userId: authResult.userId,
    },
    select: { id: true, nombre: true, color: true },
  })

  return NextResponse.json(project, { status: 201 })
}
