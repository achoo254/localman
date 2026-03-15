import { createMiddleware } from 'hono/factory'
import type { AppVariables, AuthUser } from '../types/context.js'
import { firebaseAuth } from '../firebase.js'
import { db } from '../db/client.js'
import { users } from '../db/user-schema.js'

/** Simple in-memory cache to avoid DB upsert on every request */
const userCache = new Map<string, { user: AuthUser; expiresAt: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/** Extracts Firebase user — does NOT block unauthenticated requests */
export const firebaseAuthMiddleware = createMiddleware<{
  Variables: AppVariables
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    c.set('user', null)
    c.set('session', null)
    return next()
  }
  try {
    const token = authHeader.slice(7)
    const decoded = await firebaseAuth.verifyIdToken(token)

    // Serve from cache if fresh
    const cached = userCache.get(decoded.uid)
    if (cached && cached.expiresAt > Date.now()) {
      c.set('user', cached.user)
      c.set('session', null)
      return next()
    }

    // Upsert user in PostgreSQL
    const [user] = await db.insert(users).values({
      firebaseUid: decoded.uid,
      email: decoded.email ?? '',
      name: decoded.name ?? decoded.email ?? '',
      avatarUrl: decoded.picture ?? null,
    }).onConflictDoUpdate({
      target: users.firebaseUid,
      set: {
        email: decoded.email ?? '',
        name: decoded.name ?? decoded.email ?? '',
        avatarUrl: decoded.picture ?? null,
        updatedAt: new Date(),
      }
    }).returning()

    const authUser = user as AuthUser
    userCache.set(decoded.uid, { user: authUser, expiresAt: Date.now() + CACHE_TTL })
    c.set('user', authUser)
    c.set('session', null)
  } catch {
    c.set('user', null)
    c.set('session', null)
  }
  return next()
})

/** Blocks unauthenticated requests with 401 */
export const requireAuth = createMiddleware<{
  Variables: AppVariables
}>(async (c, next) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  return next()
})
