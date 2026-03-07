/**
 * CodeMirror 6 JSON body editor.
 */

import { useEffect, useRef } from 'react';
import { EditorView } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';

interface BodyJsonEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function BodyJsonEditor({ value, onChange }: BodyJsonEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    const state = EditorState.create({
      doc: value || '{\n  \n}',
      extensions: [
        json(),
        oneDark,
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            const doc = update.state.doc.toString();
            onChangeRef.current(doc);
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
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === value) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value || '{\n  \n}' },
    });
  }, [value]);

  return <div ref={containerRef} className="min-h-[200px] rounded border border-[var(--color-bg-tertiary)]" />;
}
