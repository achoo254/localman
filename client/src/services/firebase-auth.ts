/**
 * Firebase JS SDK auth helpers.
 * All functions are no-ops / return null when Firebase is not configured
 * (i.e. VITE_FIREBASE_API_KEY is absent) — supports self-hosted mode.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

let app: FirebaseApp | null = null;

/** Initialise Firebase app lazily from VITE_FIREBASE_* env vars. Returns null if unconfigured. */
function ensureApp(): FirebaseApp | null {
  if (app) return app;
  const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  };
  if (!cfg.apiKey || !cfg.projectId) return null;
  app = getApps()[0] ?? initializeApp(cfg);
  return app;
}

/** Returns true when VITE_FIREBASE_* env vars are set. */
export function isFirebaseConfigured(): boolean {
  return ensureApp() !== null;
}

/** Opens Google sign-in popup. Throws if Firebase is not configured. */
export async function signInWithGoogle(): Promise<User | null> {
  const a = ensureApp();
  if (!a) throw new Error('Firebase not configured');
  const result = await signInWithPopup(getAuth(a), new GoogleAuthProvider());
  return result.user;
}

/** Signs out the current user. No-op if Firebase is not configured. */
export async function signOut(): Promise<void> {
  const a = ensureApp();
  if (!a) return;
  await fbSignOut(getAuth(a));
}

/**
 * Returns the current user's Firebase ID token, or null if signed out / unconfigured.
 * The SDK handles silent refresh automatically.
 */
export async function getCurrentIdToken(): Promise<string | null> {
  const a = ensureApp();
  if (!a) return null;
  const u = getAuth(a).currentUser;
  return u ? await u.getIdToken() : null;
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 * Calls cb(null) immediately when Firebase is not configured.
 */
export function onAuthChange(cb: (u: User | null) => void): () => void {
  const a = ensureApp();
  if (!a) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(getAuth(a), cb);
}
