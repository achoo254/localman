/**
 * Centralized DB error handler. Shows user-friendly toasts for IndexedDB errors.
 * QuotaExceededError gets a specific message; other errors show generic context.
 * Rate-limits quota toasts to max 1 per 60s.
 */

import { toast } from '../components/common/toast-provider';

let lastQuotaToastAt = 0;
const QUOTA_TOAST_COOLDOWN_MS = 60_000;

export function isQuotaError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') return true;
  if (error && typeof error === 'object' && 'inner' in error) {
    return isQuotaError((error as { inner: unknown }).inner);
  }
  return false;
}

export function handleDbError(error: unknown, context: string): void {
  if (isQuotaError(error)) {
    const now = Date.now();
    if (now - lastQuotaToastAt < QUOTA_TOAST_COOLDOWN_MS) return;
    lastQuotaToastAt = now;
    toast('Storage almost full', {
      description: 'Clear request history in Settings to free space.',
      variant: 'error',
    });
    return;
  }
  // eslint-disable-next-line no-console
  console.error(`DB error in ${context}:`, error);
  toast(`Database error: ${context}`, { variant: 'error' });
}
