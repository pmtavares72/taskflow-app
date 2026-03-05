import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { authenticateRequest } from '@/lib/api-auth'
import { db } from '@/lib/db'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads')
const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const file = formData.get('file') as File | null
  const itemId = formData.get('itemId') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 413 })

  // Verify item belongs to user
  if (itemId) {
    const item = await db.item.findFirst({ where: { id: itemId, userId: authResult.userId } })
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  await mkdir(UPLOAD_DIR, { recursive: true })

  const ext = file.name.split('.').pop() ?? 'bin'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const bytes = await file.arrayBuffer()
  await writeFile(join(UPLOAD_DIR, filename), Buffer.from(bytes))

  const url = `/uploads/${filename}`

  // Create Adjunto record if itemId provided
  let adjunto = null
  if (itemId) {
    adjunto = await db.adjunto.create({
      data: {
        nombre: file.name,
        url,
        tipo: file.type,
        tamanio: file.size,
        itemId,
      },
    })
  }

  return NextResponse.json({ url, filename, adjunto }, { status: 201 })
}
