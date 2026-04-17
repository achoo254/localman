/**
 * Zustand store tracking Firebase auth state in memory.
 * Call subscribe() once on app mount to wire onAuthStateChanged.
 */

import { create } from 'zustand';
import { onAuthChange } from '../services/firebase-auth';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthStore {
  user: AuthUser | null;
  /** Start listening to Firebase auth state changes. Returns unsubscribe fn. */
  subscribe: () => () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,

  subscribe() {
    return onAuthChange((firebaseUser) => {
      if (!firebaseUser) {
        set({ user: null });
        return;
      }
      set({
        user: {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        },
      });
    });
  },
}));
