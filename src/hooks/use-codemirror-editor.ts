/**
 * Shared CodeMirror 6 editor setup hook.
 * Handles editor lifecycle (create/destroy) and external value sync.
 */

import { useEffect, useRef } from 'react';
import { EditorView } from 'codemirror';
import { EditorState, Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';

interface UseCodemirrorEditorOptions {
  /** Initial document content */
  initialValue: string;
  /** Called whenever the document changes */
  onChange: (value: string) => void;
  /** Language/theme extensions to include alongside oneDark */
  extensions?: Extension[];
  /** Recreate editor when this value changes (e.g. language mode) */
  resetKey?: unknown;
}

/**
 * Mounts a CodeMirror 6 editor into `containerRef` and keeps it in sync
 * with the `value` prop passed from the parent.
 *
 * Returns `containerRef` to attach to the host div.
 */
export function useCodemirrorEditor(
  value: string,
  { onChange, extensions = [], resetKey }: Omit<UseCodemirrorEditorOptions, 'initialValue'>,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Keep latest onChange in a ref so the listener closure never goes stale
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Create/destroy editor when resetKey changes (e.g. language switch)
  useEffect(() => {
    if (!containerRef.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        ...extensions,
        oneDark,
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // extensions identity is caller's responsibility; resetKey drives re-mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Sync external value changes without recreating the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }, [value]);

  return containerRef;
}
