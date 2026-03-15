/**
 * Debounced auto-save for request store (300ms).
 */

import { useEffect, useRef } from 'react';
import { useRequestStore } from '../stores/request-store';

const DEBOUNCE_MS = 300;

export function useAutoSave(): void {
  const saveRequest = useRequestStore(s => s.saveRequest);
  const isDirty = useRequestStore(s => s.isDirty);
  const activeTabId = useRequestStore(s => s.activeTabId);
  const openTabs = useRequestStore(s => s.openTabs);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDraft = openTabs.find(t => t.id === activeTabId)?.isDraft ?? false;

  useEffect(() => {
    if (!isDirty || isDraft) return; // Skip auto-save for drafts
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void saveRequest();
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isDirty, isDraft, saveRequest]);
}
