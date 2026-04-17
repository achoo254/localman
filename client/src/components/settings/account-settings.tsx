/**
 * Account settings section: Google sign-in / sign-out via Firebase Auth.
 * Shows self-hosted message when Firebase env vars are not configured.
 */

import { useState } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { isFirebaseConfigured, signInWithGoogle, signOut } from '../../services/firebase-auth';
import { toast } from '../common/toast-provider';

export function AccountSettings() {
  const user = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(false);

  const firebaseConfigured = isFirebaseConfigured();

  async function handleSignIn() {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast('Signed in', { variant: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast('Sign-in failed', { description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setLoading(true);
    try {
      await signOut();
      toast('Signed out');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast('Sign-out failed', { description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold text-slate-200">Account</h2>

      {!firebaseConfigured && (
        <p className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-400">
          Firebase not configured (self-hosted mode). Set{' '}
          <code className="font-mono text-xs text-slate-300">VITE_FIREBASE_*</code> in{' '}
          <code className="font-mono text-xs text-slate-300">.env</code> to enable cloud sign-in.
        </p>
      )}

      {firebaseConfigured && !user && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-400">
            Sign in with Google to authenticate remote API calls via the proxy.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={handleSignIn}
            className="flex w-fit items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {loading ? 'Signing in…' : 'Sign in with Google'}
          </button>
        </div>
      )}

      {firebaseConfigured && user && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName ?? 'avatar'}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <User className="h-8 w-8 rounded-full bg-slate-600 p-1 text-slate-300" />
            )}
            <div className="flex flex-col">
              {user.displayName && (
                <span className="text-sm font-medium text-slate-200">{user.displayName}</span>
              )}
              <span className="text-xs text-slate-400">{user.email}</span>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleSignOut}
            className="flex w-fit items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {loading ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
