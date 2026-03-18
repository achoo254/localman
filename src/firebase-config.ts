import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
}

let _app: FirebaseApp | null = null
let _auth: Auth | null = null

/** Lazy-initialize Firebase — only when cloud sync is actually used (Phase 2).
 *  Prevents crash when VITE_FIREBASE_* env vars are not set. */
function getFirebaseAuth(): Auth {
  if (!_auth) {
    if (!firebaseConfig.apiKey) {
      throw new Error('Firebase API key not configured — cloud sync unavailable')
    }
    _app = initializeApp(firebaseConfig)
    _auth = getAuth(_app)
  }
  return _auth
}

/** Exported as getter so imports don't trigger initialization at module load time */
export { getFirebaseAuth }

/** @deprecated Use getFirebaseAuth() instead — kept for backward compat */
export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    return Reflect.get(getFirebaseAuth(), prop)
  },
})
