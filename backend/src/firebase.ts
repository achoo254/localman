import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Init with service account JSON from env var
let serviceAccount
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)
} catch {
  throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not valid JSON')
}

const app = initializeApp({
  credential: cert(serviceAccount)
})

export const firebaseAuth = getAuth(app)
