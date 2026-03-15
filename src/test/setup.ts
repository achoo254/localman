import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: vi.fn() }));

// Mock Firebase — prevents initialization errors in test env (no VITE_FIREBASE_* vars)
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(() => vi.fn()),
  GoogleAuthProvider: vi.fn(),
}));

vi.mock('react-resizable-panels', () => ({
  Group: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'resizable-group' }, children),
  Panel: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'resizable-panel' }, children),
  Separator: () => React.createElement('div', { 'data-testid': 'resizable-separator' }),
}));
