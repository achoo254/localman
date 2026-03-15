import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { env } from './env.js'

// Read service account from JSON file (avoids --env-file parsing issues with multiline JSON)
let serviceAccount
try {
  const filePath = resolve(env.FIREBASE_SERVICE_ACCOUNT_PATH)
  serviceAccount = JSON.parse(readFileSync(filePath, 'utf-8'))
} catch (e) {
  throw new Error(`Failed to read Firebase service account file: ${(e as Error).message}`)
}

const app = initializeApp({
  credential: cert(serviceAccount)
})

export const firebaseAuth = getAuth(app)
