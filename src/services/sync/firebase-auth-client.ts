/**
 * Firebase Auth client — Google sign-in via popup, token management.
 */

import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../../firebase-config'
import { getHttpClient } from '../../utils/tauri-http-client'
import { getApiBaseUrl } from '../../utils/api-base-url'

const googleProvider = new GoogleAuthProvider()

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

export async function firebaseSignOut(): Promise<void> {
  await signOut(auth)
}

export function getCurrentUser(): User | null {
  return auth.currentUser
}

export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

export function onAuthChanged(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}

/** Fetch workspaces using Firebase token */
export async function listWorkspaces(): Promise<Array<{ id: string; name: string; role: string }>> {
  const token = await getIdToken()
  if (!token) throw new Error('Not authenticated')
  const f = await getHttpClient()
  const res = await f(`${getApiBaseUrl()}/api/workspaces`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message || `Failed to list workspaces: ${res.status}`)
  }
  return res.json() as Promise<Array<{ id: string; name: string; role: string }>>
}
