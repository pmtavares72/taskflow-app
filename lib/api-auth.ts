import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export interface AuthResult {
  userId: string
  type: 'session' | 'api_key'
  permissions: string[]
}

export async function authenticateRequest(req: Request): Promise<AuthResult | null> {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const prefix = token.slice(0, 8)
    const apiKey = await db.apiKey.findFirst({
      where: { keyPrefix: prefix, expiresAt: { gt: new Date() } },
    })
    if (apiKey && (await bcrypt.compare(token, apiKey.key))) {
      await db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
      return { userId: apiKey.userId, type: 'api_key', permissions: apiKey.permissions }
    }
  }
  const session = await auth()
  if (session?.user?.id) {
    return { userId: session.user.id, type: 'session', permissions: ['read', 'write'] }
  }
  return null
}
