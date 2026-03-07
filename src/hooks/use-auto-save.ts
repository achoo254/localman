/**
 * Debounced auto-save for request store (300ms).
 */

import { useEffect, useRef } from 'react';
import { useRequestStore } from '../stores/request-store';

const DEBOUNCE_MS = 300;

export function useAutoSave(): void {
  const saveRequest = useRequestStore(s => s.saveRequest);
  const isDirty = useRequestStore(s => s.isDirty);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirty) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void saveRequest();
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isDirty, saveRequest]);
}
