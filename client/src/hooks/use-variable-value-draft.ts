/**
 * Shared draft+commit logic for inline variable value editing.
 * Used by chip popover (Case B) and variables panel (Case C) rows.
 *
 * Handles:
 * - 300ms debounced write + immediate blur commit
 * - IME composition guard (Vietnamese/CJK) — [RED TEAM M15]
 * - Active-env snapshot at mount; drops write if env switched — [RED TEAM C4]
 * - Secret reveal via on-demand resolver — [RED TEAM C2]
 * - Cleanup pending timer on unmount
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEnvironmentStore, type VariableSource } from '../stores/environment-store';

const DEBOUNCE_MS = 300;

type EditableSource = Extract<VariableSource, { kind: 'environment' } | { kind: 'global' }>;

interface UseVariableValueDraftArgs {
  varName: string;
  source: EditableSource;
  initialValue: string | null;
}

export function useVariableValueDraft({
  varName,
  source,
  initialValue,
}: UseVariableValueDraftArgs) {
  const writeVariableValue = useEnvironmentStore(s => s.writeVariableValue);
  const resolveVariableSource = useEnvironmentStore(s => s.resolveVariableSource);
  const getActiveEnvironment = useEnvironmentStore(s => s.getActiveEnvironment);

  const [revealed, setRevealed] = useState(!source.secret);
  const [draft, setDraft] = useState<string>(source.secret ? '' : initialValue ?? '');
  const isComposing = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Snapshot target at mount so env-switch mid-edit doesn't corrupt other env.
  const targetRef = useRef(
    source.kind === 'environment'
      ? { kind: 'environment' as const, envId: source.envId, variableId: source.variableId }
      : { kind: 'global' as const, variableId: source.variableId }
  );

  const commit = useCallback(
    (next: string) => {
      if (isComposing.current) return;
      const snapshot = targetRef.current;
      if (snapshot.kind === 'environment') {
        const active = getActiveEnvironment();
        if (!active || active.id !== snapshot.envId) return;
      }
      void writeVariableValue(snapshot, next);
    },
    [writeVariableValue, getActiveEnvironment]
  );

  const scheduleCommit = useCallback(
    (next: string) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => commit(next), DEBOUNCE_MS);
    },
    [commit]
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (source.secret && !revealed) return;
      setDraft(e.target.value);
      scheduleCommit(e.target.value);
    },
    [source.secret, revealed, scheduleCommit]
  );

  const onBlur = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    commit(draft);
  }, [commit, draft]);

  const onCompositionStart = useCallback(() => {
    isComposing.current = true;
  }, []);

  const onCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      isComposing.current = false;
      const value = (e.target as HTMLInputElement).value;
      setDraft(value);
      scheduleCommit(value);
    },
    [scheduleCommit]
  );

  const toggleReveal = useCallback(() => {
    const next = !revealed;
    setRevealed(next);
    if (next) {
      const fresh = resolveVariableSource(varName, { reveal: true });
      setDraft(fresh.value ?? '');
    } else {
      setDraft('');
    }
  }, [revealed, resolveVariableSource, varName]);

  const readOnly = source.secret && !revealed;

  return {
    draft,
    revealed,
    readOnly,
    onChange,
    onBlur,
    onCompositionStart,
    onCompositionEnd,
    toggleReveal,
  };
}
